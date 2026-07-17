/**
 * The app's bottom-anchored picker sheet — a themed wrapper over the native RN
 * `Modal` (no `@gorhom/bottom-sheet`, matching `observation-map.tsx` and the
 * edenmind reference). It slides up from the bottom, dims the backdrop (tap to
 * dismiss), and gives the body a card surface with rounded top corners and a
 * header (title + close). The caller owns the body — the species picker fills it
 * with a search field + `FlatList`, the activity picker with a short option list.
 *
 * The card is height-driven up to `maxHeight: 85%`; a `FlatList` child with
 * `flex: 1` then scrolls within the clamped card.
 */
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLOSE, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing, SurfaceOverlay } from '@/constants/theme';
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

  return (
    // The app is edge-to-edge (`edgeToEdgeEnabled`), so `insets.bottom` below is
    // the nav-bar height. Both *Translucent flags make the modal's own window
    // draw under the system bars too — without `navigationBarTranslucent` the
    // window stops at the top of the nav bar, and the card's `insets.bottom`
    // padding then stacks on top of it as a redundant dead band at the bottom.
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Keyboard avoidance for the bottom-anchored card. A native `Modal` gets
          its own window that does NOT honor the Activity's `adjustResize`, so the
          sheet handles the keyboard itself — but per platform:
          • Android: `behavior="height"` shrinks the container so the flex-end card
            rises above the keyboard.
          • iOS: NO behavior. The old `padding` left a large dark band at the
            bottom — an in-`Modal` KeyboardAvoidingView keeps a residual bottom
            inset after the keyboard hides, exposing the backdrop below the card.
            Instead the scrollable bodies (species `FlatList`, etc.) use
            `automaticallyAdjustKeyboardInsets` (the app's `Screen` pattern), which
            insets the list under the keyboard without lifting the whole card. */}
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
        <ThemedView
          style={[styles.card, { borderColor: theme.border, paddingBottom: insets.bottom + Spacing.three }]}
        >
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
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  card: {
    maxHeight: '85%',
    borderTopLeftRadius: SurfaceRadius.lg,
    borderTopRightRadius: SurfaceRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
