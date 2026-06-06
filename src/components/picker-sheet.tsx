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
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLOSE, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

export type PickerSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function PickerSheet({ visible, title, onClose, children }: PickerSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
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
              <Icon name={CLOSE} size={20} color={theme.foreground} />
            </PressableScale>
          </View>
          {children}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
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
