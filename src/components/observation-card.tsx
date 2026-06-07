/**
 * A single observation, rendered as a compact, scannable feed card — the native
 * port of the web `observation-card.tsx`, trimmed for a phone list. The hero is
 * the species name; the three things a birder scans for — name, when, where —
 * form the top block. A color-coded rarity heat spine runs down the card's left
 * edge (mirrored by a dot beside the name) so rare fynd pop while scrolling, and
 * the photo (when present) runs full-bleed to the card's rounded edges.
 *
 * Card structure: an OUTER pressable carries the shadow + rounded fill (and the
 * press tint), an INNER clip view (`clippedCard`, overflow hidden) holds the
 * content and clips the full-bleed image to the corners — a single view can't
 * both cast a shadow and clip rounded children. The rarity spine is the inner
 * view's thick left border, so it respects the corner radius for free.
 *
 * Deliberately NO inline map: the web reuses one rich card in both the feed and
 * the detail view, but mounting a `react-native-maps` MapView per row would be a
 * performance/memory sink. The interactive map (and the full image + comment)
 * live on the detail screen, which the whole card taps through to.
 *
 * Container-agnostic (no query/refetch logic) so it can later move from the feed's
 * ScrollView into a FlatList `renderItem` unchanged if the feed ever grows large.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Icon, LOCATION } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Curve, Duration } from '@/constants/motion';
import { elevationStyle, SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { Elevation, Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { sv } from '@/lib/i18n/sv';
import { type FeedObservation } from '@/lib/query/observations';
import { rarityColor, rarityFor } from '@/lib/rarity';

const VERY_RECENT_MS = 60 * 60 * 1000;

export type ObservationCardProps = {
  observation: FeedObservation;
  /** Current user id — drives the "Min" badge. */
  currentUserId?: string | null;
  /** Injectable clock for deterministic time-ago / very-recent in tests/demos. */
  now?: Date;
};

/** A small primary dot that breathes — flags a fynd reported within the hour. */
function PulsingDot() {
  const theme = useTheme();
  const { reduced } = useMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(
      withTiming(0.3, { duration: Duration.pulse, easing: Curve.inOut }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: reduced ? 1 : pulse.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: theme.primary }, animatedStyle]} />;
}

/** The location line's text: the named location, else "På karta" when only raw
 *  coordinates exist, else nothing. Mirrors the detail screen's coordinate fallback. */
function locationFor(observation: FeedObservation): string | null {
  if (observation.locationName) return observation.locationName;
  const lat = observation.latitude ?? observation.locationLatitude;
  const lng = observation.longitude ?? observation.locationLongitude;
  return lat != null && lng != null ? sv.feed.locationOnMap : null;
}

export function ObservationCard({ observation, currentUserId, now }: ObservationCardProps) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const mine = !!currentUserId && observation.userId === currentUserId;
  const clock = now ?? new Date();
  const veryRecent = clock.getTime() - observation.observedAt.getTime() < VERY_RECENT_MS;

  const level = rarityFor(observation);
  const rarity = rarityColor(level, colorScheme);
  const locationLabel = locationFor(observation);

  // A container with an `accessibilityLabel` is read as a single element and its
  // children are suppressed — so compose the whole card (rarity, species, count,
  // activity, when, where, who) into one spoken label. The rarity is color-only
  // on screen, so it MUST be spoken here or it's lost; the readable time form
  // ("Idag 14:30") is used, not the visual "2h" shorthand.
  const a11yLabel = [
    sv.rarity.a11y(level),
    observation.speciesSwedishName,
    sv.feed.count(observation.count),
    observation.activity ? sv.observation.activity[observation.activity] : null,
    sv.observation.timeFriendly(observation.observedAt, clock),
    locationLabel,
    observation.observerDisplayName ? sv.feed.reportedBy(observation.observerDisplayName) : null,
    mine ? sv.feed.mine : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <PressableScale
      variant="card"
      onPress={() => router.push({ pathname: '/observation/[id]', params: { id: observation.id } })}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      restingBackgroundColor={theme.card}
      pressedBackgroundColor={theme.backgroundSelected}
      style={[styles.cardShadow, { backgroundColor: theme.card }]}
    >
      {/* Inner clip: hairline border on three sides, the rarity heat spine on the
          left, and overflow hidden so the full-bleed image clips to the corners.
          Transparent so the outer card fill + press tint show through the text. */}
      <View
        style={[
          SurfaceStyles.clippedCard,
          styles.clip,
          { borderColor: theme.border, borderLeftColor: rarity },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.hero}>
              {/* Rarity dot in its own leading column, centered on the name's
                  first line, so the name + scientific name align cleanly. */}
              <View style={styles.dotColumn}>
                <View style={[styles.rarityDot, { backgroundColor: rarity }]} />
              </View>
              <View style={styles.headerText}>
                <ThemedText type="heading" numberOfLines={1}>
                  {observation.speciesSwedishName}
                </ThemedText>
                {observation.speciesScientificName ? (
                  <ThemedText
                    type="small"
                    themeColor="mutedForeground"
                    numberOfLines={1}
                    style={styles.scientific}
                  >
                    {observation.speciesScientificName}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <View style={styles.timeRow}>
              {veryRecent ? <PulsingDot /> : null}
              <ThemedText type="smallBold" themeColor={veryRecent ? 'primary' : 'mutedForeground'}>
                {sv.feed.timeAgo(observation.observedAt, clock)}
              </ThemedText>
            </View>
          </View>

          {locationLabel ? (
            <View style={styles.locationRow}>
              <Icon name={LOCATION} size={16} color={theme.mutedForeground} />
              <ThemedText
                type="smallBold"
                themeColor="foreground"
                numberOfLines={1}
                style={styles.flex}
              >
                {locationLabel}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.badges}>
            <Badge label={sv.feed.count(observation.count)} tone="neutral" />
            {observation.activity ? (
              <Badge label={sv.observation.activity[observation.activity]} tone="outline" />
            ) : null}
            {mine ? <Badge label={sv.feed.mine} tone="primary" /> : null}
          </View>
        </View>

        {observation.imageUrl ? (
          <Image
            source={{ uri: observation.imageUrl }}
            style={[styles.image, { backgroundColor: theme.muted }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={Duration.quick}
            recyclingKey={observation.id}
          />
        ) : null}

        {/* The footer is its own press target → the observer's member profile.
            Nested inside the card's PressableScale: the deepest responder wins, so
            a footer tap opens the member while the rest of the card opens the
            detail. `link` is the non-animated Pressable path → safe to nest. */}
        <PressableScale
          variant="link"
          onPress={() =>
            router.push({ pathname: '/member/[userId]', params: { userId: observation.userId } })
          }
          accessibilityRole="button"
          accessibilityLabel={observation.observerDisplayName ?? sv.feed.unknownObserver}
          style={[styles.footer, { borderTopColor: theme.border }]}
        >
          <Avatar size="sm" name={observation.observerDisplayName} uri={observation.observerAvatarUrl} />
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1} style={styles.flex}>
            {observation.observerDisplayName ?? sv.feed.unknownObserver}
          </ThemedText>
        </PressableScale>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Outer: shadow + rounded fill only. No border (it lives on the inner clip) and
  // no overflow (an iOS shadow needs overflow visible to render).
  cardShadow: { borderRadius: SurfaceRadius.md, ...elevationStyle(Elevation.raised) },
  // Inner: clips the full-bleed image to the rounded corners; transparent so the
  // outer card fill + press tint show through. The 4px left border is the rarity
  // spine (color set inline); the other sides keep the hairline from clippedCard.
  clip: { borderLeftWidth: 4, backgroundColor: 'transparent' },
  // Padded text column. The full-bleed image and footer are siblings with their
  // own spacing, so this only pads the top block.
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  hero: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  // Leading column for the rarity dot — its height matches the `heading` line
  // height so `justifyContent: center` aligns the dot with the species name.
  dotColumn: { height: 24, justifyContent: 'center' },
  headerText: { flex: 1, minWidth: 0, gap: Spacing.one },
  // Rarity dot beside the name — same heat color as the left spine.
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  scientific: { fontStyle: 'italic' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { width: 6, height: 6, borderRadius: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flex: 1 },
  // Full-bleed photo: no horizontal margin (touches the clipped edges, inset only
  // by the rarity spine on the left); a gap above separates it from the text block.
  image: { width: '100%', aspectRatio: 4 / 3, marginTop: Spacing.three },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Footer spans the full card width inside the clip, so it carries its own
    // horizontal + bottom padding (the content column's padding no longer wraps it).
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    marginTop: Spacing.three,
    // The footer is its own press target (→ member profile); keep it ≥44px tall.
    minHeight: 44,
  },
});
