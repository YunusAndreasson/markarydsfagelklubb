import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { ALERT, CLOCK, Icon, LOCATION } from '@/components/icon';
import { ObservationMap } from '@/components/observation-map';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { Duration } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';
import { observationQueryOptions } from '@/lib/query/observations';

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
        title={sv.errors.somethingWrong}
        message={sv.errors.somethingWrongHelp}
        action={{ label: sv.errors.tryAgain, onPress: () => void q.refetch(), loading: q.isFetching }}
      />
    );
  } else if (!q.data) {
    body = <StateBlock icon={ALERT} title={sv.observation.notFound} />;
  } else {
    const obs = q.data;
    const lat = obs.latitude ?? obs.locationLatitude;
    const lng = obs.longitude ?? obs.locationLongitude;
    const mine = !!user && obs.userId === user.id;

    body = (
      <View style={styles.body}>
        <View style={styles.headerText}>
          <ThemedText type="card">{obs.speciesSwedishName}</ThemedText>
          {obs.speciesScientificName ? (
            <ThemedText type="default" themeColor="mutedForeground" style={styles.scientific}>
              {obs.speciesScientificName}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.badges}>
          <Badge label={sv.feed.count(obs.count)} tone="neutral" />
          {obs.activity ? <Badge label={sv.observation.activity[obs.activity]} tone="outline" /> : null}
          {mine ? <Badge label={sv.feed.mine} tone="primary" /> : null}
        </View>
        {mine ? (
          <Button
            title={sv.observation.editButton}
            variant="secondary"
            size="compact"
            style={styles.editButton}
            onPress={() => router.push({ pathname: '/observation/[id]/edit', params: { id } })}
          />
        ) : null}

        <View style={styles.metaRow}>
          <Icon name={CLOCK} size={16} color={theme.mutedForeground} />
          <ThemedText type="small" themeColor="mutedForeground">
            {sv.observation.timeFriendly(obs.observedAt)}
          </ThemedText>
        </View>

        {obs.locationName ? (
          <View style={styles.metaRow}>
            <Icon name={LOCATION} size={16} color={theme.mutedForeground} />
            <ThemedText type="small" themeColor="mutedForeground" style={styles.flex} numberOfLines={1}>
              {obs.locationName}
            </ThemedText>
          </View>
        ) : null}

        {lat != null && lng != null ? (
          <ObservationMap latitude={lat} longitude={lng} label={obs.locationName ?? obs.speciesSwedishName} />
        ) : null}

        {obs.imageUrl ? (
          <Image
            source={{ uri: obs.imageUrl }}
            style={[styles.image, { backgroundColor: theme.muted }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={Duration.quick}
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
          <Avatar size="sm" name={obs.observerDisplayName} uri={obs.observerAvatarUrl} />
          <ThemedText type="small" themeColor="mutedForeground" style={styles.flex} numberOfLines={1}>
            {obs.observerDisplayName ?? sv.feed.unknownObserver}
          </ThemedText>
        </PressableScale>
      </View>
    );
  }

  return <Screen inset="sub">{body}</Screen>;
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
  headerText: { gap: Spacing.half },
  scientific: { fontStyle: 'italic' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  editButton: { alignSelf: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  flex: { flex: 1 },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: SurfaceRadius.md },
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
