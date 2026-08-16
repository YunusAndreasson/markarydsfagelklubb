/**
 * A labelled trigger row for the modal-backed pickers (species, activity,
 * datetime). It reads like a `TextField` — same label style, same border-state
 * vocabulary (resting → focus-less → `destructive` when invalid, 1.5px to
 * telegraph the state without a layout shift) — but instead of editing inline it
 * shows the current selection (or a muted placeholder) and a trailing chevron,
 * and opens its sheet on press. The inline error mirrors `TextField`: a single
 * `hapticError` when the field enters an error/invalid state, faded in.
 */
import { type ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FieldLabel } from '@/components/field-label';
import { CHEVRON, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Duration } from '@/constants/motion';
import { SurfaceStyles } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { hapticError } from '@/lib/haptics';

export type PickerFieldProps = {
  label: string;
  /** The selected value's display text. Null/empty → the placeholder shows. */
  value?: string | null;
  placeholder: string;
  invalid?: boolean;
  error?: string | null;
  onPress: () => void;
  /** Optional leading glyph (e.g. a clock on the datetime field). */
  leading?: ReactNode;
  /**
   * Make the trigger inert (and dim it). Set while the hosting form is
   * committing: every picker is a PUSHED route, so a tap here during an in-flight
   * save opened a sheet that the mutation's own `router.back()` then dismissed —
   * closing the picker instead of the form, and leaving a committed report on a
   * still-open composer that invited a second submit.
   */
  disabled?: boolean;
};

export function PickerField({
  label,
  value,
  placeholder,
  invalid,
  error,
  onPress,
  leading,
  disabled,
}: PickerFieldProps) {
  const theme = useTheme();
  const { motion } = useMotion();

  // Buzz once when the field enters an error/invalid state (not on every re-render
  // while it persists) — same beat as TextField.
  const bad = !!error || !!invalid;
  const prevBadRef = useRef(bad);
  useEffect(() => {
    if (bad && !prevBadRef.current) hapticError();
    prevBadRef.current = bad;
  }, [bad]);

  const borderColor = bad ? theme.destructive : theme.border;
  const borderWidth = bad ? 1.5 : 1;

  return (
    <View style={styles.container}>
      <FieldLabel label={label} />
      <PressableScale
        variant="row"
        onPress={onPress}
        disabled={disabled}
        // Via the prop, not `style` — `row` is a scale variant whose animated
        // style writes `opacity` last (see PressableScale).
        dimmed={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? placeholder }}
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.trigger, { backgroundColor: theme.card, borderColor, borderWidth }]}
      >
        {leading}
        <ThemedText
          type="default"
          themeColor={value ? 'foreground' : 'mutedForeground'}
          numberOfLines={1}
          style={styles.value}
        >
          {value || placeholder}
        </ThemedText>
        <Icon name={CHEVRON} size={IconSize.control} color={theme.mutedForeground} />
      </PressableScale>
      {error ? (
        <Animated.View entering={motion(FadeInDown.duration(Duration.quick))}>
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  trigger: {
    ...SurfaceStyles.inputSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 52,
  },
  value: { flex: 1 },
});
