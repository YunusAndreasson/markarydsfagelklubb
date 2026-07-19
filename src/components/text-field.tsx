import { useEffect, useRef, useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FieldLabel } from '@/components/field-label';
import { ThemedText } from '@/components/themed-text';
import { Duration } from '@/constants/motion';
import { SurfaceStyles } from '@/constants/surface';
import { FontSize, Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { hapticError } from '@/lib/haptics';

export type TextFieldProps = TextInputProps & {
  ref?: Ref<TextInput>;
  label: string;
  /** Mark the field optional — appends a muted "(valfritt)" to the label. */
  optional?: boolean;
  /**
   * Inline error message rendered below the input. When set, the border switches
   * to the destructive tint and the reason is announced to screen readers via the
   * input's `accessibilityHint`.
   */
  error?: string | null;
};

/**
 * Themed labelled text input. Styling tracks the active theme so it reads the
 * same as the rest of the app (and never flashes the wrong palette in dark mode).
 * Focus and error states are anchored on the input border (1.5px to telegraph
 * the state change without a layout shift, since the resting border is 1px).
 */
export function TextField({
  ref,
  label,
  optional,
  style,
  error,
  onFocus,
  onBlur,
  accessibilityHint,
  clearButtonMode,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const { motion } = useMotion();
  const [focused, setFocused] = useState(false);

  // Buzz once when the field enters an error state (not on every re-render while
  // the error persists) — validation failure is exactly hapticError's job.
  const prevErrorRef = useRef<string | null | undefined>(error);
  useEffect(() => {
    if (error && !prevErrorRef.current) hapticError();
    prevErrorRef.current = error;
  }, [error]);

  const borderColor = error ? theme.destructive : focused ? theme.tint : theme.border;
  const borderWidth = error || focused ? 1.5 : 1;

  return (
    <View style={styles.container}>
      <FieldLabel label={label} optional={optional} />
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        // Honor Dynamic Type but cap it like the app's body text (ThemedText
        // `default` = 1.6) so the input never outgrows its fixed-height surface.
        // Overridable: callers can pass their own multiplier via `rest`.
        maxFontSizeMultiplier={1.6}
        // When the field is invalid, the error reason is read out as the hint so
        // VoiceOver announces *why*, not just "invalid".
        accessibilityHint={error ?? accessibilityHint}
        accessibilityState={{ disabled: rest.editable === false }}
        aria-invalid={!!error}
        clearButtonMode={clearButtonMode ?? 'while-editing'}
        placeholderTextColor={theme.mutedForeground}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: theme.foreground,
            backgroundColor: theme.card,
            borderColor,
            borderWidth,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        // Fade/slide the message in rather than hard-popping it (and snapping the
        // layout below) — matches the app's animate-state-changes feel. The
        // hapticError above fires in the same beat.
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
  input: {
    ...SurfaceStyles.inputSurface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    // TextInput needs a concrete fontSize (not a Text component, so ThemedText
    // types don't apply).
    fontSize: FontSize.input,
    minHeight: 52,
  },
});
