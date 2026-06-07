/**
 * Grouped settings card — the Linear/Notion "section label + one bordered card of
 * rows" grammar. The label + optional caption above the card use the shared
 * `SectionHeader`; the card is a hairline-bordered surface whose rows are split by
 * hairline dividers; an optional footer caption sits beneath.
 *
 * Ported from the edenmind reference so the whole app shares one settings idiom.
 */
import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { listEntrance } from '@/lib/motion';

export type SettingsGroupProps = {
  /** Section label rendered above the card (sentence-case). */
  title?: string;
  /** Short caption between the title and the card — sets context. */
  caption?: string;
  /** Footer caption beneath the card — long-form context. */
  footer?: string;
  /** Position in a multi-group screen. When set, the group cascades in (tight
   *  stagger) on mount — opt-in, so single-group screens stay still. */
  entranceIndex?: number;
  children: ReactNode;
};

export function SettingsGroup({ title, caption, footer, entranceIndex, children }: SettingsGroupProps) {
  const theme = useTheme();
  const { motion } = useMotion();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <Animated.View
      style={styles.section}
      entering={
        entranceIndex === undefined ? undefined : motion(listEntrance(entranceIndex, 'tight'))
      }
    >
      {title ? <SectionHeader title={title} caption={caption} /> : null}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {items.map((child, index) => (
          <View
            key={index}
            style={
              index > 0
                ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                : undefined
            }
          >
            {child}
          </View>
        ))}
      </View>

      {footer ? (
        <ThemedText type="small" themeColor="mutedForeground" style={styles.footer}>
          {footer}
        </ThemedText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  card: { ...SurfaceStyles.flatGroup },
  footer: { marginHorizontal: Spacing.one },
});
