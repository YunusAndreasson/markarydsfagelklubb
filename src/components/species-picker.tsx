/**
 * Art-väljaren — searchable single-select over the full (~300) species list. The
 * native port of the web `species-picker`:
 *   • a deferred search filters on Swedish + scientific name + family,
 *   • "Olistad art" (the unlisted-species row) is pinned above the list with its
 *     hint, always selectable,
 *   • the rest is a virtualized `FlatList` with a fixed row height (so scroll +
 *     scroll-to-selected are smooth),
 *   • picking fires a selection haptic and closes the sheet.
 *
 * Selection is the species `id` (matching the create-observation input).
 */
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { ALERT, CHECK, Icon, SEARCH } from '@/components/icon';
import { PickerField } from '@/components/picker-field';
import { PickerSheet } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonCard } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { speciesQueryOptions, type Species } from '@/lib/query/species';
import { rarityStyle, type RarityLevel } from '@/lib/rarity';

const ROW_HEIGHT = 64;

export function SpeciesPicker({
  value,
  onChange,
  invalid,
  error,
}: {
  value: number | null;
  onChange: (id: number) => void;
  invalid?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const { height: winH } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listRef = useRef<FlatList<Species>>(null);

  const speciesQuery = useQuery(speciesQueryOptions());
  const all = useMemo(() => speciesQuery.data ?? [], [speciesQuery.data]);

  // "Olistad art" is a real species row — pin it above the list and exclude it
  // from the virtualized body so list rows stay a uniform height.
  const unlisted = useMemo(
    () => all.find((s) => s.swedishName === sv.observation.speciesUnlisted) ?? null,
    [all],
  );
  const regular = useMemo(
    () => all.filter((s) => s.id !== unlisted?.id),
    [all, unlisted],
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

  const selectedLabel = value != null ? (all.find((s) => s.id === value)?.swedishName ?? null) : null;

  function pick(id: number) {
    hapticSelect();
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  function renderRow({ item }: { item: Species }) {
    const selected = item.id === value;
    const rarity = item.rarity != null ? rarityStyle(item.rarity as RarityLevel, colorScheme) : null;
    return (
      <PressableScale
        variant="row"
        haptic={false}
        onPress={() => pick(item.id)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[styles.row, selected && { backgroundColor: theme.muted }]}
      >
        {/* Rarity prefix — same color-coded number chip as the Obsar card, so the
            grade is visible while scanning the art-lista (read-only, never edited). */}
        {rarity ? (
          <View style={[styles.rarityBadge, { backgroundColor: rarity.background }]}>
            <ThemedText type="micro" style={[styles.rarityNum, { color: rarity.foreground }]}>
              {item.rarity}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.rowText}>
          <ThemedText type="smallBold" numberOfLines={1} themeColor={selected ? 'tint' : 'foreground'}>
            {item.swedishName}
          </ThemedText>
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1}>
            {item.scientificName}
          </ThemedText>
        </View>
        {selected ? <Icon name={CHECK} size={18} color={theme.tint} /> : null}
      </PressableScale>
    );
  }

  return (
    <>
      <PickerField
        label={sv.observation.speciesLabel}
        value={selectedLabel}
        placeholder={sv.observation.speciesPlaceholder}
        invalid={invalid}
        error={error}
        onPress={() => setOpen(true)}
      />
      <PickerSheet visible={open} title={sv.observation.speciesLabel} onClose={() => setOpen(false)}>
        <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Icon name={SEARCH} size={18} color={theme.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={sv.observation.speciesSearch}
            placeholderTextColor={theme.mutedForeground}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            // Cap Dynamic Type like the app's body text so the search row (fixed
            // 48px) keeps the text vertically centered at large accessibility sizes.
            maxFontSizeMultiplier={1.6}
            style={[styles.searchInput, { color: theme.foreground }]}
            accessibilityLabel={sv.observation.speciesSearch}
          />
        </View>

        {speciesQuery.isPending ? (
          <SkeletonCard height={ROW_HEIGHT} />
        ) : speciesQuery.isError ? (
          <StateBlock
            icon={ALERT}
            tone="error"
            title={sv.errors.somethingWrong}
            message={sv.errors.somethingWrongHelp}
            action={{ label: sv.errors.tryAgain, onPress: () => void speciesQuery.refetch() }}
          />
        ) : (
          <>
            {unlisted ? (
              <PressableScale
                variant="row"
                haptic={false}
                onPress={() => pick(unlisted.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: unlisted.id === value }}
                style={[styles.unlisted, unlisted.id === value && { backgroundColor: theme.muted }]}
              >
                <View style={styles.rowText}>
                  <ThemedText
                    type="smallBold"
                    numberOfLines={1}
                    themeColor={unlisted.id === value ? 'tint' : 'foreground'}
                  >
                    {unlisted.swedishName}
                  </ThemedText>
                  <ThemedText type="small" themeColor="mutedForeground" numberOfLines={2}>
                    {sv.observation.speciesUnlistedHint}
                  </ThemedText>
                </View>
                {unlisted.id === value ? <Icon name={CHECK} size={18} color={theme.tint} /> : null}
              </PressableScale>
            ) : null}

            <FlatList
              ref={listRef}
              data={filtered}
              keyExtractor={(s) => String(s.id)}
              renderItem={renderRow}
              getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollToIndexFailed={() => {}}
              style={{ maxHeight: winH * 0.5 }}
              ListEmptyComponent={
                <ThemedText type="small" themeColor="mutedForeground" style={styles.empty}>
                  {sv.observation.speciesEmpty}
                </ThemedText>
              }
            />
          </>
        )}
      </PickerSheet>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    ...SurfaceStyles.inputSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: SurfaceRadius.sm,
  },
  unlisted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: ROW_HEIGHT,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: SurfaceRadius.sm,
  },
  rowText: { flex: 1, gap: Spacing.half },
  // Matches the Obsar card's rarity chip so the prefix reads identically everywhere.
  rarityBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: SurfaceRadius.xs,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityNum: { fontWeight: '700' },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
});
