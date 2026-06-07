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
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALERT, CHECK, Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Curve, Duration } from '@/constants/motion';
import { SurfaceStyles } from '@/constants/surface';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';

export type ToastTone = 'success' | 'error' | 'info';

type ToastPayload = { id: number; message: string; tone: ToastTone };

const listeners = new Set<(t: ToastPayload) => void>();
// A monotonic counter (not Date.now) keys successive toasts so a late-firing
// dismiss timer never clears a newer one.
let nextId = 1;

/** Show a transient confirmation. No-op until a `<ToastHost/>` is mounted. */
export function showToast(message: string, tone: ToastTone = 'info') {
  const id = nextId;
  nextId += 1;
  listeners.forEach((notify) => notify({ id, message, tone }));
}

/** How long the toast dwells before auto-dismissing. */
const VISIBLE_MS = 2600;

export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { reduced } = useMotion();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  // A separate flag requests the out-animation (auto after dwell, or on tap). All
  // `progress` writes stay inside the effect below — the React-Compiler
  // immutability rule forbids mutating an effect-tracked shared value from a
  // plain handler — so `dismiss` only flips state and the effect animates.
  const [closing, setClosing] = useState(false);
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onToast = (t: ToastPayload) => {
      setClosing(false);
      setToast(t);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  // Owns the whole in → dwell → out lifecycle. `closing` drives the exit; the
  // toast is cleared from the animation's completion callback so the slide-out
  // always finishes. A new toast resets `closing` (in the listener) and re-enters
  // the in-animation, interrupting any pending exit.
  useEffect(() => {
    if (!toast) return;
    if (closing) {
      progress.value = withTiming(
        0,
        { duration: reduced ? 0 : Duration.quick, easing: Curve.out },
        (finished) => {
          if (finished) runOnJS(setToast)(null);
        },
      );
      return;
    }
    progress.value = withTiming(1, { duration: reduced ? 0 : Duration.standard, easing: Curve.out });
    timer.current = setTimeout(() => setClosing(true), VISIBLE_MS);
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
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + Spacing.two }]}>
      <Animated.View style={[styles.wrap, animatedStyle]}>
        <PressableScale
          variant="card"
          haptic={false}
          onPress={() => setClosing(true)}
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
          {icon ? <Icon name={icon} size={18} color={accent} /> : null}
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
