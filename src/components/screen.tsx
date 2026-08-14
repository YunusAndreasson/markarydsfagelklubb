import { type ReactElement, type ReactNode, type Ref } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sharedStyles } from '@/constants/shared-styles';
import { Spacing } from '@/constants/theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
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
  /**
   * Turn on pull-to-refresh. Pass the screen's refetch (`query.refetch`, or a
   * `() => Promise.all([...])` for several) — `Screen` owns the gesture state and
   * the themed spinner, so every list refreshes with the same feel and the same
   * failure toast. Prefer this over building a `refreshControl` by hand.
   */
  refresh?: () => Promise<unknown>;
  /** Escape hatch for a non-standard control; `refresh` covers the normal case. */
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
   * Add the device's bottom safe-area inset to the content padding.
   *
   * Turn this on for screens with NO tab bar under them — pushed sub-screens and
   * modals. There the scroller runs to the window edge, and the fixed 24px
   * bottom padding is entirely swallowed by Android's gesture pill: the last row
   * (often a 44pt tap target, like the observer footer) ends up sitting right on
   * it. Tab roots must leave this OFF — the tab bar already occupies that space,
   * so adding the inset there just opens a dead gap under the last row.
   */
  bottomInset?: boolean;
  /**
   * Optional override that's merged on top of the default padding. Use for
   * one-off tweaks (e.g. a tighter top padding under a hero card).
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Stable stand-in so the refresh hook can run unconditionally (rules of hooks). */
const NO_REFRESH = () => Promise.resolve();

export function Screen({
  ref,
  inset = 'tab',
  refresh,
  refreshControl,
  keyboardAware = false,
  bottomInset = false,
  contentContainerStyle,
  style,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const base = inset === 'sub' ? sharedStyles.scrollContentInset : sharedStyles.scrollContent;
  // Added to (not replacing) the base padding, so the last row clears the
  // gesture pill instead of resting on it.
  //
  // ANDROID ONLY on purpose: this is a fix for Android's gesture pill eating the
  // fixed 24px. On iOS `contentInsetAdjustmentBehavior="automatic"` already
  // insets scroll content for the home indicator, so adding it again would
  // double up into a visible dead gap under the last row.
  const safeBottom =
    bottomInset && Platform.OS === 'android'
      ? { paddingBottom: Spacing.four + insets.bottom }
      : null;

  // Always called; inert until a `refresh` is supplied.
  const { refreshing, onRefresh } = usePullToRefresh(refresh ?? NO_REFRESH);
  const control =
    refreshControl ??
    (refresh ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        // tintColor drives the iOS spinner; colors + progressBackgroundColor are
        // the Android pair — without them Android shows the stock palette.
        tintColor={theme.primary}
        colors={[theme.primary]}
        progressBackgroundColor={theme.card}
      />
    ) : undefined);

  return (
    <ScrollView
      ref={ref}
      style={[sharedStyles.flex, { backgroundColor: theme.background }, style]}
      contentInsetAdjustmentBehavior="automatic"
      // Keyboard handling only where there's an input to clear (see keyboardAware).
      automaticallyAdjustKeyboardInsets={keyboardAware}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[base, safeBottom, contentContainerStyle]}
      refreshControl={control}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
