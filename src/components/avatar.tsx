/**
 * A user avatar disc. With a `uri` it renders the signed avatar photo via
 * `expo-image` (cover-cropped, memory-disk cached, faded in); without one it falls
 * back to the display-name initial on the brand tint. Geometry comes from
 * `AvatarSize` so the circle stays in lockstep with the diameter across call sites
 * (profile, feed, member). The editable picker control is `ImageUpload` (M10);
 * this stays the read-only display disc.
 */
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Duration } from '@/constants/motion';
import { AvatarSize } from '@/constants/surface';
import { useTheme } from '@/hooks/use-theme';

export type AvatarProps = {
  /** Display name — its first letter becomes the initial glyph. */
  name?: string | null;
  /** Diameter token (sm 24 · md 30 · lg 88). Defaults to `md`. */
  size?: keyof typeof AvatarSize;
  /** Signed avatar URL. When set, the photo replaces the initial glyph. */
  uri?: string | null;
  /**
   * A stable `expo-image` cache key — build it with `avatarCacheKey()`, never
   * from the storage path alone.
   *
   * Supabase re-mints its signed-URL token on every fetch, so the `uri` above is
   * a different string after each refetch and every cold start, and expo-image
   * keys its cache on the URL — meaning `memory-disk` never once hit for a face.
   * But an avatar's path is `${userId}/avatar.ext` uploaded with `upsert: true`,
   * i.e. overwritten in place, so keying on the path would pin the OLD face
   * forever. `avatarCacheKey()` versions the path with the profile's
   * `updated_at`, which is stable across refetches and changes when the row does.
   */
  cacheKey?: string | null;
};

export function Avatar({ name, size = 'md', uri, cacheKey }: AvatarProps) {
  const theme = useTheme();
  const diameter = AvatarSize[size];
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const fontSize = Math.round(diameter * 0.4);

  if (uri) {
    return (
      <Image
        accessibilityLabel={name ?? undefined}
        source={{ uri, cacheKey: cacheKey ?? undefined }}
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: theme.muted,
        }}
        contentFit="cover"
        cachePolicy="memory-disk"
        // Keyed so a recycled row never shows the previous member's face for a
        // frame before its own resolves.
        recyclingKey={cacheKey ?? uri}
        transition={Duration.quick}
      />
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name ?? undefined}
      style={[
        styles.avatar,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: theme.tint,
        },
      ]}
    >
      <ThemedText
        type="smallBold"
        // Scale the glyph to the disc; override the type's fixed size/line-height.
        style={{ color: theme.badgeForeground, fontSize, lineHeight: Math.round(fontSize * 1.1) }}
      >
        {initial}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
