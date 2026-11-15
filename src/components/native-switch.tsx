import { Host, Switch } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';

export function NativeSwitch({ label, value, onValueChange, disabled }: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  return (
    <Host matchContents colorScheme={colorScheme} seedColor={theme.tint}>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled}
        modifiers={Platform.OS === 'android'
          ? [semantics({ contentDescription: label })]
          : [accessibilityLabel(label)]} />
    </Host>
  );
}
