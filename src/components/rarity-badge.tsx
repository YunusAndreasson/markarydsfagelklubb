/**
 * The MaFk larmlista "prefix" — a small color-coded chip holding the rarity
 * number (0–5, where 0 = rarest → 5 = most common). The same chip the Obsar card
 * and species picker glue in front of a bird's name; extracted here so the feed
 * filter can offer it as a selectable dimension. Geometry mirrors the card badge
 * so the prefix reads identically everywhere.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { rarityStyle, type RarityLevel } from '@/lib/rarity';

export function RarityBadge({ level }: { level: RarityLevel }) {
  const { colorScheme } = useThemeMode();
  const style = rarityStyle(level, colorScheme);
  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <ThemedText type="micro" style={[styles.num, { color: style.foreground }]}>
        {level}
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
  num: { fontWeight: '700' },
});
