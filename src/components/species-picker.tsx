/**
 * Art-väljaren — searchable single-select over the full (~300) species list. The
 * native port of the web `species-picker`:
 *   • a deferred search filters on Swedish + scientific name + family,
 *   • "Olistad art" (the unlisted-species row) and "Övrigt (ej fågel)" (the
 *     non-bird row) are pinned above the list with their hints, always selectable,
 *   • the rest is a virtualized `FlatList` with a fixed row height (so scroll +
 *     scroll-to-selected are smooth),
 *   • picking fires a selection haptic and closes the sheet.
 *
 * Selection is the species `id` (matching the create-observation input).
 */
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { ALERT, CHECK, Icon, SEARCH } from '@/components/icon';
import { PickerField } from '@/components/picker-field';
import { PickerSheet } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { RarityBadge, type RarityBadgeCustom } from '@/components/rarity-badge';
import { Skeleton } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { FontSize, IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { speciesQueryOptions, type Species } from '@/lib/query/species';
import { type RarityLevel } from '@/lib/rarity';

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
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The PickerSheet card pads its bottom by the safe-area inset; the list must
  // extend through it (negative margin cancels it, re-added as scroll content) so
  // it reaches the sheet's bottom edge instead of leaving a dead band below.
  const bottomInset = insets.bottom + Spacing.three;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listRef = useRef<FlatList<Species>>(null);

  const speciesQuery = useQuery(speciesQueryOptions());
  const all = useMemo(() => speciesQuery.data ?? [], [speciesQuery.data]);

  // "Olistad art" and "Övrigt (ej fågel)" are real species rows — pin them above
  // the list and exclude them from the virtualized body so list rows stay a
  // uniform height.
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

  const selectedLabel = value != null ? (all.find((s) => s.id === value)?.swedishName ?? null) : null;

  function pick(id: number) {
    hapticSelect();
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  // A pinned special row (Olistad art / Övrigt) — same layout as a list row but
  // with a hint instead of a scientific name and a custom badge.
  function renderPinnedRow(item: Species, hint: string, badge: RarityBadgeCustom) {
    const selected = item.id === value;
    return (
      <PressableScale
        variant="row"
        haptic={false}
        onPress={() => pick(item.id)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[styles.pinned, selected && { backgroundColor: theme.muted }]}
      >
        <RarityBadge custom={badge} />
        <View style={styles.rowText}>
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            themeColor={selected ? 'tint' : 'foreground'}
          >
            {item.swedishName}
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
    const selected = item.id === value;
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
          <Icon name={SEARCH} size={IconSize.control} color={theme.mutedForeground} />
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
          // Ghost rows in the real row geometry (chip + name + scientific name)
          // so the load state reads like the list it becomes.
          <View>
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
          <>
            {/* "Olistad art": the same chip-style badge as every other row (so it
                isn't missed), but a markedly red "0" — an unlisted/new species is
                the rarest find (rarity 0), the most notable thing to larma. */}
            {unlisted
              ? renderPinnedRow(unlisted, sv.observation.speciesUnlistedHint, {
                  label: '0',
                  background: theme.destructive,
                  foreground: theme.badgeForeground,
                })
              : null}
            {/* "Övrigt (ej fågel)": no rarity grade applies to a non-bird, so the
                chip is a neutral "–" instead of a number. */}
            {other
              ? renderPinnedRow(other, sv.observation.speciesOtherHint, {
                  label: '–',
                  background: theme.border,
                  foreground: theme.mutedForeground,
                })
              : null}

            <FlatList
              ref={listRef}
              data={filtered}
              keyExtractor={(s) => String(s.id)}
              renderItem={renderRow}
              getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              // iOS keyboard handling for the search field (the sheet no longer
              // uses a KeyboardAvoidingView on iOS): inset the list under the
              // keyboard so results stay scrollable. No-op on Android, where the
              // sheet's `behavior="height"` handles it.
              automaticallyAdjustKeyboardInsets
              onScrollToIndexFailed={() => {}}
              // Fixed height (not maxHeight) so the sheet keeps its size while
              // searching — with a content-driven height, narrowing to a single
              // match collapsed the bottom-anchored card down behind the keyboard.
              // `flexShrink` still lets the card's 85% clamp compress the list on
              // short screens. (Web parity: the drawer is a fixed `h-[85svh]`.)
              style={{ height: winH * 0.5, flexShrink: 1, marginBottom: -bottomInset }}
              contentContainerStyle={{ paddingBottom: bottomInset }}
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
    // TextInput needs a concrete fontSize — ThemedText types can't apply.
    fontSize: FontSize.input,
  },
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
