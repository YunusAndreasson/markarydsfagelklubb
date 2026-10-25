/**
 * Aktivitet-väljaren, as a native sheet (`presentation: 'formSheet'` in the root
 * layout; title in the native header). Built on the app's `Screen` scroller so the
 * content insets below the header and fills the sheet. Single-select; the chosen
 * value goes back to the report form via the picker bridge. Alphabetical by label.
 */
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { SelectRow } from '@/components/select-row';
import { SheetTitle } from '@/components/sheet-title';
import { Spacing } from '@/constants/theme';
import { sv } from '@/lib/i18n/sv';
import { usePickerResult } from '@/lib/picker-bridge';
import { ACTIVITIES, type Activity } from '@/lib/validation/observation';

// Sorted once at module load — the picker is alphabetical by label.
const OPTIONS = [...ACTIVITIES]
  .map((value) => ({ value, label: sv.observation.activity[value] }))
  .sort((a, b) => a.label.localeCompare(b.label, 'sv'));

export default function ActivityPickerSheet() {
  const { current } = useLocalSearchParams<{ current?: string }>();
  const choose = usePickerResult<Activity>();

  return (
    <Screen contentContainerStyle={styles.content}>
      <SheetTitle title={sv.observation.activityLabel} />
      {OPTIONS.map((opt) => (
        <SelectRow
          key={opt.value}
          label={opt.label}
          selected={opt.value === current}
          onPress={() => choose(opt.value)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.half, paddingTop: Spacing.two },
});
