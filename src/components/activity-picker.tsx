/**
 * Aktivitet-väljaren — single-select of what the bird was doing. Required (no
 * silent default), mirroring the web. The 10 activities are shown alphabetically
 * by their Swedish label (web parity — not in the enum's storage order); legacy
 * activity keys are accepted on read elsewhere but never offered here.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CHECK, Icon } from '@/components/icon';
import { PickerField } from '@/components/picker-field';
import { PickerSheet } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { ACTIVITIES, type Activity } from '@/lib/validation/observation';

// Sorted once at module load — the picker is alphabetical by label.
const OPTIONS = [...ACTIVITIES]
  .map((value) => ({ value, label: sv.observation.activity[value] }))
  .sort((a, b) => a.label.localeCompare(b.label, 'sv'));

export function ActivityPicker({
  value,
  onChange,
  invalid,
  error,
}: {
  value: Activity | null;
  onChange: (a: Activity) => void;
  invalid?: boolean;
  error?: string | null;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PickerField
        label={sv.observation.activityLabel}
        value={value ? sv.observation.activity[value] : null}
        placeholder={sv.observation.activityPlaceholder}
        invalid={invalid}
        error={error}
        onPress={() => setOpen(true)}
      />
      <PickerSheet
        visible={open}
        title={sv.observation.activityPickTitle}
        onClose={() => setOpen(false)}
      >
        <View style={styles.list}>
          {OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <PressableScale
                key={opt.value}
                variant="row"
                haptic={false}
                onPress={() => {
                  hapticSelect();
                  onChange(opt.value);
                  setOpen(false);
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
                {selected ? <Icon name={CHECK} size={18} color={theme.tint} /> : null}
              </PressableScale>
            );
          })}
        </View>
      </PickerSheet>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.half },
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
