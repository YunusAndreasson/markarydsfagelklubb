/**
 * The in-sheet search input for the picker sheets.
 *
 * The pickers ask for a NATIVE search bar via `headerSearchBarOptions`, which is
 * the right control on iOS. But a `formSheet` route renders **no header at all
 * on Android** — react-native-screens shows the sheet header on iOS only — so on
 * Android that bar simply never appears. Verified on device: both the ~300-row
 * species picker and the ~60-row lokal picker were scroll-only, with the filter
 * logic already written and nothing to drive it.
 *
 * So this renders the field in the sheet CONTENT on Android and nothing on iOS,
 * where the native bar already owns the job. Callers pair the two:
 *
 *     <Stack.Screen options={{ headerSearchBarOptions: {...} }} />   // iOS
 *     <SheetSearchField value={q} onChangeText={setQ} ... />         // Android
 *
 * It rides at the top of the scrolling content rather than pinned above it: a
 * `formSheet`'s content wrapper is laid out with no bottom on iOS, so a column of
 * "pinned field + scroller" collapses the scroller to nothing (see the note in
 * `filter.tsx`). Scrolling with the list is the safe shape, and typing shrinks
 * the list back to where the field is visible anyway.
 */
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { CLOSE, Icon, SEARCH } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { sharedStyles } from '@/constants/shared-styles';
import { SurfaceStyles } from '@/constants/surface';
import { FontSize, IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

export type SheetSearchFieldProps = {
  value: string;
  onChangeText: (next: string) => void;
  /** Doubles as the field's accessibility label — the row has no visible label. */
  placeholder: string;
};

export function SheetSearchField({ value, onChangeText, placeholder }: SheetSearchFieldProps) {
  const theme = useTheme();

  // iOS gets the real native search bar in the sheet header.
  if (Platform.OS === 'ios') return null;

  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Icon name={SEARCH} size={IconSize.control} color={theme.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        // Cap Dynamic Type like the app's other raw inputs so the row keeps its height.
        maxFontSizeMultiplier={1.6}
        style={[styles.input, sharedStyles.flex, { color: theme.foreground }]}
      />
      {/* `clearButtonMode` is iOS-only, and this component only ever renders on
          Android — so the clear affordance has to be built (Nielsen: user
          control and freedom; without it the only way back to the full list is
          to hold backspace). */}
      {value.length > 0 ? (
        <PressableScale
          variant="icon"
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={sv.common.clearSearch}
          style={styles.clear}
        >
          <Icon name={CLOSE} size={IconSize.meta} color={theme.mutedForeground} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...SurfaceStyles.inputSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
  },
  // TextInput isn't a ThemedText, so the type token can't apply — concrete size.
  input: { fontSize: FontSize.input, paddingVertical: Spacing.two },
  // Keep the clear target comfortably tappable inside the 48px row.
  clear: { padding: Spacing.one },
});
