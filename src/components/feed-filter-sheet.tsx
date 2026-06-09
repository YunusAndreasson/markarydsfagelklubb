/**
 * The Obsar feed filter — a bottom sheet over `PickerSheet`. Four dimensions:
 * scope (Alla/Mina), raritet, aktivitet, plats. Filters apply *live* to the
 * parent's state as chips toggle (no Apply step); the footer's primary button
 * just closes the sheet and doubles as result-count feedback ("Visa N träffar").
 *
 * Section labels reuse `observation.*Label` (+ `rarity.label`). Options are
 * derived from the feed (see `deriveFilterOptions`), so every chip yields ≥1
 * result. The body is a single `ScrollView` (no FlatList) — the dimensions are
 * small (rarity is ≤6 levels, activities/locations bounded by the 14-day feed).
 */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { FilterChip } from '@/components/filter-chip';
import { PickerSheet } from '@/components/picker-sheet';
import { RarityBadge } from '@/components/rarity-badge';
import { SectionHeader } from '@/components/section-header';
import { SegmentedPicker } from '@/components/segmented-picker';
import { Spacing } from '@/constants/theme';
import type { FeedFilter, FilterOptions } from '@/lib/feed-filter';
import { activeFilterCount } from '@/lib/feed-filter';
import { sv } from '@/lib/i18n/sv';
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

export type FeedFilterSheetProps = {
  visible: boolean;
  filter: FeedFilter;
  options: FilterOptions;
  resultCount: number;
  onChange: (next: FeedFilter) => void;
  onClear: () => void;
  onClose: () => void;
};

export function FeedFilterSheet({
  visible,
  filter,
  options,
  resultCount,
  onChange,
  onClear,
  onClose,
}: FeedFilterSheetProps) {
  const { height: winH } = useWindowDimensions();

  // Activities carry only their raw value from the feed; resolve labels here and
  // sort alphabetically by label (sv), matching the activity picker.
  const activityOptions = useMemo(
    () =>
      options.activities
        .map((a) => ({ ...a, label: sv.observation.activity[a.value] }))
        .sort((a, b) => a.label.localeCompare(b.label, 'sv')),
    [options.activities],
  );

  const count = activeFilterCount(filter);

  return (
    <PickerSheet visible={visible} title={sv.filter.title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: winH * 0.55 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SectionHeader title={sv.filter.scopeLabel} />
          <SegmentedPicker<Scope>
            options={SCOPE_OPTIONS}
            value={filter.onlyMine ? 'mine' : 'all'}
            onChange={(next) => onChange({ ...filter, onlyMine: next === 'mine' })}
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
                      onChange({ ...filter, rarities: toggle<RarityLevel>(filter.rarities, r.level) })
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
                    onChange({
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
                    onChange({ ...filter, locationIds: toggle(filter.locationIds, l.id) })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={sv.filter.clear}
          variant="secondary"
          onPress={onClear}
          disabled={count === 0}
          style={styles.footerButton}
        />
        <Button
          title={sv.filter.apply(resultCount)}
          variant="primary"
          onPress={onClose}
          style={styles.footerButton}
        />
      </View>
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Spacing.four, paddingBottom: Spacing.two },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  footer: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.two },
  footerButton: { flex: 1 },
});
