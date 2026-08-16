import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SIGN_OUT, TRASH, type IconName } from '@/components/icon';
import { headerRightAction } from '@/components/header-button';
import { ImageUpload, type ImageUploadHandle } from '@/components/image-upload';
import { LocationPermissionSection } from '@/components/location-permission-section';
import { NotificationPermissionSection } from '@/components/notification-permission-section';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsFormInput } from '@/components/settings/settings-form-input';
import { SettingsGroup } from '@/components/settings/settings-group';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsStaticRow } from '@/components/settings/settings-static-row';
import { ThemePicker } from '@/components/theme-picker';
import { showToast } from '@/components/toast';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/constants/legal';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { versionLabel } from '@/lib/app-version';
import { useBlockedUsers } from '@/lib/blocks';
import { confirm } from '@/lib/confirm';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query/keys';
import { myProfileQueryOptions, upsertMyProfile } from '@/lib/query/profile';
import { deleteUpload } from '@/lib/query/storage';
import { displayNameSchema, phoneSchema } from '@/lib/validation/profile';

const ADMIN_BADGE: IconName = { sf: 'checkmark.shield.fill', material: 'verified-user' };

type Persisted = { displayName: string; phone: string | null; avatarPath: string | null };

// Profil — the user's own profile + settings in the app's grouped-settings grammar
// (bordered SettingsGroup cards of rows). The **avatar lives in the native header**
// (top-right) and opens the source chooser on tap — driven via the headless
// `ImageUpload` host mounted below. Name / phone / avatar **autosave** on commit
// (field blur or avatar pick); there is no Save button. Email is a read-only row;
// appearance, the device-permission rows (M8 location · M14 push), and sign-out
// round it out. The tab nests a native Stack (`profile/_layout.tsx`).
export default function ProfileScreen() {
  const { signOut, deleteAccount, user } = useAuth();
  const userId = user?.id ?? '';
  const { data: profile } = useQuery({
    ...myProfileQueryOptions(userId),
    enabled: !!user,
  });
  const uploadRef = useRef<ImageUploadHandle>(null);
  const [deleting, setDeleting] = useState(false);
  // Only surface the block-management row once a block exists — no clutter for the
  // (typical) member who never needs it.
  const hasBlocked = useBlockedUsers().size > 0;

  const [name, setName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarPath, setAvatarPath] = useState(profile?.avatarPath ?? null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // The last values known to be persisted. Each autosave sends the changed field
  // plus this snapshot for its siblings — so committing one field never writes a
  // half-edited (or invalid) value from another, and concurrent saves can't
  // clobber an in-progress edit. Seeded from the cache-warm profile (the root
  // gate only mounts `(tabs)` once `hasProfile` is true).
  const [saved, setSaved] = useState<Persisted>({
    displayName: profile?.displayName ?? '',
    phone: profile?.phone ?? null,
    avatarPath: profile?.avatarPath ?? null,
  });
  // The mutation scope below serializes autosaves. Read the latest committed
  // snapshot at execution time so a queued phone/avatar patch includes a name
  // that finished saving just before it, rather than stale render-time siblings.
  const savedRef = useRef(saved);

  type ProfilePatch = Partial<Persisted>;

  const mutation = useMutation({
    scope: { id: 'profile-autosave' },
    mutationFn: async (patch: ProfilePatch) => {
      const previous = savedRef.current;
      const input = { ...previous, ...patch };
      const result = await upsertMyProfile(input);
      const persisted: Persisted = {
        displayName: result.displayName,
        phone: result.phone ?? null,
        avatarPath: result.avatarPath,
      };
      savedRef.current = persisted;
      return {
        result,
        persisted,
        previousAvatarPath: previous.avatarPath,
        avatarChanged:
          Object.prototype.hasOwnProperty.call(patch, 'avatarPath') &&
          input.avatarPath !== previous.avatarPath,
      };
    },
    onSuccess: ({ result, persisted, previousAvatarPath, avatarChanged }) => {
      // Seed the shared profile query so the gate / header avatar / other readers
      // see the update without a refetch, and advance the persisted snapshot. The
      // editable fields are intentionally NOT overwritten here — they already hold
      // the user's input, and rewriting them would clobber a parallel edit.
      queryClient.setQueryData(queryKeys.profile(userId), result);
      // The old avatar object is deleted only now, once the save has committed —
      // deleting it at tap time would break the profile row if the save failed.
      if (avatarChanged && previousAvatarPath && previousAvatarPath !== persisted.avatarPath) {
        void deleteUpload(previousAvatarPath).catch(() => {});
      }
      setSaved(persisted);
      hapticSuccess();
      showToast(sv.profile.saved, 'success');
      // The feed embeds the observer's display name — refresh it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
    onError: (_error, patch) => {
      // An avatar upload precedes the profile write. If that write fails, return
      // the editor to the last committed path instead of presenting an unsaved
      // local value as though it were durable.
      if (Object.prototype.hasOwnProperty.call(patch, 'avatarPath')) {
        setAvatarPath(savedRef.current.avatarPath);
      }
      hapticError();
      showToast(sv.profile.saveFailed, 'error');
    },
  });

  function commitName() {
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      hapticError();
      setNameError(parsed.error.issues[0]?.message ?? sv.profile.saveFailed);
      return;
    }
    setNameError(null);
    if (parsed.data !== saved.displayName) {
      mutation.mutate({ displayName: parsed.data });
    }
  }

  function commitPhone() {
    const trimmed = phone.trim();
    let next: string | null = null;
    if (trimmed.length > 0) {
      const parsed = phoneSchema.safeParse(trimmed);
      if (!parsed.success) {
        hapticError();
        setPhoneError(parsed.error.issues[0]?.message ?? sv.profile.phoneInvalid);
        return;
      }
      next = parsed.data;
    }
    setPhoneError(null);
    if (next !== saved.phone) {
      mutation.mutate({ phone: next });
    }
  }

  function onChangeAvatar(path: string | null) {
    setAvatarPath(path);
    if (path !== saved.avatarPath) {
      mutation.mutate({ avatarPath: path });
    }
  }

  async function confirmSignOut() {
    const ok = await confirm({
      title: sv.profile.signOutConfirmTitle,
      message: sv.profile.signOutConfirmMessage,
      confirmLabel: sv.profile.signOut,
      destructive: true,
    });
    if (ok) void signOut();
  }

  // Permanent account deletion (Apple 5.1.1(v) / Google). Irreversible, so it's
  // gated behind an explicit destructive confirm; on success the session clears
  // and the root gate routes back to sign-in (this screen unmounts).
  async function confirmDeleteAccount() {
    const ok = await confirm({
      title: sv.profile.deleteAccount.confirmTitle,
      message: sv.profile.deleteAccount.confirmMessage,
      confirmLabel: sv.profile.deleteAccount.confirm,
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    void deleteAccount().then((res) => {
      if (res.error) {
        setDeleting(false);
        hapticError();
        showToast(res.error, 'error');
      }
      // On success the screen unmounts with the session — no cleanup.
    });
  }

  function openLegal(url: string) {
    void Linking.openURL(url);
  }

  return (
    <Screen keyboardAware keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          // The avatar is its own circular graphic, so iOS 26's glass capsule
          // would ring it with a second circle — same reason as the feed's
          // actions. See `headerRightAction`.
          ...headerRightAction(() => (
            <PressableScale
              variant="icon"
              onPress={() => uploadRef.current?.open()}
              accessibilityRole="button"
              accessibilityLabel={sv.profile.avatarLabel}
            >
              <Avatar name={name || saved.displayName} uri={profile?.avatarUrl ?? null} size="md" />
            </PressableScale>
          )),
        }}
      />

      {/* Headless host: owns the source chooser + upload pipeline for the header
          avatar (no inline preview). Renders only the chooser sheet (and any
          error / camera-blocked notice). */}
      <ImageUpload
        ref={uploadRef}
        headless
        value={avatarPath}
        previewUrl={profile?.avatarUrl ?? null}
        onChange={onChangeAvatar}
        purpose="avatar"
        shape="square"
        // The persisted avatar is deleted by the autosave's onSuccess (above),
        // never at tap time — a failed save must not orphan the profile row.
        preservePath={saved.avatarPath}
      />

      <SettingsGroup title={sv.profile.detailsSection} footer={sv.profile.phoneHelp}>
        <SettingsFormInput
          label={sv.profile.nameLabel}
          value={name}
          onChangeText={(next) => {
            setName(next);
            setNameError(null);
          }}
          onEndEditing={commitName}
          error={nameError}
          placeholder={sv.profile.namePlaceholder}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={60}
          returnKeyType="done"
        />
        <SettingsFormInput
          label={sv.profile.phoneLabel}
          value={phone}
          onChangeText={(next) => {
            setPhone(next);
            setPhoneError(null);
          }}
          onEndEditing={commitPhone}
          error={phoneError}
          placeholder={sv.profile.phonePlaceholder}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={30}
          returnKeyType="done"
        />
        <SettingsStaticRow label={sv.profile.emailLabel} value={user?.email ?? '—'} />
      </SettingsGroup>

      <ThemePicker />

      <SettingsGroup title={sv.profile.deviceSection} footer={sv.profile.deviceFooter}>
        <NotificationPermissionSection />
        <LocationPermissionSection />
      </SettingsGroup>

      <SettingsGroup title={sv.profile.accountSection}>
        {profile?.isAdmin ? (
          <SettingsRow icon={ADMIN_BADGE} label={sv.profile.adminBadge} />
        ) : null}
        <SettingsRow
          icon={SIGN_OUT}
          label={sv.profile.signOut}
          accessory="chevron"
          onPress={() => void confirmSignOut()}
          disabled={deleting}
        />
        <SettingsRow
          icon={TRASH}
          label={deleting ? sv.profile.deleteAccount.working : sv.profile.deleteAccount.row}
          destructive
          accessory="chevron"
          onPress={() => void confirmDeleteAccount()}
          disabled={deleting}
        />
      </SettingsGroup>

      <SettingsGroup title={sv.profile.aboutSection}>
        {hasBlocked ? (
          <SettingsRow
            label={sv.profile.blockedMembers}
            accessory="chevron"
            onPress={() => router.push('/blocked')}
          />
        ) : null}
        <SettingsRow
          label={sv.profile.privacyPolicy}
          accessory="chevron"
          onPress={() => openLegal(PRIVACY_POLICY_URL)}
        />
        <SettingsRow
          label={sv.profile.termsOfService}
          accessory="chevron"
          onPress={() => openLegal(TERMS_URL)}
        />
        <SettingsRow label={sv.profile.appVersion} value={versionLabel} />
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four },
});
