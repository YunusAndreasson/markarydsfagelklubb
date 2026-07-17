/**
 * Borderless labeled input that lives *inside* a `SettingsGroup` card — the card
 * owns the chrome (rounded surface, hairline, separators), this row contributes a
 * small label, the raw `TextInput`, and an optional inline error caption. Card-in-
 * card stacking is what the grouped-settings refresh avoids, so the chrome-carrying
 * `TextField` is deliberately not used here.
 *
 * Ported from the edenmind reference; `error` support added for inline (autosave)
 * validation feedback.
 */
import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SettingsFormInputProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export const SettingsFormInput = forwardRef<TextInput, SettingsFormInputProps>(
  function SettingsFormInput({ label, error, style, ...rest }, ref) {
    const theme = useTheme();

    return (
      <View style={styles.row}>
        <ThemedText
          type="small"
          style={{ color: error ? theme.destructive : theme.mutedForeground }}
        >
          {label}
        </ThemedText>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.mutedForeground}
          // Cap Dynamic Type like the app's body inputs so the row keeps its rhythm.
          maxFontSizeMultiplier={1.6}
          style={[styles.input, { color: theme.foreground }, style]}
          {...rest}
        />
        {error ? (
          <Animated.View entering={FadeInDown.duration(160)}>
            <ThemedText type="small" style={{ color: theme.destructive }}>
              {error}
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
    minHeight: 52,
  },
  // TextInput needs a concrete fontSize — ThemedText types can't apply.
  input: { fontSize: FontSize.input, lineHeight: 22, padding: 0 },
});
