/**
 * The app's bottom-anchored picker sheet — a themed wrapper over the native RN
 * `Modal` (no `@gorhom/bottom-sheet`, matching `confirm-sheet.tsx` and the
 * edenmind reference).
 *
 * Motion: `animationType="fade"` so the **scrim fades** in/out (the stock `slide`
 * dragged the opaque backdrop up with the card and read as janky), and the card
 * additionally **springs up + fades** via a Reanimated `entering` — a native sheet
 * feel without the backdrop sliding. The Modal owns the exit timing, so no
 * keep-mounted state machine is needed. A grabber sits on top as the native "this
 * is a sheet" signifier; dismissal is scrim-tap / back / the close button.
 *
 * The card is height-driven up to `maxHeight: 85%`; a `FlatList`/`ScrollView`
 * child then scrolls within the clamped card.
 */
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLOSE, Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spring } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing, SurfaceOverlay } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { sv } from '@/lib/i18n/sv';

export type PickerSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function PickerSheet({ visible, title, onClose, children }: PickerSheetProps) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const insets = useSafeAreaInsets();
  const { motion } = useMotion();

  return (
    // The app is edge-to-edge (`edgeToEdgeEnabled`), so `insets.bottom` below is
    // the nav-bar height. Both *Translucent flags make the modal's own window draw
    // under the system bars too — without `navigationBarTranslucent` the window
    // stops at the top of the nav bar, and the card's `insets.bottom` padding then
    // stacks on top of it as a redundant dead band at the bottom.
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Keyboard avoidance for the bottom-anchored card. A native `Modal` gets its
          own window that does NOT honor the Activity's `adjustResize`, so the sheet
          handles the keyboard itself — Android shrinks the container so the
          flex-end card rises above the keyboard; iOS lets the scrollable bodies
          inset themselves (the app's `Screen` pattern). */}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'android' ? 'height' : undefined}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: SurfaceOverlay[colorScheme].scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={sv.common.close}
        />
        <Animated.View
          entering={motion(
            FadeInUp.springify()
              .damping(Spring.snappy.damping)
              .stiffness(Spring.snappy.stiffness)
              .mass(Spring.snappy.mass),
          )}
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}
        >
          {/* Grabber — the native "this is a sheet" signifier. */}
          <View style={styles.grabberArea} accessible={false}>
            <View style={[styles.grabber, { backgroundColor: theme.mutedForeground }]} />
          </View>
          <View style={styles.header}>
            <ThemedText type="card">{title}</ThemedText>
            <PressableScale
              variant="icon"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={sv.common.close}
            >
              <Icon name={CLOSE} size={IconSize.close} color={theme.foreground} />
            </PressableScale>
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SurfaceRadius.md,
    minHeight: 56,
  },
  card: {
    maxHeight: '85%',
    borderTopLeftRadius: SurfaceRadius.lg,
    borderTopRightRadius: SurfaceRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    gap: Spacing.two,
  },
  grabberArea: {
    alignItems: 'center',
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
