import { forwardRef, type ReactElement, type ReactNode } from 'react';
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
  inset?: 'tab' | 'sub';
  refreshControl?: ReactElement;
  /**
   * Optional override that's merged on top of the default padding. Use for
   * one-off tweaks (e.g. a tighter top padding under a hero card).
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const Screen = forwardRef<ScrollView, ScreenProps>(function Screen(
  { inset = 'tab', refreshControl, contentContainerStyle, style, children, ...rest },
  ref,
) {
  const theme = useTheme();
  const base = inset === 'sub' ? sharedStyles.scrollContentInset : sharedStyles.scrollContent;
  return (
    <ScrollView
      ref={ref}
      style={[sharedStyles.flex, { backgroundColor: theme.background }, style]}
      contentInsetAdjustmentBehavior="automatic"
      // Keep a focused input (comment, profile name/phone) above the keyboard:
      // iOS insets the scroll content for the keyboard automatically; both
      // platforms dismiss on drag and let taps through while it's open.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[base, contentContainerStyle]}
      refreshControl={refreshControl}
      {...rest}
    >
      {children}
    </ScrollView>
  );
});
