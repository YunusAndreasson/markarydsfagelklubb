/**
 * The one section-header grammar for the app: a sentence-case label with an
 * optional one-line caption beneath it — the Linear "Section name + what it's
 * for" pattern. Every section label — tab roots, grouped settings, detail
 * screens — should compose this so the app shares one visual grammar.
 *
 * Pure presentational (no hooks / shared values): safe to render inside a
 * Reanimated `Animated.View` entering wrapper and clean under React Compiler.
 */
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type SectionHeaderProps = {
  /** Section label, sentence-case. */
  title: string;
  /** Optional muted context line beneath the title, sentence-case. */
  caption?: string;
  /**
   * Where this label sits in the type ladder:
   *  • `card` (19/700): titles a panel/card — the headline above its caption and
   *    contents.
   *  • undefined (14/700): the compact label — dense lists / settings.
   */
  level?: 'card';
  /**
   * Container override. The label aligns to the screen content column by default;
   * pass `{ marginHorizontal }` to nudge it (e.g. to a card's own inner padding).
   */
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, caption, level, style }: SectionHeaderProps) {
  const titleType = level === 'card' ? 'heading' : 'smallBold';
  return (
    <View style={[styles.header, style]}>
      <ThemedText type={titleType} themeColor="foreground" accessibilityRole="header">
        {title}
      </ThemedText>
      {caption ? (
        <ThemedText type="small" themeColor="mutedForeground">
          {caption}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // No horizontal inset: the label aligns to the screen's content column (and the
  // card/field/button left edge) so section headers line up with the controls they
  // group. (Callers can still pass `style` to nudge it inside a card's own padding.)
  header: { gap: Spacing.one },
});
