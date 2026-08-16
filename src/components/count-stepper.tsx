/**
 * Antal-stepparen — a `[−] [count] [+]` control for the individual count. Matches
 * the web `observation-form` count section: clamps to `[1, 9999]` (the web UI cap;
 * the schema allows higher, but the picker mirrors the web), the ± buttons disable
 * at the bounds, and tapping the number opens an inline numeric field to type a
 * value directly.
 */
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { EDIT, Icon, MINUS, PLUS } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceStyles } from '@/constants/surface';
import { FontSize, IconSize, Opacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticError, hapticPress } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

const MIN = 1;
const MAX = 9999;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

export function CountStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  /** Inert while the hosting form is saving — matches the picker fields. */
  disabled?: boolean;
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
      <View
        style={[
          styles.row,
          { backgroundColor: theme.card, borderColor: theme.border },
          disabled && styles.dimmed,
        ]}
      >
        <PressableScale
          variant="button"
          // Stays pressable at MIN: a refused decrement fires an error haptic
          // (the ✕ still reads dimmed) rather than a silent dead tap. `haptic`
          // off so we pick press-vs-error ourselves.
          haptic={false}
          onPress={() => {
            if (atMin) hapticError();
            else {
              hapticPress();
              onChange(value - 1);
            }
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={sv.observation.countDecrease}
          accessibilityState={{ disabled: !!disabled }}
          style={styles.stepBtn}
        >
          <Icon name={MINUS} size={IconSize.close} color={atMin ? theme.mutedForeground : theme.foreground} />
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
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={sv.observation.countEditHint}
            accessibilityState={{ disabled: !!disabled }}
            style={styles.countWrap}
          >
            {/* Bare, the number reads as a static total. A muted pencil is the
                signifier that tapping it opens a numeric field to type a value
                directly — otherwise the tap-to-type affordance is invisible to
                sighted users (Norman — discoverability). */}
            <ThemedText type="subtitle">{value}</ThemedText>
            <Icon name={EDIT} size={IconSize.meta} color={theme.mutedForeground} />
          </PressableScale>
        )}

        <PressableScale
          variant="button"
          // Symmetric with MIN: a refused increment at MAX fires an error haptic.
          haptic={false}
          onPress={() => {
            if (atMax) hapticError();
            else {
              hapticPress();
              onChange(value + 1);
            }
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={sv.observation.countIncrease}
          accessibilityState={{ disabled: !!disabled }}
          style={styles.stepBtn}
        >
          <Icon name={PLUS} size={IconSize.close} color={atMax ? theme.mutedForeground : theme.foreground} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  // The whole control dims as one surface (it reads as a single field), rather
  // than each of the three targets dimming on its own.
  dimmed: { opacity: Opacity.disabled },
  input: {
    flex: 1,
    minHeight: 56,
    textAlign: 'center',
    // Concrete fontSize — TextInput isn't a ThemedText so the type token can't
    // apply. Matches the `subtitle` display size so editing doesn't shift the layout.
    fontSize: FontSize.display,
    fontWeight: '600',
  },
});
