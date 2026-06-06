import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'display'
    | 'eyebrow'
    | 'heading'
    | 'card'
    | 'micro';
  themeColor?: ThemeColor;
};

// Honor Dynamic Type, but cap how far text scales so dense layouts don't break.
// Large display text (title/subtitle/display/card) is capped tighter than body copy.
const MAX_SCALE: Record<NonNullable<ThemedTextProps['type']>, number> = {
  default: 1.6,
  small: 1.6,
  smallBold: 1.6,
  link: 1.6,
  linkPrimary: 1.6,
  code: 1.5,
  title: 1.3,
  subtitle: 1.3,
  display: 1.2,
  eyebrow: 1.3,
  heading: 1.3,
  card: 1.3,
  micro: 1.5,
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={MAX_SCALE[type]}
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        // Brand-colored link — applied here (not in the static StyleSheet) so it
        // resolves from the active theme and adapts to light/dark.
        type === 'linkPrimary' && { color: theme.primary },
        type === 'code' && styles.code,
        type === 'display' && styles.display,
        type === 'eyebrow' && styles.eyebrow,
        type === 'heading' && styles.heading,
        type === 'card' && styles.card,
        type === 'micro' && styles.micro,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
    letterSpacing: 0,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  display: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: 700,
    letterSpacing: 0,
  },
  eyebrow: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 600,
  },
  // A panel title — the headline of a card. Fills the 16→32 gap so a card's
  // title clearly out-ranks the 14px caption it used to sit a font-weight apart
  // from, while staying well under the big display numbers above it.
  heading: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: 700,
    letterSpacing: 0,
  },
  card: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 600,
    letterSpacing: 0,
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 500,
  },
});
