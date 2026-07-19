/**
 * Art-väljaren, as a native sheet (`presentation: 'formSheet'` in the root layout).
 * The title + a NATIVE search bar live in the sheet header (`headerSearchBarOptions`
 * — pinned, no focus loss, and it insets the list below it via
 * `contentInsetAdjustmentBehavior`). Searchable single-select over the ~300 species:
 *   • deferred search on Swedish + scientific name + family,
 *   • "Olistad fågelart" (unlisted) + "Övrigt (ej fågel)" (non-bird) as the list
 *     header (scroll with it), shown as `speciesUnlistedLabel` though matched on
 *     the DB name `speciesUnlisted`,
 *   • a virtualized `FlatList` with a fixed row height.
 * The chosen species `id` goes back to the report form via the picker bridge.
 */
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';

import { ALERT, CHECK, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { RarityBadge, type RarityBadgeCustom } from '@/components/rarity-badge';
import { Skeleton } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { sharedStyles } from '@/constants/shared-styles';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { usePickerResult } from '@/lib/picker-bridge';
import { speciesQueryOptions, type Species } from '@/lib/query/species';
import { type RarityLevel } from '@/lib/rarity';

const ROW_HEIGHT = 64;

export default function SpeciesPickerSheet() {
  const theme = useTheme();
  const { current } = useLocalSearchParams<{ current?: string }>();
  const currentId = current != null ? Number(current) : null;
  const choose = usePickerResult<number>();

  const [query, setQuery] = useState('');
  const handleSearch = useCallback(
    (e: { nativeEvent: { text: string } }) => setQuery(e.nativeEvent.text),
    [],
  );

  const speciesQuery = useQuery(speciesQueryOptions());
  const all = useMemo(() => speciesQuery.data ?? [], [speciesQuery.data]);

  const unlisted = useMemo(
    () => all.find((s) => s.swedishName === sv.observation.speciesUnlisted) ?? null,
    [all],
  );
  const other = useMemo(
    () => all.find((s) => s.swedishName === sv.observation.speciesOther) ?? null,
    [all],
  );
  const regular = useMemo(
    () => all.filter((s) => s.id !== unlisted?.id && s.id !== other?.id),
    [all, unlisted, other],
  );

  const deferred = useDeferredValue(query);
  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    if (!q) return regular;
    return regular.filter(
      (s) =>
        s.swedishName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        (s.family?.toLowerCase().includes(q) ?? false),
    );
  }, [regular, deferred]);

  function renderSpecialRow(
    item: Species,
    hint: string,
    badge: RarityBadgeCustom,
    displayName?: string,
  ) {
    const selected = item.id === currentId;
    return (
      <PressableScale
        variant="row"
        haptic={false}
        onPress={() => {
          hapticSelect();
          choose(item.id);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[styles.pinned, selected && { backgroundColor: theme.muted }]}
      >
        <RarityBadge custom={badge} />
        <View style={styles.rowText}>
          <ThemedText type="smallBold" numberOfLines={1} themeColor={selected ? 'tint' : 'foreground'}>
            {displayName ?? item.swedishName}
          </ThemedText>
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={2}>
            {hint}
          </ThemedText>
        </View>
        {selected ? <Icon name={CHECK} size={IconSize.control} color={theme.tint} /> : null}
      </PressableScale>
    );
  }

  function renderRow({ item }: { item: Species }) {
    const selected = item.id === currentId;
    return (
      <PressableScale
        variant="row"
        haptic={false}
        onPress={() => {
          hapticSelect();
          choose(item.id);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[styles.row, selected && { backgroundColor: theme.muted }]}
      >
        {item.rarity != null ? <RarityBadge level={item.rarity as RarityLevel} /> : null}
        <View style={styles.rowText}>
          <ThemedText type="smallBold" numberOfLines={1} themeColor={selected ? 'tint' : 'foreground'}>
            {item.swedishName}
          </ThemedText>
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1}>
            {item.scientificName}
          </ThemedText>
        </View>
        {selected ? <Icon name={CHECK} size={IconSize.control} color={theme.tint} /> : null}
      </PressableScale>
    );
  }

  const loaded = !speciesQuery.isPending && !speciesQuery.isError;
  const listEmpty = speciesQuery.isPending ? (
    <View style={styles.loading}>
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <View key={n} style={styles.row}>
          <Skeleton width={20} height={20} radius={SurfaceRadius.xs} />
          <View style={styles.rowText}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  ) : speciesQuery.isError ? (
    <StateBlock
      icon={ALERT}
      tone="error"
      title={sv.errors.somethingWrong}
      message={sv.errors.somethingWrongHelp}
      action={{ label: sv.errors.tryAgain, onPress: () => void speciesQuery.refetch() }}
    />
  ) : (
    <ThemedText type="small" themeColor="mutedForeground" style={styles.empty}>
      {sv.observation.speciesEmpty}
    </ThemedText>
  );

  return (
    <>
      {/* Native search bar in the sheet header — pinned, and it insets the list. */}
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: sv.observation.speciesSearch,
            onChangeText: handleSearch,
            autoCapitalize: 'none',
            hideWhenScrolling: false,
          },
        }}
      />
      <FlatList
        style={[sharedStyles.flex, { backgroundColor: theme.background }]}
        contentInsetAdjustmentBehavior="automatic"
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderRow}
        // No `getItemLayout`: the ListHeaderComponent (the two pinned special
        // rows) has a variable height, which fixed offsets can't account for —
        // and nothing here calls scrollToIndex, so async measurement is fine.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // The two special rows ride at the top of the list (scroll with it).
        ListHeaderComponent={
          loaded ? (
            <>
              {unlisted
                ? renderSpecialRow(
                    unlisted,
                    sv.observation.speciesUnlistedHint,
                    { label: '0', background: theme.destructive, foreground: theme.badgeForeground },
                    sv.observation.speciesUnlistedLabel,
                  )
                : null}
              {other
                ? renderSpecialRow(other, sv.observation.speciesOtherHint, {
                    label: '–',
                    background: theme.border,
                    foreground: theme.mutedForeground,
                  })
                : null}
            </>
          ) : null
        }
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four },
  loading: { paddingTop: Spacing.two },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: SurfaceRadius.sm,
  },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: ROW_HEIGHT,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: SurfaceRadius.sm,
  },
  rowText: { flex: 1, gap: Spacing.half },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
});
