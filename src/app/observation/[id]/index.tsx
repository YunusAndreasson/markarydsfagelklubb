import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { HeaderButton, headerRightAction } from '@/components/header-button';
import { ALERT, CHEVRON, CLOCK, Icon, LOCATION } from '@/components/icon';
import { ObservationMap } from '@/components/observation-map';
import { PhotoView } from '@/components/photo-view';
import { PressableScale } from '@/components/pressable-scale';
import { RarityBadge } from '@/components/rarity-badge';
import { ReportBlockButton } from '@/components/report-block-button';
import { Screen } from '@/components/screen';
import { Skeleton, SkeletonLine } from '@/components/skeleton';
import { ErrorBlock, StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { sharedStyles } from '@/constants/shared-styles';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { useNearbyLokalName } from '@/hooks/use-nearby-lokal';
import { useReverseGeocode } from '@/hooks/use-reverse-geocode';
import { useTheme } from '@/hooks/use-theme';
import { activityLabel, sv } from '@/lib/i18n/sv';
import { observationQueryOptions } from '@/lib/query/observations';
import { rarityFor } from '@/lib/rarity';

// Observation detail — the full record, pushed over the tabs from a feed card
// (M11). The "Read" of CRUD; the owner additionally gets an edit button that
// pushes the M12 edit modal. The route owns a native header (title set in
// `_layout.tsx`), so this uses the `sub` inset with the default automatic top
// inset — no manual inset, no in-screen back link. Unlike the feed card, this
// renders the one interactive map + the full image + the comment.
export default function ObservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { user } = useAuth();
  const q = useQuery(observationQueryOptions(id));

  // Reverse-geocode a pin-drop observation (no named location) to a place name —
  // computed at the top level so the hook runs unconditionally (rules of hooks).
  const data = q.data;
  const geoLat = data ? (data.latitude ?? data.locationLatitude) : null;
  const geoLng = data ? (data.longitude ?? data.locationLongitude) : null;
  // Same precedence as the feed card: named lokal → a lokal within 300 m → street
  // address → "På karta". The two screens must agree about the same observation.
  const nearbyLokal = useNearbyLokalName(
    data?.locationName ? null : geoLat,
    data?.locationName ? null : geoLng,
  );
  const placeName = data?.locationName ?? nearbyLokal;
  const geocoded = useReverseGeocode(placeName ? null : geoLat, placeName ? null : geoLng);

  // Cold entry only (deep link, push notification, an observation outside the
  // feed's 14-day window). `isLoading`, not `isPending`, so a background
  // revalidation never replaces a painted record with bones.
  const showSkeleton = useDelayedFlag(q.isLoading);

  let body: ReactNode;
  if (showSkeleton) {
    // Traced against the loaded layout below: title + scientific name, the badge
    // row, then the two icon+text meta lines. No image box — the photo is
    // optional on an observation, and reserving a 4:3 slot for one that never
    // arrives collapses the page under the reader.
    body = (
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <SkeletonLine type="card" width="75%" />
            <SkeletonLine type="default" width="50%" />
          </View>
          <View style={styles.badgeColumn}>
            <Skeleton width={34} height={34} radius={SurfaceRadius.xs} />
          </View>
        </View>
        <View style={styles.badges}>
          <Skeleton width={92} height={26} radius={SurfaceRadius.pill} />
          <Skeleton width={110} height={26} radius={SurfaceRadius.pill} />
        </View>
        <View style={styles.metaRow}>
          <Skeleton width={IconSize.meta} height={IconSize.meta} radius={SurfaceRadius.xs} />
          <SkeletonLine type="small" width={150} />
        </View>
        <View style={styles.metaRow}>
          <Skeleton width={IconSize.meta} height={IconSize.meta} radius={SurfaceRadius.xs} />
          <SkeletonLine type="small" width={190} />
        </View>
      </View>
    );
  } else if (q.isLoading) {
    // In flight, but too briefly to justify a placeholder. Arriving from a feed
    // card this branch is dead anyway — `placeholderData` seeds the row from the
    // feed cache, so the screen is already populated on its first render.
    body = null;
  } else if (q.isError) {
    body = <ErrorBlock error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} />;
  } else if (!q.data) {
    body = (
      <StateBlock
        icon={ALERT}
        title={sv.observation.notFound}
        // A forward path out of the dead end — the native back chevron shouldn't
        // be the only exit.
        action={{ label: sv.observation.backToFeed, onPress: () => router.navigate('/') }}
      />
    );
  } else {
    const obs = q.data;
    const lat = obs.latitude ?? obs.locationLatitude;
    const lng = obs.longitude ?? obs.locationLongitude;
    const mine = !!user && obs.userId === user.id;
    const level = rarityFor(obs);
    const activity = obs.activity ? activityLabel(obs.activity) : null;
    const locationLabel =
      placeName ?? geocoded ?? (lat != null && lng != null ? sv.feed.locationOnMap : null);

    body = (
      <View style={styles.body}>
        {/* Name-first (matches the feed card): the species name is the flush-left
            hero, sharing its left edge with the badges + meta below; the rarity
            grade sits top-right, centered on the title's first line. */}
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <ThemedText type="card">{obs.speciesSwedishName}</ThemedText>
            {obs.speciesScientificName ? (
              <ThemedText type="default" themeColor="mutedForeground" style={styles.scientific}>
                {obs.speciesScientificName}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.badgeColumn}>
            <RarityBadge level={level} size="lg" />
          </View>
        </View>

        <View style={styles.badges}>
          <Badge label={sv.feed.count(obs.count)} tone="neutral" />
          {activity ? <Badge label={activity} tone="outline" /> : null}
          {mine ? <Badge label={sv.feed.mine} tone="primary" /> : null}
        </View>
        <View style={styles.metaRow}>
          <Icon name={CLOCK} size={IconSize.meta} color={theme.mutedForeground} />
          <ThemedText type="small" themeColor="mutedForeground">
            {sv.observation.timeFriendly(obs.observedAt)}
          </ThemedText>
        </View>

        {locationLabel ? (
          <View style={styles.metaRow}>
            <Icon name={LOCATION} size={IconSize.meta} color={theme.mutedForeground} />
            <ThemedText type="small" themeColor="mutedForeground" style={sharedStyles.flex} numberOfLines={1}>
              {locationLabel}
            </ThemedText>
          </View>
        ) : null}

        {lat != null && lng != null ? (
          <ObservationMap latitude={lat} longitude={lng} label={obs.locationName ?? obs.speciesSwedishName} />
        ) : null}

        {obs.imageUrl ? (
          // Tappable → fullscreen viewer. Cache is keyed by the stable storage
          // path, not the rotating signed URL (see ObservationCard), so the full
          // photo survives refetches + restarts.
          <PhotoView
            uri={obs.imageUrl}
            cacheKey={obs.imagePath ?? undefined}
            label={obs.speciesSwedishName}
          />
        ) : null}

        {obs.comment ? (
          <View style={[styles.comment, { backgroundColor: theme.muted }]}>
            <ThemedText type="default">{obs.comment}</ThemedText>
          </View>
        ) : null}

        <PressableScale
          variant="link"
          onPress={() =>
            router.push({ pathname: '/member/[userId]', params: { userId: obs.userId } })
          }
          accessibilityRole="button"
          accessibilityLabel={obs.observerDisplayName ?? sv.feed.unknownObserver}
          style={[styles.footer, { borderTopColor: theme.border }]}
        >
          <Avatar
            size="sm"
            name={obs.observerDisplayName}
            uri={obs.observerAvatarUrl}
            cacheKey={obs.observerAvatarCacheKey}
          />
          <ThemedText type="small" themeColor="mutedForeground" style={sharedStyles.flex} numberOfLines={1}>
            {obs.observerDisplayName ?? sv.feed.unknownObserver}
          </ThemedText>
          {/* Chevron signifies this row navigates → the observer's profile. */}
          <Icon name={CHEVRON} size={IconSize.control} color={theme.mutedForeground} />
        </PressableScale>
      </View>
    );
  }

  const isMine = !!data && !!user && data.userId === user.id;
  // The owner edits; everyone else gets the report/block overflow (Apple 1.2).
  const headerRight = isMine
    ? () => (
        <HeaderButton
          title={sv.observation.editButton}
          onPress={() => router.push({ pathname: '/observation/[id]/edit', params: { id } })}
        />
      )
    : data
      ? () => (
          <ReportBlockButton
            userId={data.userId}
            displayName={data.observerDisplayName}
            reportRef={sv.moderation.reportObservationRef(id)}
          />
        )
      : undefined;

  return (
    <>
      <Stack.Screen options={headerRightAction(headerRight)} />
      {/* Pull-to-refresh here too: the feed and member lists both have it, and a
          detail you can't refresh reads as broken next to them. NOT added to the
          formSheet routes — a pull there fights the sheet's drag-to-dismiss. */}
      <Screen inset="sub" bottomInset refresh={q.refetch}>
        {body}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  // Trailing column for the rarity badge — height matches the `card` title line
  // height so `justifyContent: center` aligns the badge with the title's first line.
  badgeColumn: { height: 36, justifyContent: 'center' },
  titleText: { flex: 1, minWidth: 0, gap: Spacing.half },
  scientific: { fontStyle: 'italic' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  comment: { padding: Spacing.three, borderRadius: SurfaceRadius.md },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    // The footer is its own press target (→ member profile); keep it ≥44px tall.
    minHeight: 44,
  },
});
