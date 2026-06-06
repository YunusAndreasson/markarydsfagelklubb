/**
 * A single observation, rendered as a compact, scannable feed card — the native
 * port of the web `observation-card.tsx`, trimmed for a phone list. Shows the
 * species name (the hero), scientific name, an ultra-short time-ago (with a
 * pulsing dot for fynd under an hour old), count/activity/"Min" badges, the
 * location name, an optional photo thumbnail, and the observer footer.
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
import { SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';
import { type FeedObservation } from '@/lib/query/observations';

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

export function ObservationCard({ observation, currentUserId, now }: ObservationCardProps) {
  const theme = useTheme();
  const mine = !!currentUserId && observation.userId === currentUserId;
  const clock = now ?? new Date();
  const veryRecent = clock.getTime() - observation.observedAt.getTime() < VERY_RECENT_MS;

  return (
    <PressableScale
      variant="card"
      onPress={() => router.push({ pathname: '/observation/[id]', params: { id: observation.id } })}
      accessibilityRole="button"
      accessibilityLabel={observation.speciesSwedishName}
      restingBackgroundColor={theme.card}
      pressedBackgroundColor={theme.backgroundSelected}
      style={[SurfaceStyles.raisedCard, styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.header}>
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
        <View style={styles.timeRow}>
          {veryRecent ? <PulsingDot /> : null}
          <ThemedText type="smallBold" themeColor={veryRecent ? 'primary' : 'mutedForeground'}>
            {sv.feed.timeAgo(observation.observedAt, clock)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.badges}>
        <Badge label={sv.feed.count(observation.count)} tone="neutral" />
        {observation.activity ? (
          <Badge label={sv.observation.activity[observation.activity]} tone="outline" />
        ) : null}
        {mine ? <Badge label={sv.feed.mine} tone="primary" /> : null}
      </View>

      {observation.locationName ? (
        <View style={styles.locationRow}>
          <Icon name={LOCATION} size={16} color={theme.mutedForeground} />
          <ThemedText
            type="small"
            themeColor="mutedForeground"
            numberOfLines={1}
            style={styles.flex}
          >
            {observation.locationName}
          </ThemedText>
        </View>
      ) : null}

      {observation.imageUrl ? (
        <Image
          source={{ uri: observation.imageUrl }}
          style={[styles.thumb, { backgroundColor: theme.muted }]}
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
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerText: { flex: 1, minWidth: 0, gap: Spacing.half },
  scientific: { fontStyle: 'italic' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  flex: { flex: 1 },
  thumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: SurfaceRadius.md },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    // The footer is its own press target (→ member profile); keep it ≥44px tall.
    minHeight: 44,
  },
});
