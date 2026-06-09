/**
 * An interactive filter pill — the press-target counterpart to the display-only
 * `Badge`. Two modes:
 *   • selectable (the filter sheet): `selected` toggles a tinted (brand) fill vs a
 *     quiet secondary fill; an optional trailing `count` shows how many obs carry it.
 *   • removable (the feed's active-filter row): pass `onRemove` to get a trailing ✕;
 *     the whole chip is the remove target.
 * Pill geometry mirrors `Badge` (rounded-pill, token spacing) but with a press
 * target ≥ the row's tap minimum.
 */
import { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { CLOSE, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FilterChipProps = {
  label: string;
  /** Selectable mode: tinted fill when true. */
  selected?: boolean;
  /** Optional trailing count, e.g. "· 3". */
  count?: number;
  /** Optional leading element (e.g. the rarity prefix badge). */
  leading?: ReactNode;
  onPress?: () => void;
  /** Removable mode: shows a trailing ✕ and makes the chip a remove target. */
  onRemove?: () => void;
  accessibilityLabel?: string;
};

export function FilterChip({
  label,
  selected = false,
  count,
  leading,
  onPress,
  onRemove,
  accessibilityLabel,
}: FilterChipProps) {
  const theme = useTheme();
  const removable = onRemove != null;

  const fill = selected ? theme.primary : theme.secondary;
  const textColor = selected ? theme.badgeForeground : theme.secondaryForeground;
  const subColor = selected ? theme.badgeForeground : theme.mutedForeground;

  return (
    <PressableScale
      variant="button"
      haptic="select"
      onPress={onRemove ?? onPress}
      accessibilityRole={removable ? 'button' : 'checkbox'}
      accessibilityState={removable ? undefined : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, { backgroundColor: fill }]}
    >
      {leading}
      <ThemedText type="smallBold" numberOfLines={1} style={{ color: textColor }}>
        {label}
      </ThemedText>
      {count != null ? (
        <ThemedText type="small" numberOfLines={1} style={{ color: subColor }}>
          {`· ${count}`}
        </ThemedText>
      ) : null}
      {removable ? <Icon name={CLOSE} size={14} color={textColor} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.pill,
  },
});
