/**
 * Aktivitet-väljaren, as a native sheet (`presentation: 'formSheet'` in the root
 * layout; title in the native header). Built on the app's `Screen` scroller so the
 * content insets below the header and fills the sheet. Single-select; the chosen
 * value goes back to the report form via the picker bridge. Alphabetical by label.
 */
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { CHECK, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { usePickerResult } from '@/lib/picker-bridge';
import { ACTIVITIES, type Activity } from '@/lib/validation/observation';

// Sorted once at module load — the picker is alphabetical by label.
const OPTIONS = [...ACTIVITIES]
  .map((value) => ({ value, label: sv.observation.activity[value] }))
  .sort((a, b) => a.label.localeCompare(b.label, 'sv'));

export default function ActivityPickerSheet() {
  const theme = useTheme();
  const { current } = useLocalSearchParams<{ current?: string }>();
  const choose = usePickerResult<Activity>();

  return (
    <Screen contentContainerStyle={styles.content}>
      {OPTIONS.map((opt) => {
        const selected = opt.value === current;
        return (
          <PressableScale
            key={opt.value}
            variant="row"
            haptic={false}
            onPress={() => {
              hapticSelect();
              choose(opt.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.row, selected && { backgroundColor: theme.muted }]}
          >
            <ThemedText
              type="default"
              themeColor={selected ? 'tint' : 'foreground'}
              style={styles.label}
            >
              {opt.label}
            </ThemedText>
            {selected ? <Icon name={CHECK} size={IconSize.control} color={theme.tint} /> : null}
          </PressableScale>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.half, paddingTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: SurfaceRadius.sm,
  },
  label: { flex: 1 },
});
