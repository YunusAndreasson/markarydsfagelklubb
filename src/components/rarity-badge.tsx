/**
 * The MaFk larmlista "prefix" — a small color-coded chip holding the rarity
 * number (0–5, where 0 = rarest → 5 = most common). The single implementation
 * behind the Obsar card, the observation detail (`size="lg"`), the species
 * picker, and the feed filter, so the prefix reads identically everywhere.
 *
 * `custom` bypasses the rarity scale for the picker's pinned specials (the red
 * "0" on Olistad art, the neutral "–" on Övrigt) while keeping the geometry.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { rarityStyle, type RarityLevel } from '@/lib/rarity';

export type RarityBadgeCustom = { label: string; background: string; foreground: string };

export type RarityBadgeProps = {
  /** `sm` (20px, micro) is the default chip; `lg` (26px, small) suits title rows. */
  size?: 'sm' | 'lg';
} & ({ level: RarityLevel; custom?: never } | { level?: never; custom: RarityBadgeCustom });

export function RarityBadge({ level, size = 'sm', custom }: RarityBadgeProps) {
  const { colorScheme } = useThemeMode();
  const style = custom ?? (level != null ? rarityStyle(level, colorScheme) : null);
  if (!style) return null;
  return (
    <View
      style={[size === 'lg' ? styles.badgeLg : styles.badge, { backgroundColor: style.background }]}
    >
      <ThemedText
        type={size === 'lg' ? 'small' : 'micro'}
        style={[styles.num, { color: style.foreground }]}
      >
        {custom ? custom.label : level}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: SurfaceRadius.xs,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLg: {
    minWidth: 26,
    height: 26,
    borderRadius: SurfaceRadius.xs,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontWeight: '700' },
});
