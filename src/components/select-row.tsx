/**
 * The app's single-select list row — one grammar behind every picker sheet
 * (art · plats · aktivitet). An optional leading node (a rarity badge), a primary
 * label, an optional secondary line, and the trailing checkmark that marks the
 * current choice. Selection tints the label and fills the row with `muted`, so
 * "what's chosen" reads identically in all three pickers.
 *
 * Geometry and press feedback deliberately match {@link SettingsRow} — same
 * horizontal inset, same 52px floor, same `backgroundSelected` press tint — so a
 * radio row feels the same whether it's in Profil or in a report-form sheet.
 * `size="tall"` (64px) is for two-line rows like the species list.
 *
 * The select haptic fires here rather than through `PressableScale`'s `haptic`
 * prop, because these rows are used with `haptic={false}` call sites that
 * dismiss the sheet — firing before `onPress` keeps the tick from being cut off
 * by the dismissal.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CHECK, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';

export type SelectRowProps = {
  label: string;
  /** Second line under the label (scientific name, hint text). */
  secondary?: string;
  /** Lines the secondary text may wrap to. Defaults to 1. */
  secondaryLines?: number;
  /** Leading node — a `RarityBadge` in the species picker. */
  leading?: ReactNode;
  selected: boolean;
  onPress: () => void;
  /** `tall` (64px) for two-line rows; `default` (52px) elsewhere. */
  size?: 'default' | 'tall';
  /** Overrides the announced label when the visible one is abbreviated. */
  accessibilityLabel?: string;
};

export function SelectRow({
  label,
  secondary,
  secondaryLines = 1,
  leading,
  selected,
  onPress,
  size = 'default',
  accessibilityLabel,
}: SelectRowProps) {
  const theme = useTheme();
  return (
    <PressableScale
      variant="row"
      haptic={false}
      onPress={() => {
        hapticSelect();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      pressedBackgroundColor={theme.backgroundSelected}
      style={[
        styles.row,
        size === 'tall' && styles.tall,
        selected && { backgroundColor: theme.muted },
      ]}
    >
      {leading}
      <View style={styles.text}>
        <ThemedText
          type={secondary ? 'smallBold' : 'default'}
          themeColor={selected ? 'tint' : 'foreground'}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
        {secondary ? (
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={secondaryLines}>
            {secondary}
          </ThemedText>
        ) : null}
      </View>
      {selected ? <Icon name={CHECK} size={IconSize.control} color={theme.tint} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.sm,
  },
  tall: { minHeight: 64 },
  text: { flex: 1, gap: Spacing.half },
});
