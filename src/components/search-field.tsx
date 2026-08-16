/**
 * The app's own search input — the Android half of every search in the app.
 *
 * Every searchable screen here asks for a NATIVE search bar via
 * `headerSearchBarOptions`, which is the right control on iOS. On Android it
 * repeatedly isn't there:
 *   • a `formSheet` route renders **no header at all** (react-native-screens
 *     shows the sheet header on iOS only), so the ~300-row species picker and the
 *     ~60-row lokal picker were scroll-only with the filter logic already written;
 *   • a `headerTransparent` header — the Lokaler map, which is full-bleed by
 *     design — gives the bar no surface, so the field was invisible until typed
 *     text appeared out of nowhere. Nothing on that screen said it was searchable.
 *
 * So this renders a real, visible field on Android and nothing on iOS, where the
 * native bar already owns the job. Callers pair the two:
 *
 *     <Stack.Screen options={{ headerSearchBarOptions: {...} }} />   // iOS
 *     <SearchField value={q} onChangeText={setQ} ... />              // Android
 *
 * In a sheet it rides at the top of the scrolling content rather than pinned
 * above it: a `formSheet`'s content wrapper is laid out with no bottom on iOS, so
 * a column of "pinned field + scroller" collapses the scroller to nothing (see
 * the note in `filter.tsx`). Scrolling with the list is the safe shape, and
 * typing shrinks the list back to where the field is visible anyway.
 */
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { CLOSE, Icon, SEARCH } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { sharedStyles } from '@/constants/shared-styles';
import { SurfaceStyles } from '@/constants/surface';
import { FontSize, IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

export type SearchFieldProps = {
  value: string;
  onChangeText: (next: string) => void;
  /** Doubles as the field's accessibility label — the row has no visible label. */
  placeholder: string;
  /** Raise the field over content it floats above (the map). Sheets omit it. */
  elevated?: boolean;
};

export function SearchField({ value, onChangeText, placeholder, elevated }: SearchFieldProps) {
  const theme = useTheme();

  // iOS gets the real native search bar in the header.
  if (Platform.OS === 'ios') return null;

  return (
    <View
      style={[
        styles.row,
        // Over the map the field needs a shadow to separate from the tiles; in a
        // sheet it sits on the theme background and a shadow would be noise.
        elevated && SurfaceStyles.raisedCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
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
