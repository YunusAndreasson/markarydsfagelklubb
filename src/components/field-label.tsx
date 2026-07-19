/**
 * The one field-label grammar: a `smallBold` muted label above an input/picker,
 * with an optional muted "(valfritt)" marker so a user can tell at a glance which
 * fields they may skip. Only the optional minority is marked — required fields are
 * left unmarked (Jakob's law: mark the exception, not the rule). Shared by
 * `TextField`, `PickerField`, and the image field so every label reads the same.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { sv } from '@/lib/i18n/sv';

export function FieldLabel({ label, optional = false }: { label: string; optional?: boolean }) {
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" themeColor="mutedForeground">
        {label}
      </ThemedText>
      {optional ? (
        <ThemedText type="small" themeColor="mutedForeground">
          {sv.common.optional}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
