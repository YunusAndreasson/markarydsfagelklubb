import { Host } from '@expo/ui';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { hapticSelect } from '@/lib/haptics';

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: string;
};
export type SegmentedPickerProps<T extends string | number> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
};

/** Native selection control; values stay typed even when labels coincide. */
export function SegmentedPicker<T extends string | number>({
  options, value, onChange, ariaLabel,
}: SegmentedPickerProps<T>) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const selectedIndex = options.findIndex((option) => option.value === value);
  function select(index: number) {
    const next = options[index];
    if (!next || next.value === value) return;
    hapticSelect();
    onChange(next.value);
  }
  // The community adapter exposes a fill but not its contrasting label color.
  // Use Compose directly to keep both halves of the token pair together.
  if (Platform.OS === 'android') {
    return (
      <Host matchContents={{ vertical: true }} colorScheme={colorScheme} seedColor={theme.tint} style={styles.target}>
        <SingleChoiceSegmentedButtonRow modifiers={[
          fillMaxWidth(), ...(ariaLabel ? [semantics({ contentDescription: ariaLabel })] : []),
        ]}>
          {options.map((option, index) => (
            <SegmentedButton key={option.value} selected={option.value === value} onClick={() => select(index)}
              colors={{ activeContainerColor: theme.backgroundSelected, activeContentColor: theme.foreground,
                inactiveContainerColor: theme.card, inactiveContentColor: theme.foreground,
                activeBorderColor: theme.border, inactiveBorderColor: theme.border }}>
              <SegmentedButton.Label><Text>{option.label}</Text></SegmentedButton.Label>
            </SegmentedButton>
          ))}
        </SingleChoiceSegmentedButtonRow>
      </Host>
    );
  }
  return (
    <View style={styles.target}>
      <SegmentedControl values={options.map((option) => option.label)}
        selectedIndex={selectedIndex} accessibilityLabel={ariaLabel}
        appearance={colorScheme} style={styles.control}
        onChange={({ nativeEvent }) => select(nativeEvent.selectedSegmentIndex)} />
    </View>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: 48, justifyContent: 'center' },
  control: { minHeight: 44 },
});
