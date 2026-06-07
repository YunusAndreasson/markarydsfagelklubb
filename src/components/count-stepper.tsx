/**
 * Antal-stepparen — a `[−] [count] [+]` control for the individual count. Matches
 * the web `observation-form` count section: clamps to `[1, 9999]` (the web UI cap;
 * the schema allows higher, but the picker mirrors the web), the ± buttons disable
 * at the bounds, and tapping the number opens an inline numeric field to type a
 * value directly.
 */
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Icon, MINUS, PLUS } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

const MIN = 1;
const MAX = 9999;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

export function CountStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function commit() {
    const parsed = Number.parseInt(draft, 10);
    onChange(Number.isFinite(parsed) ? clamp(parsed) : value);
    setEditing(false);
  }

  const atMin = value <= MIN;
  const atMax = value >= MAX;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="mutedForeground">
        {sv.observation.countLabel}
      </ThemedText>
      <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <PressableScale
          variant="button"
          disabled={atMin}
          onPress={() => onChange(clamp(value - 1))}
          accessibilityRole="button"
          accessibilityLabel={sv.observation.countDecrease}
          style={styles.stepBtn}
        >
          <Icon name={MINUS} size={20} color={atMin ? theme.mutedForeground : theme.foreground} />
        </PressableScale>

        {editing ? (
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            selectTextOnFocus
            // Match the displayed value's cap (ThemedText `subtitle` = 1.3) so editing
            // doesn't overflow the fixed 56px stepper row.
            maxFontSizeMultiplier={1.3}
            style={[styles.input, { color: theme.foreground }]}
            accessibilityLabel={sv.observation.countLabel}
          />
        ) : (
          <PressableScale
            variant="row"
            haptic={false}
            onPress={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={sv.observation.countEditHint}
            style={styles.countWrap}
          >
            <ThemedText type="subtitle">{value}</ThemedText>
          </PressableScale>
        )}

        <PressableScale
          variant="button"
          disabled={atMax}
          onPress={() => onChange(clamp(value + 1))}
          accessibilityRole="button"
          accessibilityLabel={sv.observation.countIncrease}
          style={styles.stepBtn}
        >
          <Icon name={PLUS} size={20} color={atMax ? theme.mutedForeground : theme.foreground} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  row: {
    ...SurfaceStyles.inputSurface,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 56,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countWrap: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 56,
    textAlign: 'center',
    // Concrete fontSize — TextInput isn't a ThemedText so the type token can't
    // apply. Matches the `subtitle` display size so editing doesn't shift the layout.
    fontSize: 32,
    fontWeight: '600',
  },
});
