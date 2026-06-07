/**
 * The reusable photo control (M10) — the native port of the web `image-upload.tsx`.
 * One component serves both surfaces: the profile **avatar** (`shape="square"`,
 * circular) and **observation** photos (`shape="rectangle"`, 4:3; consumed by the
 * M12 create/edit form). Tapping the frame opens a source chooser (camera or
 * library) in a `PickerSheet`; the pick is downscaled + JPEG-encoded
 * (`@/lib/image`), uploaded to the shared bucket via a signed URL
 * (`@/lib/query/storage`), and the resulting storage **path** is reported through
 * `onChange`. The parent persists that path (the avatar saves with the profile
 * form; M12 saves it with the observation).
 *
 * `headless` mode renders no inline preview — only the chooser sheet (+ error /
 * camera-blocked notices). Pair it with an imperative `ref.open()` to drive the
 * picker from elsewhere (e.g. a tappable avatar in the native header on Profil).
 *
 * Display priority: the just-picked local file (instant) → a signed URL minted
 * from `value` (or the `previewUrl` seed the parent already has, e.g.
 * `profile.avatarUrl`).
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';

import { CAMERA, Icon, IMAGE } from '@/components/icon';
import { PickerSheet } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Duration } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import {
  ensureCameraPermission,
  ImageTooLargeError,
  pickFromLibrary,
  processImage,
  readBytes,
  takePhoto,
  type ImageShape,
  type RawAsset,
} from '@/lib/image';
import { createUploadUrl, deleteUpload, signedUrlFor, uploadSignedImage } from '@/lib/query/storage';

const SQUARE_SIZE = 96;

type Busy = 'idle' | 'compressing' | 'uploading' | 'removing';

/** Imperative handle for `headless` use — open the source chooser from outside. */
export type ImageUploadHandle = { open: () => void };

export type ImageUploadProps = {
  /** The stored object path, or null when empty. */
  value: string | null;
  /** Reports the new path after an upload, or null after a remove. */
  onChange: (path: string | null) => void;
  purpose: 'observation' | 'avatar';
  /** Observation draft id (M12 supplies a stable one; generated here otherwise). */
  draftId?: string;
  shape?: ImageShape;
  /** A signed URL the parent already holds (e.g. `profile.avatarUrl`) — avoids re-minting. */
  previewUrl?: string | null;
  invalid?: boolean;
  disabled?: boolean;
  /** Render only the chooser sheet (no inline preview/links). Drive via `ref.open()`. */
  headless?: boolean;
};

export const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(function ImageUpload(
  {
    value,
    onChange,
    purpose,
    draftId: propDraftId,
    shape = 'rectangle',
    previewUrl,
    invalid,
    disabled,
    headless = false,
  },
  ref,
) {
  const theme = useTheme();
  const { reduced } = useMotion();
  const isSquare = shape === 'square';

  const draftId = useMemo(() => propDraftId ?? Crypto.randomUUID(), [propDraftId]);

  const [busy, setBusy] = useState<Busy>('idle');
  const [localUri, setLocalUri] = useState<string | null>(null);
  // Signed display URL paired with the path it belongs to, so a stale URL never
  // shows once the value changes (e.g. after a remove). Seeded from the parent's
  // `previewUrl` to avoid a first-load flash; refreshed by the effect below.
  const [minted, setMinted] = useState<{ path: string; url: string | null } | null>(
    value && previewUrl ? { path: value, url: previewUrl } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  // Mint a fresh signed URL for the current value. setState lives only in the async
  // callback — never synchronously in the effect body (cascading-render rule).
  useEffect(() => {
    if (!value) return;
    let alive = true;
    void signedUrlFor(value).then((url) => {
      if (alive) setMinted({ path: value, url });
    });
    return () => {
      alive = false;
    };
  }, [value]);

  const remoteUrl = minted && minted.path === value ? minted.url : null;
  const previewSource = localUri ?? remoteUrl;
  const hasImage = !!previewSource;
  const locked = disabled || busy !== 'idle';

  function openChooser() {
    if (locked) return;
    setError(null);
    setChooserOpen(true);
  }

  // Let a parent (e.g. the header avatar on Profil) open the chooser without
  // rendering this component's own preview.
  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        if (disabled || busy !== 'idle') return;
        setError(null);
        setChooserOpen(true);
      },
    }),
    [disabled, busy],
  );

  async function runPick(source: 'camera' | 'library') {
    setChooserOpen(false);
    setError(null);

    // iOS: the chooser is a JS `Modal`; presenting the system camera/photo picker
    // while that sheet is still sliding away silently fails (UIKit refuses to
    // present over an in-flight dismissal). Wait out the sheet's dismiss animation
    // before launching, so "Välj från galleri" reliably opens the picker.
    if (Platform.OS === 'ios') await new Promise((resolve) => setTimeout(resolve, 350));

    let asset: RawAsset | null = null;
    try {
      if (source === 'camera') {
        const perm = await ensureCameraPermission();
        if (!perm.granted) {
          setCameraBlocked(!perm.canAskAgain);
          return;
        }
        setCameraBlocked(false);
        asset = await takePhoto(shape);
      } else {
        asset = await pickFromLibrary(shape);
      }
    } catch {
      setError(sv.image.uploadFailed);
      return;
    }
    if (!asset) return; // cancelled

    setLocalUri(asset.uri); // instant raw preview
    try {
      setBusy('compressing');
      const picked = await processImage(asset, shape);
      setLocalUri(picked.uri); // processed preview
      setBusy('uploading');
      const target = await createUploadUrl({
        purpose,
        mimeType: picked.mimeType,
        sizeBytes: picked.sizeBytes,
        draftId: purpose === 'observation' ? draftId : undefined,
      });
      const bytes = await readBytes(picked.uri);
      await uploadSignedImage(target, bytes, picked.mimeType);
      onChange(target.path);
      hapticSuccess();
    } catch (e) {
      setLocalUri(null);
      hapticError();
      setError(e instanceof ImageTooLargeError ? sv.image.tooLarge : sv.image.uploadFailed);
    } finally {
      setBusy('idle');
    }
  }

  async function onRemove() {
    if (locked) return;
    setError(null);
    setBusy('removing');
    try {
      if (value) await deleteUpload(value);
      onChange(null);
      setLocalUri(null);
      setMinted(null);
    } catch {
      hapticError();
      setError(sv.image.removeFailed);
    } finally {
      setBusy('idle');
    }
  }

  const busyLabel =
    busy === 'compressing' ? sv.image.compressing : busy === 'uploading' ? sv.image.uploading : null;

  const preview = (
    <PressableScale
      variant="card"
      onPress={openChooser}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={hasImage ? sv.image.replace : sv.image.add}
      style={[
        isSquare ? styles.squarePreview : styles.rectPreview,
        {
          backgroundColor: theme.muted,
          borderColor: invalid ? theme.destructive : theme.border,
          borderWidth: invalid ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {previewSource ? (
        <Image
          source={{ uri: previewSource }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={reduced ? 0 : Duration.quick}
        />
      ) : (
        <View style={styles.placeholder}>
          <Icon name={IMAGE} size={isSquare ? 26 : 32} color={theme.mutedForeground} />
          {!isSquare ? (
            <ThemedText type="smallBold" themeColor="mutedForeground">
              {sv.image.add}
            </ThemedText>
          ) : null}
        </View>
      )}
      {busy !== 'idle' ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.tint} />
          {busyLabel ? (
            <ThemedText type="small" themeColor="foreground">
              {busyLabel}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </PressableScale>
  );

  const replaceLink = (
    <PressableScale variant="link" onPress={openChooser} disabled={locked} accessibilityRole="button">
      <ThemedText type="smallBold" themeColor="tint">
        {sv.image.replace}
      </ThemedText>
    </PressableScale>
  );
  const removeLink = (
    <PressableScale
      variant="link"
      haptic="commit"
      onPress={() => void onRemove()}
      disabled={locked}
      accessibilityRole="button"
    >
      <ThemedText type="smallBold" themeColor="destructive">
        {sv.image.remove}
      </ThemedText>
    </PressableScale>
  );
  const addLink = (
    <PressableScale variant="link" onPress={openChooser} disabled={locked} accessibilityRole="button">
      <ThemedText type="smallBold" themeColor="tint">
        {sv.image.add}
      </ThemedText>
    </PressableScale>
  );

  // Shared chrome — reused by both the inline and headless renders.
  const blockedBlock = cameraBlocked ? (
    <View style={[styles.blocked, { backgroundColor: theme.muted }]}>
      <Icon name={CAMERA} size={18} color={theme.mutedForeground} />
      <View style={styles.blockedBody}>
        <ThemedText type="small" themeColor="mutedForeground">
          {sv.image.permissionBlocked}
        </ThemedText>
        <PressableScale
          variant="link"
          onPress={() => void Linking.openSettings()}
          accessibilityRole="button"
        >
          <ThemedText type="smallBold" themeColor="tint">
            {sv.image.openSettings}
          </ThemedText>
        </PressableScale>
      </View>
    </View>
  ) : null;

  const errorBlock = error ? (
    <ThemedText type="small" themeColor="destructive">
      {error}
    </ThemedText>
  ) : null;

  const chooser = (
    <PickerSheet visible={chooserOpen} title={sv.image.chooseSource} onClose={() => setChooserOpen(false)}>
      <View style={styles.sheetBody}>
        <PressableScale
          variant="row"
          haptic="select"
          onPress={() => void runPick('camera')}
          style={[styles.sheetRow, { borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={sv.image.takePhoto}
        >
          <Icon name={CAMERA} size={22} color={theme.foreground} />
          <ThemedText type="default">{sv.image.takePhoto}</ThemedText>
        </PressableScale>
        <PressableScale
          variant="row"
          haptic="select"
          onPress={() => void runPick('library')}
          style={[styles.sheetRow, { borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={sv.image.chooseFromLibrary}
        >
          <Icon name={IMAGE} size={22} color={theme.foreground} />
          <ThemedText type="default">{sv.image.chooseFromLibrary}</ThemedText>
        </PressableScale>
      </View>
    </PickerSheet>
  );

  if (headless) {
    return (
      <>
        {blockedBlock}
        {errorBlock}
        {chooser}
      </>
    );
  }

  return (
    <View style={styles.container}>
      {isSquare ? (
        <View style={styles.squareRow}>
          {preview}
          <View style={styles.squareActions}>
            <ThemedText type="smallBold" themeColor="mutedForeground">
              {sv.profile.avatarLabel}
            </ThemedText>
            {hasImage ? (
              <>
                {replaceLink}
                {removeLink}
              </>
            ) : (
              addLink
            )}
          </View>
        </View>
      ) : (
        <>
          {preview}
          {hasImage ? (
            <View style={styles.actions}>
              {replaceLink}
              {removeLink}
            </View>
          ) : null}
        </>
      )}

      {blockedBlock}
      {errorBlock}
      {chooser}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  squareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  squareActions: { flex: 1, gap: Spacing.one, alignItems: 'flex-start' },
  squarePreview: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: SQUARE_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rectPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: SurfaceRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { alignItems: 'center', gap: Spacing.one },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  actions: { flexDirection: 'row', gap: Spacing.four },
  blocked: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: SurfaceRadius.md,
  },
  blockedBody: { flex: 1, gap: Spacing.one, alignItems: 'flex-start' },
  sheetBody: { gap: Spacing.two, paddingTop: Spacing.one },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SurfaceRadius.md,
    minHeight: 56,
  },
});
