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
import { type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Duration } from '@/constants/motion';
import { FontSize, Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

export type SettingsSaveState = 'saving' | 'saved' | 'error';

export type SettingsFormInputProps = TextInputProps & {
  ref?: Ref<TextInputInstance>;
  label: string;
  error?: string | null;
  saveState?: SettingsSaveState;
};

export function SettingsFormInput({ ref, label, error, saveState, style, ...rest }: SettingsFormInputProps) {
  const theme = useTheme();
  // Gated like every other inline-error entrance in the app (`picker-field`,
  // `text-field`) — this one had drifted off both the token and the gate.
  const { motion } = useMotion();

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <ThemedText
          type="small"
          style={[styles.label, { color: error ? theme.destructive : theme.mutedForeground }]}
        >
          {label}
        </ThemedText>
        {saveState ? (
          <ThemedText type="micro" themeColor={saveState === 'error' ? 'destructive' : saveState === 'saved' ? 'tint' : 'mutedForeground'}>
            {saveState === 'saving' ? sv.profile.saving : saveState === 'saved' ? sv.profile.savedLabel : sv.profile.unsavedLabel}
          </ThemedText>
        ) : null}
      </View>
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
        <Animated.View entering={motion(FadeInDown.duration(Duration.quick))}>
          <ThemedText type="small" style={{ color: theme.destructive }}>
            {error}
          </ThemedText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { flex: 1 },
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
