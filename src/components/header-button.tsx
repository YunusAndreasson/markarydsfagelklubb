/**
 * A text action for the native navigation bar — the iOS/Android convention for a
 * screen's primary ("Spara") or secondary ("Redigera") action,
 * instead of a button injected into the scroll content. Tinted brand text, a
 * spinner while busy, dimmed when disabled. Pass via a screen's
 * `Stack.Screen options={{ headerRight: () => <HeaderButton … /> }}`.
 */
import { ActivityIndicator, StyleSheet } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HeaderButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function HeaderButton({ title, onPress, loading, disabled }: HeaderButtonProps) {
  const theme = useTheme();
  // Horizontal padding so the label isn't flush against the screen edge in the
  // native header (the bar item hugs its content tightly).
  if (loading) return <ActivityIndicator color={theme.tint} style={styles.button} />;
  return (
    <PressableScale
      variant="link"
      haptic={false}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={styles.button}
    >
      <ThemedText
        type="smallBold"
        themeColor="tint"
        numberOfLines={1}
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        {title}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
});
