/**
 * The Larm feed filter — a native `formSheet` route (registered in the root
 * layout), so it slides up with the OS sheet + grabber + swipe-to-dismiss, exactly
 * like the report-form pickers (no hand-rolled Modal, no fade). Four dimensions:
 * scope (Alla/Mina), raritet, aktivitet, plats.
 *
 * It reads the feed from the query CACHE to derive the same chip options + a live
 * result count, and reads/writes the shared `feed-filter-store` — so toggling a
 * chip updates the feed rendered behind the half-height sheet instantly, with no
 * "Apply" step. The footer's primary button just closes and doubles as result-
 * count feedback ("Visa N träffar").
 */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { FilterChip } from '@/components/filter-chip';
import { RarityBadge } from '@/components/rarity-badge';
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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* A flex:1 ScrollView that paints the theme background, so dragging up to
          the taller detent can't expose an unpainted (black) area.
          NOT the app's `Screen`: that hard-codes
          `contentInsetAdjustmentBehavior="automatic"`, which is meant for a
          top-level scroller under an iOS large title. Inside a `formSheet` that
          resizes between detents, iOS re-derives the adjusted inset on every
          resize and pushed the whole content past the bottom of the sheet on
          expand — the sheet looked painted but EMPTY. The native sheet header
          already lays this content out below itself, so `never` is correct here
          and the padding is explicit. */}
      <ScrollView
        style={[styles.scroller, { backgroundColor: theme.background }]}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scroll}
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
                      change({ ...filter, rarities: toggle<RarityLevel>(filter.rarities, r.level) })
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
                    change({ ...filter, activities: toggle<Activity>(filter.activities, a.value) })
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
                  onPress={() => change({ ...filter, locationIds: toggle(filter.locationIds, l.id) })}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.three },
        ]}
      >
        <Button
          title={sv.filter.clear}
          variant="secondary"
          onPress={() => setFeedFilter(EMPTY_FILTER)}
          disabled={count === 0}
          style={styles.footerButton}
        />
        <Button
          title={sv.filter.apply(resultCount)}
          variant="primary"
          onPress={() => router.back()}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroller: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: { flex: 1 },
});
