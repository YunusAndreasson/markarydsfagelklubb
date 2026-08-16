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

import { RarityBadge, type RarityBadgeCustom } from '@/components/rarity-badge';
import { SelectRow } from '@/components/select-row';
import { SearchField } from '@/components/search-field';
import { Skeleton } from '@/components/skeleton';
import { ErrorBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { sharedStyles } from '@/constants/shared-styles';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';
import { usePickerResult } from '@/lib/picker-bridge';
import { foldSearch } from '@/lib/search';
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
    // Folded on both sides, so "havsorn" finds Havsörn. Nearly every Swedish bird
    // name carries å/ä/ö, all of which are a long-press away on a phone keyboard —
    // and a plain `includes` failed them silently, emptying the list as if the
    // club's register simply didn't have the bird.
    const q = foldSearch(deferred.trim());
    if (!q) return regular;
    return regular.filter(
      (s) =>
        foldSearch(s.swedishName).includes(q) ||
        foldSearch(s.scientificName).includes(q) ||
        (s.family != null && foldSearch(s.family).includes(q)),
    );
  }, [regular, deferred]);

  function renderSpecialRow(
    item: Species,
    hint: string,
    badge: RarityBadgeCustom,
    displayName?: string,
  ) {
    return (
      <SelectRow
        size="tall"
        leading={<RarityBadge custom={badge} />}
        label={displayName ?? item.swedishName}
        secondary={hint}
        secondaryLines={2}
        selected={item.id === currentId}
        onPress={() => choose(item.id)}
      />
    );
  }

  function renderRow({ item }: { item: Species }) {
    return (
      <SelectRow
        size="tall"
        leading={
          item.rarity != null ? <RarityBadge level={item.rarity as RarityLevel} /> : undefined
        }
        label={item.swedishName}
        secondary={item.scientificName}
        selected={item.id === currentId}
        onPress={() => choose(item.id)}
      />
    );
  }

  const loaded = !speciesQuery.isPending && !speciesQuery.isError;
  const listEmpty = speciesQuery.isPending ? (
    <View style={styles.loading}>
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <View key={n} style={styles.skeletonRow}>
          <Skeleton width={20} height={20} radius={SurfaceRadius.xs} />
          <View style={styles.skeletonText}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  ) : speciesQuery.isError ? (
    <ErrorBlock
      error={speciesQuery.error}
      onRetry={() => void speciesQuery.refetch()}
      retrying={speciesQuery.isFetching}
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
              {/* Android renders no sheet header, so the native search bar above
                  never appears there and this ~300-row list was scroll-only —
                  even though the filter below was already written. No-op on iOS. */}
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={sv.observation.speciesSearch}
              />
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
  // `paddingTop` matches the horizontal inset so the search field (now the first
  // thing in the list header) sits inside the sheet rather than jammed against
  // its rounded top edge — with no header on Android there's nothing else to
  // separate them.
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  loading: { paddingTop: Spacing.two },
  // Mirrors a `SelectRow size="tall"` so the skeleton occupies the same space
  // the real rows will.
  skeletonRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  skeletonText: { flex: 1, gap: Spacing.half },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
});
