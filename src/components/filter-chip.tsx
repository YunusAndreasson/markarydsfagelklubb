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
import { HitSlop } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
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
      // A pill reads best at 36pt but must be tappable at 44. `variant="button"`
      // carries no slop of its own, so this row of chips was the one place in the
      // app under the minimum. 4pt on each side lands exactly on 44 and exactly
      // fills the 8pt gap between chips — adjacent targets touch, never overlap,
      // so no chip can steal its neighbour's tap.
      hitSlop={HitSlop.dense}
      style={[styles.pill, { backgroundColor: fill }]}
    >
      {leading}
      {/* `flexShrink` is load-bearing, not defensive. In the filter sheet these
          pills live in a `flexWrap` row, and wrapping can only move a chip to the
          next line — it can never make one narrower than its own text. The club's
          longest lokal ("Hannabadsåsens naturreservat") already fills most of a
          360dp sheet at the default type size, and at large Dynamic Type it ran
          straight off the right edge, taking its count with it. Shrinking lets
          the chip cap at the container and ellipsize; the untruncated name is
          still spoken via `accessibilityLabel`. */}
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        style={[styles.label, { color: textColor }]}
      >
        {label}
      </ThemedText>
      {count != null ? (
        <ThemedText type="small" numberOfLines={1} style={{ color: subColor }}>
          {`· ${count}`}
        </ThemedText>
      ) : null}
      {removable ? <Icon name={CLOSE} size={IconSize.chipClose} color={textColor} /> : null}
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
    // Cap at the container so a long label ellipsizes instead of overflowing it.
    // Harmless in the feed's horizontal scroller, where chips are never clamped.
    maxWidth: '100%',
  },
  // Only the label yields; the count and ✕ keep their full width so the chip
  // never loses the parts that say what it does.
  label: { flexShrink: 1 },
});
