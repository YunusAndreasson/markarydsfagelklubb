import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { HeaderButton } from '@/components/header-button';
import { ALERT, CHEVRON, CLOCK, Icon, LOCATION } from '@/components/icon';
import { ObservationMap } from '@/components/observation-map';
import { PhotoView } from '@/components/photo-view';
import { PressableScale } from '@/components/pressable-scale';
import { RarityBadge } from '@/components/rarity-badge';
import { ReportBlockButton } from '@/components/report-block-button';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useReverseGeocode } from '@/hooks/use-reverse-geocode';
import { useTheme } from '@/hooks/use-theme';
import { errorCopy } from '@/lib/errors';
import { sv } from '@/lib/i18n/sv';
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
  const geocoded = useReverseGeocode(
    data?.locationName ? null : geoLat,
    data?.locationName ? null : geoLng,
  );

  let body: ReactNode;
  if (q.isLoading) {
    body = (
      <View style={styles.body}>
        <Skeleton width="70%" height={28} />
        <Skeleton width="40%" height={16} />
        <Skeleton aspectRatio={4 / 3} radius={SurfaceRadius.md} />
        <Skeleton width="90%" height={16} />
        <Skeleton width="55%" height={16} />
      </View>
    );
  } else if (q.isError) {
    body = (
      <StateBlock
        tone="error"
        icon={ALERT}
        {...errorCopy(q.error)}
        action={{ label: sv.errors.tryAgain, onPress: () => void q.refetch(), loading: q.isFetching }}
      />
    );
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
    const locationLabel =
      obs.locationName ?? geocoded ?? (lat != null && lng != null ? sv.feed.locationOnMap : null);

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
          {obs.activity ? <Badge label={sv.observation.activity[obs.activity]} tone="outline" /> : null}
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
            <ThemedText type="small" themeColor="mutedForeground" style={styles.flex} numberOfLines={1}>
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
          <PhotoView uri={obs.imageUrl} cacheKey={obs.imagePath ?? undefined} />
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
          <Avatar size="sm" name={obs.observerDisplayName} uri={obs.observerAvatarUrl} />
          <ThemedText type="small" themeColor="mutedForeground" style={styles.flex} numberOfLines={1}>
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
      <Stack.Screen options={{ headerRight }} />
      <Screen inset="sub">{body}</Screen>
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
  flex: { flex: 1 },
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
