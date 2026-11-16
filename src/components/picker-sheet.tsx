import { BottomSheet, Host, RNHostView } from '@expo/ui';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { CLOSE, Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing, SurfaceOverlay } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { sv } from '@/lib/i18n/sv';

const isIOS = Platform.OS === 'ios';

export type PickerSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Native sheet owns dragging, scrim, back handling and window safe areas.
 *
 * The `Host` is only an anchor for the natively presented sheet, so it is
 * unsized and `pointerEvents="none"` (as Expo UI's own BottomSheet wrapper does).
 * Never make it fill its parent: on iOS the SwiftUI hosting view ignores
 * `box-none` and swallowed every tap on the observation form (Art, Antal, Tid…),
 * because the closed time-picker sheet was mounted over the whole form.
 * Android keeps the full-size host (Compose passes `box-none` through, and Expo
 * UI's own Android wrapper fills too) — it never had the bug.
 */
export function PickerSheet({ visible, title, onClose, children }: PickerSheetProps) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const { height } = useWindowDimensions();
  return (
    <Host style={isIOS ? styles.anchor : StyleSheet.absoluteFill}
      pointerEvents={isIOS ? 'none' : 'box-none'}
      colorScheme={colorScheme} seedColor={theme.tint}>
      <BottomSheet isPresented={visible} onDismiss={onClose}
        containerColor={theme.card} contentColor={theme.foreground}
        scrimColor={SurfaceOverlay[colorScheme].scrim} contentPadding={0}>
        <RNHostView matchContents={{ vertical: true }} style={{ width: '100%' }}>
          <View style={[styles.content, { maxHeight: height * 0.85 }]}>
            <View style={styles.header}>
              <ThemedText type="heading" accessibilityRole="header">{title}</ThemedText>
              <PressableScale variant="icon" onPress={onClose}
                accessibilityRole="button" accessibilityLabel={sv.common.close}>
                <Icon name={CLOSE} size={IconSize.close} color={theme.foreground} />
              </PressableScale>
            </View>
            {children}
          </View>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
}

export type SheetActionRowProps = {
  icon: IconName;
  label: string;
  /** Tint the glyph + label destructive (e.g. "Dölj fynd från …"). */
  destructive?: boolean;
  onPress: () => void;
};

/**
 * A tappable action row for sheet menus — the shared chrome behind the image
 * chooser's rows and the report/block menu, so every action sheet reads the
 * same (glyph + label in a bordered row).
 */
export function SheetActionRow({ icon, label, destructive = false, onPress }: SheetActionRowProps) {
  const theme = useTheme();
  const color = destructive ? theme.destructive : theme.foreground;
  return (
    <PressableScale
      variant="row"
      haptic="select"
      onPress={onPress}
      style={[styles.actionRow, { borderColor: theme.border }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={IconSize.action} color={color} />
      <ThemedText type="default" style={{ color }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute' },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, minHeight: 48 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: SurfaceRadius.md, minHeight: 56,
  },
});
