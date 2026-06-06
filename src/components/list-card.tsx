/**
 * The recurring list-row card pattern, unified. Slots-based so each call site
 * composes the row it actually needs without forking the geometry:
 *
 *   <ListCard title="Steglits" metadata="3 · Förbiflygande" onPress={...} />
 *
 *   <ListCard
 *     title="Sjöfågeltornet"
 *     density="compact"
 *     trailing={<ThemedText themeColor="mutedForeground">Sparad</ThemedText>}
 *     onPress={...}
 *   />
 *
 * The trailing chevron renders automatically when `onPress` is set and no
 * `trailing` slot is provided (toggle with `hideChevron`).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CHEVRON, Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListCardDensity = 'comfortable' | 'compact';

export type ListCardProps = {
  title: string;
  /** Compact secondary line — bold-ish body weight. Rare on this row pattern;
   *  most rows use `metadata` for the muted secondary line instead. */
  subtitle?: string;
  /** Muted secondary line — counts, status, "3 · Förbiflygande" style. */
  metadata?: string;
  /** Right-aligned accessory ON the metadata line (e.g. a badge). Unlike
   *  `trailing` (a full-height side column that eats title width and suppresses
   *  the chevron), this rides the muted line, so the title keeps the full width. */
  metaTrailing?: ReactNode;
  /** Leading slot — icon, avatar, leading badge. */
  leading?: ReactNode;
  /** Trailing slot — status tag, action button. Suppresses the auto chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Hide the auto chevron even when `onPress` is set. */
  hideChevron?: boolean;
  /** Row density preset. `comfortable` (64 min-h) for primary lists; `compact`
   *  (52 min-h) for dense catalog rows. Default `comfortable`. */
  density?: ListCardDensity;
  accessibilityLabel?: string;
};

export function ListCard({
  title,
  subtitle,
  metadata,
  metaTrailing,
  leading,
  trailing,
  onPress,
  onLongPress,
  hideChevron,
  density = 'comfortable',
  accessibilityLabel,
}: ListCardProps) {
  const theme = useTheme();
  const compact = density === 'compact';
  const showChevron = !trailing && !hideChevron && !!onPress;

  return (
    <PressableScale
      variant="card"
      pressedBackgroundColor={theme.backgroundSelected}
      restingBackgroundColor={theme.card}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        compact ? styles.cardCompact : styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <ThemedText type="default" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="smallBold" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
        {metadata || metaTrailing ? (
          <View style={styles.metaRow}>
            {metadata ? (
              <ThemedText
                type="small"
                themeColor="mutedForeground"
                numberOfLines={1}
                style={styles.metaText}
              >
                {metadata}
              </ThemedText>
            ) : null}
            {metaTrailing ? <View style={styles.metaTrailing}>{metaTrailing}</View> : null}
          </View>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {showChevron ? <Icon name={CHEVRON} size={22} color={theme.mutedForeground} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    ...SurfaceStyles.raisedCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 64,
  },
  cardCompact: {
    ...SurfaceStyles.raisedCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
  },
  leading: { flexShrink: 0 },
  body: { flex: 1, gap: Spacing.half },
  trailing: { flexShrink: 0 },
  // Metadata line that can carry a right-aligned accessory (e.g. a badge):
  // the muted text takes the slack and the accessory keeps its size on the right.
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  metaText: { flex: 1 },
  metaTrailing: { flexShrink: 0 },
});
