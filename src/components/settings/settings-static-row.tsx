/**
 * Read-only labeled value inside a `SettingsGroup` card — the display-only
 * sibling of `SettingsFormInput`, sharing its exact geometry (stacked small
 * label over the value, same paddings/minHeight) so editable and static rows
 * read as one family.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function SettingsStaticRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} accessibilityLabel={`${label}, ${value}`}>
      <ThemedText type="small" themeColor="mutedForeground">
        {label}
      </ThemedText>
      <ThemedText type="default">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
    minHeight: 52,
  },
});
