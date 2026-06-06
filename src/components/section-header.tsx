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
   * Container override. The default carries a small horizontal inset so the
   * label aligns with card edges when it floats over the screen background; pass
   * `{ marginHorizontal: 0 }` when rendering inside a card's own padding.
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
  header: { gap: Spacing.half, marginHorizontal: Spacing.one },
});
