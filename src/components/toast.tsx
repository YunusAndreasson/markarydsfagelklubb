/**
 * The app's transient confirmation — a single top-anchored snackbar that closes
 * the feedback loop after an action commits (report saved, profile updated,
 * observation deleted). Replaces scattered inline "Sparad."/"Kunde inte spara"
 * lines with one consistent surface, the way Linear/Notion/Spotify confirm an
 * action without a blocking dialog.
 *
 * `showToast` is an imperative, render-free trigger: safe to call from anywhere,
 * including mutation `onSuccess`/`onError` callbacks that fire *after* the screen
 * that started the action has unmounted (e.g. a report navigates to Obsar, then
 * the insert resolves). It is a no-op until a single `<ToastHost/>` is mounted at
 * the app root. Haptics stay with the caller (the mutation already buzzes) — the
 * toast is purely visual.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALERT, BOUNCE_ONCE, CHECK, Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Curve, Duration } from '@/constants/motion';
import { SurfaceStyles } from '@/constants/surface';
import { IconSize, Spacing, MaxContentWidth } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';

export type ToastTone = 'success' | 'error' | 'info';

type ToastPayload = { id: number; message: string; tone: ToastTone };

/**
 * The visible toast plus whether it has been asked to leave. They share one
 * object because `useSyncExternalStore` reads a single snapshot — and keeping
 * the pair atomic means "new toast" and "not closing" can only ever be observed
 * together, which is what lets a fresh toast interrupt a pending exit.
 */
type ToastState = { toast: ToastPayload | null; closing: boolean };

const EMPTY: ToastState = { toast: null, closing: false };

// A module store, mirroring `lib/feed-filter-store.ts`. `showToast` is called
// from mutation callbacks that outlive the screen that started them, so the
// state cannot belong to any screen — and the host reads it through
// `useSyncExternalStore` rather than an effect+setState subscription, which is
// what keeps the read tear-free under concurrent rendering.
let state: ToastState = EMPTY;
const listeners = new Set<() => void>();

// A monotonic counter (not Date.now) keys successive toasts so a late-firing
// dismiss timer never clears a newer one.
let nextId = 1;

function getSnapshot(): ToastState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setState(next: ToastState): void {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}

/** Show a transient confirmation. Renders once a `<ToastHost/>` is mounted. */
export function showToast(message: string, tone: ToastTone = 'info') {
  const id = nextId;
  nextId += 1;
  // `closing: false` here is what interrupts a pending exit when a new toast
  // arrives mid-slide-out.
  setState({ toast: { id, message, tone }, closing: false });
}

/** Ask the visible toast to animate out (dwell timer elapsed, or tapped). */
function requestClose(): void {
  if (!state.toast || state.closing) return;
  setState({ toast: state.toast, closing: true });
}

/** Drop the toast once its exit animation has finished. */
function clearToast(): void {
  if (state === EMPTY) return;
  setState(EMPTY);
}

/** How long the toast dwells before auto-dismissing. */
const VISIBLE_MS = 2600;

/**
 * Nav-bar height, cleared below the safe-area inset so the toast lands UNDER the
 * header rather than on it. At `insets.top` alone it covered the whole bar —
 * title, back chevron and the Larm tab's filter/Larma actions — for the 2.6s it
 * was up: the app appeared to lose its navigation exactly when a user who just
 * saved something reaches for "back". These are the standard bar heights; the
 * toast floats, so being a couple of points off a large-title header is
 * invisible, while being 44pt too high was not.
 */
const NAV_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 56;

export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { reduced } = useMotion();
  // One tear-free read of the module store above. `closing` requests the
  // out-animation (auto after dwell, or on tap); all `progress` writes stay
  // inside the effect below — the React-Compiler immutability rule forbids
  // mutating an effect-tracked shared value from a plain handler — so the
  // handlers only advance store state and the effect animates.
  const { toast, closing } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Owns the whole in → dwell → out lifecycle. `closing` drives the exit; the
  // toast is cleared from the animation's completion callback so the slide-out
  // always finishes. A new toast resets `closing` (in `showToast`) and re-enters
  // the in-animation, interrupting any pending exit.
  useEffect(() => {
    if (!toast) return;
    if (closing) {
      progress.value = withTiming(
        0,
        { duration: reduced ? 0 : Duration.quick, easing: Curve.out },
        (finished) => {
          if (finished) scheduleOnRN(clearToast);
        },
      );
      return;
    }
    progress.value = withTiming(1, { duration: reduced ? 0 : Duration.standard, easing: Curve.out });
    timer.current = setTimeout(requestClose, VISIBLE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, closing, reduced, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -12 }],
  }));

  if (!toast) return null;

  const accent =
    toast.tone === 'success'
      ? theme.primary
      : toast.tone === 'error'
        ? theme.destructive
        : theme.foreground;
  const icon: IconName | null =
    toast.tone === 'success' ? CHECK : toast.tone === 'error' ? ALERT : null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + NAV_BAR_HEIGHT + Spacing.two }]}
    >
      <Animated.View style={[styles.wrap, animatedStyle]}>
        <PressableScale
          variant="card"
          haptic={false}
          onPress={requestClose}
          // `alert` makes screen readers announce the message as it appears.
          accessibilityRole="alert"
          accessibilityLabel={toast.message}
          restingBackgroundColor={theme.card}
          style={[
            SurfaceStyles.floatingTray,
            styles.toast,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {icon ? (
            <Icon
              name={icon}
              size={IconSize.control}
              color={accent}
              // A one-shot bounce on the success check (iOS SF Symbols only) — a
              // small celebratory beat; error/info stay still.
              animationSpec={toast.tone === 'success' ? BOUNCE_ONCE : undefined}
            />
          ) : null}
          <ThemedText type="smallBold" numberOfLines={2} style={styles.text}>
            {toast.message}
          </ThemedText>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    // Above the navigator + any modal sheet chrome.
    zIndex: 1000,
  },
  wrap: { width: '100%', maxWidth: MaxContentWidth, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    maxWidth: '100%',
  },
  text: { flexShrink: 1 },
});
