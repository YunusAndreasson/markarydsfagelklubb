import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FeedFilterSheet } from '@/components/feed-filter-sheet';
import { FilterChip } from '@/components/filter-chip';
import { HeaderButton } from '@/components/header-button';
import { ALERT, TRAY } from '@/components/icon';
import { ObservationCard } from '@/components/observation-card';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useMotion } from '@/hooks/use-motion';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useBlockedUsers } from '@/lib/blocks';
import { groupFeed, type FeedBucket } from '@/lib/feed';
import {
  activeFilterCount,
  applyFeedFilter,
  deriveFilterOptions,
  EMPTY_FILTER,
  type FeedFilter,
} from '@/lib/feed-filter';
import { sv } from '@/lib/i18n/sv';
import { listEntrance } from '@/lib/motion';
import { feedQueryOptions } from '@/lib/query/observations';

// Hem — the app's home tab and first data-driven screen: the club's
// last-14-days observations, grouped by Stockholm calendar day, newest first.
// The "dashboard" IS this list (web parity — no stats). The tab nests a native
// Stack (see `(home)/_layout.tsx`), so the "Hem" title is the native (large,
// on iOS) header; the in-content SectionHeaders here are the per-day group
// labels. `Screen`'s default `automatic` inset drives the large-title collapse.
//
// Client-side filter (M15): the whole feed is already loaded, so narrowing by
// art/aktivitet/plats/"endast mina" is a pure transform (`applyFeedFilter`)
// applied before `groupFeed`. The funnel lives in the native header; active
// selections show as removable chips above the list.
const BUCKETS: { key: FeedBucket; label: string }[] = [
  { key: 'today', label: sv.feed.today },
  { key: 'yesterday', label: sv.feed.yesterday },
  { key: 'thisWeek', label: sv.feed.thisWeek },
  { key: 'earlier', label: sv.feed.earlier },
];

export default function FeedScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { motion } = useMotion();
  const feed = useQuery(feedQueryOptions());
  const { refreshing, onRefresh } = usePullToRefresh(feed.refetch);

  const [filter, setFilter] = useState<FeedFilter>(EMPTY_FILTER);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Blocked members (Apple 1.2) drop out before anything else, so they're absent
  // from the list, the filter options, and the counts alike.
  const blocked = useBlockedUsers();
  const data = useMemo(
    () => (feed.data ?? []).filter((o) => !blocked.has(o.userId)),
    [feed.data, blocked],
  );
  const options = useMemo(() => deriveFilterOptions(data), [data]);
  const filtered = useMemo(() => applyFeedFilter(data, filter, user?.id), [data, filter, user?.id]);
  const grouped = useMemo(() => groupFeed(filtered), [filtered]);

  const total = data.length;
  const count = activeFilterCount(filter);

  const clearFilter = () => setFilter(EMPTY_FILTER);
  const speciesName = (id: number) => options.species.find((s) => s.id === id)?.swedishName;
  const locationName = (id: number) => options.locations.find((l) => l.id === id)?.name;

  let body: ReactNode;
  if (total > 0) {
    if (filtered.length > 0) {
      // One continuous stagger index across all buckets so the cascade reads as a
      // single column rather than restarting under each header.
      const order = new Map<string, number>();
      const sections = BUCKETS.map((b) => ({ ...b, items: grouped[b.key] })).filter(
        (s) => s.items.length > 0,
      );
      sections.forEach((s) => s.items.forEach((o) => order.set(o.id, order.size)));

      body = (
        <>
          {sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <SectionHeader title={section.label} />
              {section.items.map((obs) => (
                <Animated.View key={obs.id} entering={motion(listEntrance(order.get(obs.id) ?? 0))}>
                  <ObservationCard observation={obs} currentUserId={user?.id} />
                </Animated.View>
              ))}
            </View>
          ))}
        </>
      );
    } else {
      // Data exists but the filter excludes all of it — distinct from the
      // no-observations-at-all empty state below.
      body = (
        <StateBlock
          icon={TRAY}
          title={sv.filter.emptyTitle}
          action={{ label: sv.filter.emptyAction, onPress: clearFilter }}
        />
      );
    }
  } else if (feed.isLoading) {
    body = (
      <View style={styles.section}>
        {[0, 1, 2].map((n) => (
          <SkeletonCard key={n} height={150} />
        ))}
      </View>
    );
  } else if (feed.isError) {
    body = (
      <StateBlock
        tone="error"
        icon={ALERT}
        title={sv.errors.somethingWrong}
        message={sv.errors.somethingWrongHelp}
        action={{ label: sv.errors.tryAgain, onPress: () => void feed.refetch(), loading: feed.isFetching }}
      />
    );
  } else {
    body = (
      <StateBlock
        icon={TRAY}
        title={sv.feed.empty}
        action={{ label: sv.feed.newObservation, onPress: () => router.navigate('/new') }}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight:
            total > 0
              ? () => (
                  <HeaderButton
                    title={count > 0 ? sv.filter.buttonActive(count) : sv.filter.button}
                    onPress={() => setSheetOpen(true)}
                  />
                )
              : undefined,
        }}
      />
      <Screen
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {total > 0 && count > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {filter.onlyMine ? (
              <FilterChip
                label={sv.filter.scopeMine}
                onRemove={() => setFilter((f) => ({ ...f, onlyMine: false }))}
                accessibilityLabel={sv.filter.removeChip(sv.filter.scopeMine)}
              />
            ) : null}
            {filter.speciesIds.map((id) => {
              const name = speciesName(id);
              return name ? (
                <FilterChip
                  key={`s-${id}`}
                  label={name}
                  onRemove={() =>
                    setFilter((f) => ({ ...f, speciesIds: f.speciesIds.filter((x) => x !== id) }))
                  }
                  accessibilityLabel={sv.filter.removeChip(name)}
                />
              ) : null;
            })}
            {filter.activities.map((a) => (
              <FilterChip
                key={`a-${a}`}
                label={sv.observation.activity[a]}
                onRemove={() =>
                  setFilter((f) => ({ ...f, activities: f.activities.filter((x) => x !== a) }))
                }
                accessibilityLabel={sv.filter.removeChip(sv.observation.activity[a])}
              />
            ))}
            {filter.locationIds.map((id) => {
              const name = locationName(id);
              return name ? (
                <FilterChip
                  key={`l-${id}`}
                  label={name}
                  onRemove={() =>
                    setFilter((f) => ({ ...f, locationIds: f.locationIds.filter((x) => x !== id) }))
                  }
                  accessibilityLabel={sv.filter.removeChip(name)}
                />
              ) : null;
            })}
            <PressableScale
              variant="link"
              onPress={clearFilter}
              accessibilityRole="button"
              accessibilityLabel={sv.filter.clear}
              style={styles.clearLink}
            >
              <ThemedText type="smallBold" themeColor="tint">
                {sv.filter.clearShort}
              </ThemedText>
            </PressableScale>
          </ScrollView>
        ) : null}
        {body}
      </Screen>
      <FeedFilterSheet
        visible={sheetOpen}
        filter={filter}
        options={options}
        resultCount={filtered.length}
        onChange={setFilter}
        onClear={clearFilter}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  chipsRow: { gap: Spacing.two, alignItems: 'center', paddingVertical: Spacing.half },
  clearLink: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
});
