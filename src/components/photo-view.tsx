/**
 * A tappable observation photo — an inline preview that opens a fullscreen viewer
 * on tap. It mirrors `observation-map.tsx` one-for-one (same expand-badge
 * signifier, same self-contained `Modal`, same 44pt close button) so the detail
 * screen's photo and map read as one interaction vocabulary: both say "tap to see
 * this bigger". Jakob's Law — a photo that can't be enlarged breaks the
 * expectation every other app sets; Norman — the corner badge is the *signifier*
 * that the tap exists.
 *
 * Inline the image is cropped (`cover`) to a tidy 4:3 card; fullscreen it's shown
 * whole (`contain`) so nothing important is clipped. Cache is keyed by the stable
 * storage path, not the rotating signed URL (see `observation-card.tsx`).
 */
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLOSE, EXPAND, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedView } from '@/components/themed-view';
import { Duration } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

export type PhotoViewProps = {
  /** The (signed) image URL. */
  uri: string;
  /** Stable storage path — keys the disk/memory cache so the photo survives the
   *  signed URL's token rotating (matches the feed card + detail behavior). */
  cacheKey?: string;
};

export function PhotoView({ uri, cacheKey }: PhotoViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  const source = { uri, cacheKey };

  return (
    <View>
      {/* Gentle card-press depress signals the photo is interactive (Norman
          affordance); the corner badge is the explicit signifier. */}
      <PressableScale
        variant="card"
        onPress={() => setExpanded(true)}
        accessibilityRole="button"
        accessibilityLabel={sv.observation.photoExpand}
        style={[styles.preview, { borderColor: theme.border }]}
      >
        <Image
          source={source}
          style={[styles.image, { backgroundColor: theme.muted }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={Duration.quick}
        />
        <View
          style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.border }]}
          pointerEvents="none"
        >
          <Icon name={EXPAND} size={IconSize.meta} color={theme.foreground} />
        </View>
      </PressableScale>

      <Modal
        visible={expanded}
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
        statusBarTranslucent
      >
        {/* Tap anywhere to dismiss (the Lightbox convention), plus an explicit
            close button for discoverability. */}
        <ThemedView style={styles.full}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={sv.observation.photoClose}
            onPress={() => setExpanded(false)}
          >
            <Image
              source={source}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={Duration.quick}
            />
          </Pressable>
          <PressableScale
            variant="icon"
            onPress={() => setExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel={sv.observation.photoClose}
            style={[
              styles.close,
              { top: insets.top + Spacing.two, backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Icon name={CLOSE} size={IconSize.close} color={theme.foreground} />
          </PressableScale>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderRadius: SurfaceRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 4 / 3 },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    padding: Spacing.one,
    borderRadius: SurfaceRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  full: { flex: 1 },
  close: {
    position: 'absolute',
    right: Spacing.three,
    // ≥44pt visible target (Apple HIG / Material), independent of the icon
    // variant's hitSlop — the viewer's primary dismiss control should be easy to hit.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SurfaceRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
