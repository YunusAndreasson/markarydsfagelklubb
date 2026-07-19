import { type ReactElement, type ReactNode, type Ref } from 'react';
import { ScrollView, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

import { sharedStyles } from '@/constants/shared-styles';
import { useTheme } from '@/hooks/use-theme';

/**
 * The scrollable shell every tab and sub-screen renders. Owns the iOS
 * large-title auto-inset (`contentInsetAdjustmentBehavior="automatic"`), the
 * theme-aware background, and the standard `contentContainerStyle` — codified
 * so individual routes don't re-implement the same recipe.
 *
 * `inset="tab"` (default) uses 16px horizontal padding; `inset="sub"` uses 24px
 * (matches the wider sub-screen density used throughout settings).
 *
 * The `ScrollView` is the direct child of the route on purpose: iOS large-title
 * auto-inset and collapse-on-scroll only track a top-level scrollable. Do NOT
 * wrap this component in another container at the route root.
 */
export type ScreenProps = Omit<ScrollViewProps, 'contentContainerStyle'> & {
  ref?: Ref<ScrollView>;
  inset?: 'tab' | 'sub';
  refreshControl?: ReactElement;
  /**
   * Keep a focused input above the keyboard (iOS insets the scroll content for
   * it). Opt-in: only screens with text inputs need it. Leaving it ON for
   * input-less scroll screens (feed, detail, member, blocked) makes iOS stack a
   * persistent home-indicator-sized bottom inset on top of the tab-bar inset —
   * a large dead gap under the last row. Default OFF.
   */
  keyboardAware?: boolean;
  /**
   * Optional override that's merged on top of the default padding. Use for
   * one-off tweaks (e.g. a tighter top padding under a hero card).
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Screen({
  ref,
  inset = 'tab',
  refreshControl,
  keyboardAware = false,
  contentContainerStyle,
  style,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const base = inset === 'sub' ? sharedStyles.scrollContentInset : sharedStyles.scrollContent;
  return (
    <ScrollView
      ref={ref}
      style={[sharedStyles.flex, { backgroundColor: theme.background }, style]}
      contentInsetAdjustmentBehavior="automatic"
      // Keyboard handling only where there's an input to clear (see keyboardAware).
      automaticallyAdjustKeyboardInsets={keyboardAware}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[base, contentContainerStyle]}
      refreshControl={refreshControl}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
