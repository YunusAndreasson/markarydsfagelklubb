/**
 * The Larm feed filter — a native `formSheet` route (registered in the root
 * layout), so it slides up with the OS sheet + grabber + swipe-to-dismiss, exactly
 * like the report-form pickers (no hand-rolled Modal, no fade). Four dimensions:
 * scope (Alla/Mina), raritet, aktivitet, plats.
 *
 * It reads the feed from the query CACHE to derive the same chip options + a live
 * result count, and reads/writes the shared `feed-filter-store` — so toggling a
 * chip updates the feed rendered behind the half-height sheet instantly, with no
 * "Apply" step. The primary action at the end just closes and doubles as result-
 * count feedback ("Visa N träffar").
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { FilterChip } from '@/components/filter-chip';
import { RarityBadge } from '@/components/rarity-badge';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SegmentedPicker } from '@/components/segmented-picker';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useBlockedUsers } from '@/lib/blocks';
import {
  activeFilterCount,
  applyFeedFilter,
  deriveFilterOptions,
  EMPTY_FILTER,
  type FeedFilter,
} from '@/lib/feed-filter';
import { setFeedFilter, useFeedFilter } from '@/lib/feed-filter-store';
import { sv } from '@/lib/i18n/sv';
import { feedQueryOptions, type FeedObservation } from '@/lib/query/observations';
import type { RarityLevel } from '@/lib/rarity';
import type { Activity } from '@/lib/validation/observation';

type Scope = 'all' | 'mine';

const SCOPE_OPTIONS = [
  { value: 'all' as const, label: sv.filter.scopeAll },
  { value: 'mine' as const, label: sv.filter.scopeMine },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export default function FilterSheet() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const filter = useFeedFilter();

  // Same derivation as the feed, straight from the warm cache (no refetch).
  const feed = useQuery(feedQueryOptions());
  const blocked = useBlockedUsers();
  const data = useMemo(
    () => (feed.data ?? []).filter((o: FeedObservation) => !blocked.has(o.userId)),
    [feed.data, blocked],
  );
  const options = useMemo(() => deriveFilterOptions(data), [data]);
  const resultCount = useMemo(
    () => applyFeedFilter(data, filter, user?.id).length,
    [data, filter, user?.id],
  );

  // Activities carry only their raw value; resolve labels + sort A–Ö (sv).
  const activityOptions = useMemo(
    () =>
      options.activities
        .map((a) => ({ ...a, label: sv.observation.activity[a.value] }))
        .sort((a, b) => a.label.localeCompare(b.label, 'sv')),
    [options.activities],
  );

  const count = activeFilterCount(filter);
  const change = (next: FeedFilter) => setFeedFilter(next);

  return (
    /* The `Screen` scroller IS the route root — no wrapping flex column, exactly
       like the pickers and the lokal peek. That constraint is load-bearing on iOS:
       react-native-screens lays a formSheet's content wrapper out absolutely with
       top/left/right but NO bottom (so Yoga doesn't re-measure it mid-animation),
       so a `flex: 1` child has nothing to stretch against. A single scroller
       survives that; a column of scroller + pinned footer collapsed to nothing the
       moment the sheet was dragged to the taller detent — the sheet stayed there
       but its content went black. Hence the actions scroll along at the end
       instead of being pinned. */
    <Screen
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.three }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <SectionHeader title={sv.filter.scopeLabel} />
        <SegmentedPicker<Scope>
          options={SCOPE_OPTIONS}
          value={filter.onlyMine ? 'mine' : 'all'}
          onChange={(next) => change({ ...filter, onlyMine: next === 'mine' })}
          ariaLabel={sv.filter.scopeLabel}
        />
      </View>

      {options.rarities.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={sv.rarity.label} />
          <View style={styles.chips}>
            {options.rarities.map((r) => {
              const label = sv.rarity.levelLabel(r.level);
              return (
                <FilterChip
                  key={r.level}
                  label={label}
                  count={r.count}
                  leading={<RarityBadge level={r.level} />}
                  selected={filter.rarities.includes(r.level)}
                  accessibilityLabel={`${sv.rarity.a11y(r.level)}, ${label}`}
                  onPress={() =>
                    change({
                      ...filter,
                      rarities: toggle<RarityLevel>(filter.rarities, r.level),
                    })
                  }
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {activityOptions.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={sv.observation.activityLabel} />
          <View style={styles.chips}>
            {activityOptions.map((a) => (
              <FilterChip
                key={a.value}
                label={a.label}
                count={a.count}
                selected={filter.activities.includes(a.value)}
                onPress={() =>
                  change({
                    ...filter,
                    activities: toggle<Activity>(filter.activities, a.value),
                  })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {options.locations.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={sv.observation.locationLabel} />
          <View style={styles.chips}>
            {options.locations.map((l) => (
              <FilterChip
                key={l.id}
                label={l.name}
                count={l.count}
                selected={filter.locationIds.includes(l.id)}
                onPress={() =>
                  change({
                    ...filter,
                    locationIds: toggle(filter.locationIds, l.id),
                  })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Actions ride at the end of the content (see the note on the root). The
          count still reads live — the feed behind updates as chips toggle. */}
      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <Button
          title={sv.filter.clear}
          variant="secondary"
          onPress={() => setFeedFilter(EMPTY_FILTER)}
          disabled={count === 0}
          style={styles.actionButton}
        />
        <Button
          title={sv.filter.apply(resultCount)}
          variant="primary"
          onPress={() => router.back()}
          style={styles.actionButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Horizontal padding + background come from `Screen`; only the sheet-appropriate
  // top/bottom padding and the wider section gap are overridden here.
  scroll: {
    gap: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: { flex: 1 },
});
