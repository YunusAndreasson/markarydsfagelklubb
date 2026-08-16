/**
 * A single observation, rendered as a compact, scannable feed card — the native
 * port of the web `observation-card.tsx`, trimmed for a phone list. The hero is
 * the species name; the three things a birder scans for — name, when, where —
 * form the top block. The species name is the flush-left hero and shares its
 * left edge with the location + meta below; a color-coded rarity badge (the
 * rarity number 0–5 — a solid red/orange fill when rare, a quiet grey tint when
 * common) clusters with the time top-right, so the grade's colour still signals
 * rarity without pushing the title inward. The photo (when present) runs
 * full-bleed to the card's rounded edges.
 *
 * Card structure: an OUTER pressable carries the shadow + rounded fill (and the
 * press tint), an INNER clip view (`clippedCard`, overflow hidden) holds the
 * content and clips the full-bleed image to the corners — a single view can't
 * both cast a shadow and clip rounded children.
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
import { CHEVRON, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { RarityBadge } from '@/components/rarity-badge';
import { ThemedText } from '@/components/themed-text';
import { Curve, Duration } from '@/constants/motion';
import { sharedStyles } from '@/constants/shared-styles';
import { elevationStyle, SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { Elevation, IconSize, Spacing } from '@/constants/theme';
import { useImageAspect } from '@/hooks/use-image-aspect';
import { useMotion } from '@/hooks/use-motion';
import { useNearbyLokalName } from '@/hooks/use-nearby-lokal';
import { useNow } from '@/hooks/use-now';
import { useReverseGeocode } from '@/hooks/use-reverse-geocode';
import { useTheme } from '@/hooks/use-theme';
import { activityLabel, sv } from '@/lib/i18n/sv';
import { type FeedObservation } from '@/lib/query/observations';
import { rarityFor } from '@/lib/rarity';

const VERY_RECENT_MS = 60 * 60 * 1000;

export type ObservationCardProps = {
  observation: FeedObservation;
  /** Current user id — marks an own observation in the spoken a11y label ("Min"). */
  currentUserId?: string | null;
  /** Injectable clock for deterministic time-ago / very-recent in tests/demos. */
  now?: Date;
  /**
   * Drop the observer footer. Set on a member's own profile, where every card
   * has the same observer — whose name is already the screen's nav title — so
   * the row was pure repetition. Worse, its tap target pushed ANOTHER copy of
   * the profile you were already looking at, stackable without limit.
   */
  hideObserver?: boolean;
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

export function ObservationCard({
  observation,
  currentUserId,
  now,
  hideObserver,
}: ObservationCardProps) {
  const theme = useTheme();
  const mine = !!currentUserId && observation.userId === currentUserId;
  // Subscribed, not read at render time. `new Date()` here was only ever right
  // on the render that happened to compute it, and nothing re-renders a settled
  // feed — stable query data, Compiler-memoized cards, tabs that stay mounted —
  // so "X sedan" froze at whatever it said when the card first painted (measured
  // on device: "46m sedan" on a 71-minute-old fynd). `useNow` ticks every minute
  // and on every foreground, which is what makes the label true. The `now` prop
  // still wins, so tests and demos stay deterministic.
  const tick = useNow();
  const clock = now ?? tick;
  const veryRecent = clock.getTime() - observation.observedAt.getTime() < VERY_RECENT_MS;

  const level = rarityFor(observation);

  // Photos are stored uncropped, so the slot takes the photo's own shape rather
  // than forcing every frame into 4:3.
  const { aspect: aspectRatio, onLoad: onImageLoad } = useImageAspect();

  // Location matters — show a real name. Named locations use their name; pin-drop
  // observations (no name, raw coords) are reverse-geocoded to a place name, with
  // "På karta" as the fallback while that resolves or if the geocoder is unavailable.
  const named = observation.locationName;
  const lat = observation.latitude ?? observation.locationLatitude;
  const lng = observation.longitude ?? observation.locationLongitude;
  // Before falling back to a street address, try the club's own register: a pin
  // within 300 m of a lokal is already counted as that lokal by the map, so name
  // it that here too. Also spares the OS geocoder a call.
  const nearbyLokal = useNearbyLokalName(named ? null : lat, named ? null : lng);
  const placeName = named ?? nearbyLokal;
  const geocoded = useReverseGeocode(placeName ? null : lat, placeName ? null : lng);
  const locationLabel =
    placeName ?? geocoded ?? (lat != null && lng != null ? sv.feed.locationOnMap : null);

  // Count is always present; activity is optional. Join them into one muted,
  // dot-separated meta line instead of pills — plain text shares the same flush-
  // left margin as the name and location, so nothing reads as misaligned.
  const meta = [
    sv.feed.count(observation.count),
    observation.activity ? activityLabel(observation.activity) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // A container with an `accessibilityLabel` is read as a single element and its
  // children are suppressed — so compose the whole card (rarity, species, count,
  // activity, when, where, who) into one spoken label. The rarity badge's number
  // MUST be spoken here or it's lost; the readable time form ("Idag 14:30") is
  // used, not the visual "2h" shorthand.
  const a11yLabel = [
    sv.rarity.a11y(level),
    observation.speciesSwedishName,
    sv.feed.count(observation.count),
    observation.activity ? activityLabel(observation.activity) : null,
    sv.observation.timeFriendly(observation.observedAt, clock),
    locationLabel,
    // Suppressed with the footer: on a member's profile every card would
    // otherwise speak the same "Rapporterad av …" — the visual redundancy we're
    // removing, read aloud.
    !hideObserver && observation.observerDisplayName
      ? sv.feed.reportedBy(observation.observerDisplayName)
      : null,
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
      {/* Inner clip: hairline border + overflow hidden so the full-bleed image
          clips to the rounded corners. Transparent so the outer card fill + press
          tint show through the text. */}
      <View style={[SurfaceStyles.clippedCard, styles.clip, { borderColor: theme.border }]}>
        {/* Without the footer the content block is the card's last element when
            there's no photo, so it has to carry its own bottom padding (the
            footer used to provide it). With a photo, the photo runs full-bleed
            to the rounded bottom edge, which needs no padding. */}
        <View
          style={[
            styles.content,
            hideObserver && !observation.imageUrl && styles.contentBottom,
          ]}
        >
          {/* Name-first: the species name is the flush-left hero and shares its
              left edge with the location + meta below — one clean anchor, no
              hanging indent. The rarity grade and the time cluster top-right as
              compact metadata; the grade's colour (loud when rare) still carries. */}
          <View style={styles.header}>
            <ThemedText type="heading" numberOfLines={1} style={sharedStyles.flex}>
              {observation.speciesSwedishName}
            </ThemedText>
            <View style={styles.metaRight}>
              <RarityBadge level={level} />
              {veryRecent ? <PulsingDot /> : null}
              <ThemedText type="smallBold" themeColor={veryRecent ? 'primary' : 'mutedForeground'}>
                {sv.feed.timeAgo(observation.observedAt, clock)}
              </ThemedText>
            </View>
          </View>

          {locationLabel ? (
            <ThemedText type="smallBold" themeColor="foreground" numberOfLines={1}>
              {locationLabel}
            </ThemedText>
          ) : null}

          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1}>
            {meta}
          </ThemedText>
        </View>

        {observation.imageUrl ? (
          <Image
            // Key the disk/memory cache by the stable storage PATH, not the signed
            // URL — the URL's token rotates on every refetch/cold start, which would
            // otherwise force a re-download of an identical photo. The path only
            // changes when the photo is actually replaced (fresh draftId). Big win
            // on bad networks: once seen, a photo loads from disk instantly.
            source={{ uri: observation.imageUrl, cacheKey: observation.imagePath ?? undefined }}
            // Höjden följer bildens eget format (klampat) i stället för en fast
            // 4:3-ruta — se `useImageAspect`. `cover` finns kvar för de fall där
            // klampningen faktiskt beskär (panorama / mycket hög stående).
            style={[styles.image, { aspectRatio, backgroundColor: theme.muted }]}
            onLoad={onImageLoad}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={Duration.quick}
            recyclingKey={observation.imagePath ?? observation.id}
          />
        ) : null}

        {/* The footer is its own press target → the observer's member profile.
            Nested inside the card's PressableScale: the deepest responder wins, so
            a footer tap opens the member while the rest of the card opens the
            detail. `link` is the non-animated Pressable path → safe to nest.
            Omitted entirely on that member's own profile (see `hideObserver`). */}
        {hideObserver ? null : (
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
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1} style={sharedStyles.flex}>
            {observation.observerDisplayName ?? sv.feed.unknownObserver}
          </ThemedText>
          {/* Chevron signifies the observer row is its own tap target → their
              profile — otherwise a nested target inside a tappable card is
              invisible (Norman: signifier). */}
          <Icon name={CHEVRON} size={IconSize.control} color={theme.mutedForeground} />
        </PressableScale>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Outer: shadow + rounded fill only. No border (it lives on the inner clip) and
  // no overflow (an iOS shadow needs overflow visible to render).
  cardShadow: { borderRadius: SurfaceRadius.md, ...elevationStyle(Elevation.raised) },
  // Inner: clips the full-bleed image to the rounded corners; transparent so the
  // outer card fill + press tint show through the text.
  clip: { backgroundColor: 'transparent' },
  // Padded text column. The full-bleed image and footer are siblings with their
  // own spacing, so this only pads the top block.
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.two },
  contentBottom: { paddingBottom: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3 },
  // Full-bleed photo: no horizontal margin (touches the clipped edges); a gap
  // above separates it from the text block. `aspectRatio` is applied inline from
  // `useImageAspect` — the photo keeps the shape it was shot in.
  image: { width: '100%', marginTop: Spacing.three },
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
