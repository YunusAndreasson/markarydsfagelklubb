import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/filter-chip';
import { HeaderButton } from '@/components/header-button';
import { ALERT, FILTER, FILTER_ACTIVE, Icon, PLUS, TRAY } from '@/components/icon';
import { ListItemEntrance } from '@/components/list-item-entrance';
import { ObservationCard } from '@/components/observation-card';
import { PressableScale } from '@/components/pressable-scale';
import { RarityBadge } from '@/components/rarity-badge';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useMotion } from '@/hooks/use-motion';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useBlockedUsers } from '@/lib/blocks';
import { errorCopy } from '@/lib/errors';
import { groupFeed, type FeedBucket } from '@/lib/feed';
import {
  activeFilterCount,
  applyFeedFilter,
  deriveFilterOptions,
  EMPTY_FILTER,
} from '@/lib/feed-filter';
import { setFeedFilter, useFeedFilter } from '@/lib/feed-filter-store';
import { activityLabel, sv } from '@/lib/i18n/sv';
import { deletableListItemMotion } from '@/lib/motion';
import { feedQueryOptions } from '@/lib/query/observations';

// Larm — the app's landing tab and first data-driven screen: the club's
// last-14-days observations, grouped by Stockholm calendar day, newest first.
// The "dashboard" IS this list (web parity — no stats). The tab nests a native
// Stack (see `(home)/_layout.tsx`), so the "Larm" title is the native (large,
// on iOS) header. The header hosts the create action ("Larma", right, opening
// the compose modal) and the filter funnel (left, when there's data); the
// in-content SectionHeaders here are the per-day group labels. `Screen`'s
// default `automatic` inset drives the large-title collapse.
//
// Client-side filter (M15): the whole feed is already loaded, so narrowing by
// art/aktivitet/plats/"endast mina" is a pure transform (`applyFeedFilter`)
// applied before `groupFeed`. Active selections show as removable chips above
// the list.
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

  // Filter lives in a shared store so the native filter sheet (a separate route)
  // and this feed read/write the same value — the sheet's toggles update the feed
  // live behind it.
  const filter = useFeedFilter();

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

  const clearFilter = () => setFeedFilter(EMPTY_FILTER);
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

      // Rows reflow (filter toggles, optimistic insert/remove) instead of popping:
      // `layout` slides survivors into place, `exiting` recedes removed rows.
      const rowMotion = deletableListItemMotion(motion);
      body = (
        <>
          {sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <SectionHeader title={section.label} />
              {section.items.map((obs) => (
                <ListItemEntrance
                  key={obs.id}
                  index={order.get(obs.id) ?? 0}
                  exiting={rowMotion.exiting}
                >
                  <ObservationCard observation={obs} currentUserId={user?.id} />
                </ListItemEntrance>
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
        {...errorCopy(feed.error)}
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
          // Filter in the free left slot (a tab root has no back button), only
          // when there's data to narrow. Brand-GREEN like the create action, but a
          // funnel OUTLINE — not the inverted/filled treatment the "+" gets; it
          // fills (still green) once any filter is on, and the active chips row
          // below carries the specifics, so the "(n)" count drops from the bar.
          headerLeft:
            total > 0
              ? () => (
                  <HeaderButton
                    icon={count > 0 ? FILTER_ACTIVE : FILTER}
                    iconColor={theme.tint}
                    title={count > 0 ? sv.filter.buttonActive(count) : sv.filter.button}
                    onPress={() => router.navigate('/filter')}
                  />
                )
              : undefined,
          // "Larma" — the primary create action, always available (even on an
          // empty feed). A SOLID brand-green disc with a filling white "+" (a mini-
          // FAB) so it reads loudest — composed rather than `plus.circle.fill`,
          // whose glyph leaves dead padding inside the circle. Opens the compose
          // modal (root `new` route).
          headerRight: () => (
            <PressableScale
              variant="icon"
              // A light press confirmation on the app's primary action — "haptics
              // on meaningful interactions" (opening the composer is exactly that).
              haptic="press"
              onPress={() => router.navigate('/new')}
              accessibilityRole="button"
              accessibilityLabel={sv.observation.submitNew}
              style={[styles.createDisc, { backgroundColor: theme.tint }]}
            >
              <Icon name={PLUS} size={IconSize.action} weight="heavy" color={theme.badgeForeground} />
            </PressableScale>
          ),
        }}
      />
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // tintColor drives the iOS spinner; colors + progressBackgroundColor
            // are the Android pair — without them Android shows the stock palette.
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.card}
          />
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
                onRemove={() => setFeedFilter({ ...filter, onlyMine: false })}
                accessibilityLabel={sv.filter.removeChip(sv.filter.scopeMine)}
              />
            ) : null}
            {filter.rarities.map((level) => {
              const name = sv.rarity.levelLabel(level);
              return (
                <FilterChip
                  key={`r-${level}`}
                  label={name}
                  leading={<RarityBadge level={level} />}
                  onRemove={() =>
                    setFeedFilter({ ...filter, rarities: filter.rarities.filter((x) => x !== level) })
                  }
                  accessibilityLabel={sv.filter.removeChip(name)}
                />
              );
            })}
            {filter.activities.map((a) => (
              <FilterChip
                key={`a-${a}`}
                label={activityLabel(a)}
                onRemove={() =>
                  setFeedFilter({ ...filter, activities: filter.activities.filter((x) => x !== a) })
                }
                accessibilityLabel={sv.filter.removeChip(activityLabel(a))}
              />
            ))}
            {filter.locationIds.map((id) => {
              const name = locationName(id);
              return name ? (
                <FilterChip
                  key={`l-${id}`}
                  label={name}
                  onRemove={() =>
                    setFeedFilter({ ...filter, locationIds: filter.locationIds.filter((x) => x !== id) })
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
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  chipsRow: { gap: Spacing.two, alignItems: 'center', paddingVertical: Spacing.half },
  clearLink: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  // Solid brand-green create disc (mini-FAB) — the white "+" fills it, no dead padding.
  createDisc: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
