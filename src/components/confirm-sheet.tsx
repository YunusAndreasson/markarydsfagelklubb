/**
 * The visible host for the `confirm()` service (`lib/confirm.ts`) — a branded
 * bottom-sheet confirm that replaces the stock OS alert (grey Material box,
 * teal ALL-CAPS buttons) everywhere a two-way decision is needed.
 *
 * Rendered inside a transparent RN `Modal`. Mount one host in the root layout
 * AND one inside the edit modal: an RN `Modal` hosted in the root layout
 * presents *behind* a native-stack modal, so the edit screen needs its own
 * host to reach above its own content (see `lib/confirm` — `confirm()` routes
 * to the topmost registered host). Entrance is a scrim fade + tray spring-up;
 * exit is a quick reverse run by hand (RN unmounts a Modal's children before
 * Reanimated `exiting` can play, so we animate out first and hide the Modal
 * after `Duration.quick`).
 *
 * The promise settles only AFTER the Modal has unmounted — never at tap time.
 * Callers navigate straight from the continuation (block → `router.back()`),
 * and dismissing a native-stack modal while this RN Modal is still presented
 * on top of it fails silently on iOS.
 *
 * Ported from the edenmind reference.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Duration, Spring } from '@/constants/motion';
import { SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { Spacing, SurfaceOverlay } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { registerConfirmHandler, type ConfirmOptions } from '@/lib/confirm';
import { hapticWarning } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

type ActiveConfirm = {
  options: ConfirmOptions;
  resolve: (choice: boolean) => void;
};

// A choice was tapped but the sheet is still on screen (exit animation, then
// native dismissal). Held until the Modal unmounts so the promise never
// settles while the Modal is presented.
type PendingResolution = {
  resolve: (choice: boolean) => void;
  choice: boolean;
};

const TRAY_ENTER_OFFSET = 24;

export function ConfirmSheet() {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const insets = useSafeAreaInsets();
  const { reduced } = useMotion();
  const [active, setActive] = useState<ActiveConfirm | null>(null);
  // `closing` drives the exit animation via the effect below — Reanimated
  // shared-value writes only happen inside useEffect (never in callbacks), the
  // React-Compiler-clean pattern (see toast.tsx).
  const [closing, setClosing] = useState(false);
  // The resolve fn lives in a ref too so unmount can settle a pending promise.
  const activeRef = useRef<ActiveConfirm | null>(null);
  // Set by `settle`, resolved by the after-unmount effect below.
  const pendingRef = useRef<PendingResolution | null>(null);

  const scrimOpacity = useSharedValue(0);
  const trayShift = useSharedValue(TRAY_ENTER_OFFSET);

  useEffect(() => {
    return registerConfirmHandler((options) => {
      hapticWarning();
      return new Promise<boolean>((resolve) => {
        // A second confirm while one is open shouldn't happen; settle the old
        // one as cancelled rather than dropping its promise. Same for a choice
        // still waiting on the exit animation — flush it with its real answer.
        activeRef.current?.resolve(false);
        const stale = pendingRef.current;
        pendingRef.current = null;
        stale?.resolve(stale.choice);
        const next = { options, resolve };
        activeRef.current = next;
        setClosing(false);
        setActive(next);
      });
    });
  }, []);

  // Unmount (app teardown): settle any pending promise so callers never hang.
  useEffect(() => {
    return () => {
      activeRef.current?.resolve(false);
      const pending = pendingRef.current;
      pendingRef.current = null;
      pending?.resolve(pending.choice);
    };
  }, []);

  // Enter when a confirm lands; exit when `closing` flips. The unmount of the
  // Modal happens after the exit run via the timeout (RN Modals drop children
  // before Reanimated `exiting` can play, so the sheet animates itself out).
  useEffect(() => {
    if (!active) return;
    if (closing) {
      if (!reduced) {
        scrimOpacity.value = withTiming(0, {
          duration: Duration.quick,
          easing: Easing.in(Easing.quad),
        });
        trayShift.value = withTiming(TRAY_ENTER_OFFSET, {
          duration: Duration.quick,
          easing: Easing.in(Easing.quad),
        });
      }
      const timer = setTimeout(
        () => {
          setActive(null);
          setClosing(false);
        },
        reduced ? 0 : Duration.quick,
      );
      return () => clearTimeout(timer);
    }
    if (reduced) {
      scrimOpacity.value = 1;
      trayShift.value = 0;
      return undefined;
    }
    scrimOpacity.value = 0;
    trayShift.value = TRAY_ENTER_OFFSET;
    scrimOpacity.value = withTiming(1, {
      duration: Duration.standard,
      easing: Easing.out(Easing.quad),
    });
    trayShift.value = withSpring(0, Spring.responsive);
    return undefined;
  }, [active, closing, reduced, scrimOpacity, trayShift]);

  // Stash the choice rather than resolving here: resolving at tap time lets a
  // caller's `router.back()` run while the Modal is still presented on top of
  // a native-stack modal, which iOS drops on the floor. The effect below
  // resolves once the Modal is gone. Clearing `activeRef` keeps the exiting
  // sheet's buttons/scrim from settling twice.
  const settle = useCallback((choice: boolean) => {
    const current = activeRef.current;
    if (!current) return;
    activeRef.current = null;
    pendingRef.current = { resolve: current.resolve, choice };
    setClosing(true);
  }, []);

  // Resolve one frame after the Modal has unmounted — `animationType="none"`
  // means the native dismissal is instant once the unmount commits, so a
  // single frame guarantees callers navigate against a clean presentation
  // stack. `pendingRef` stays set until the frame fires so the unmount
  // cleanup above can still flush it if the host disappears first.
  useEffect(() => {
    if (active !== null) return;
    const pending = pendingRef.current;
    if (!pending) return;
    const frame = requestAnimationFrame(() => {
      if (pendingRef.current === pending) pendingRef.current = null;
      pending.resolve(pending.choice);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
  const trayStyle = useAnimatedStyle(() => ({
    opacity: 1 - trayShift.value / (TRAY_ENTER_OFFSET * 2),
    transform: [{ translateY: trayShift.value }],
  }));

  if (!active) return null;
  const { options } = active;
  const scrim = SurfaceOverlay[colorScheme].scrim;

  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={() => settle(false)}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={options.cancelLabel ?? sv.common.cancel}
            onPress={() => settle(false)}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.tray,
            SurfaceStyles.floatingTray,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              marginBottom: insets.bottom + Spacing.three,
            },
            trayStyle,
          ]}
        >
          <ThemedText type="heading" accessibilityRole="header">
            {options.title}
          </ThemedText>
          {options.message ? (
            <ThemedText type="small" themeColor="mutedForeground" style={styles.message}>
              {options.message}
            </ThemedText>
          ) : null}
          <View style={styles.actions}>
            <Button
              title={options.cancelLabel ?? sv.common.cancel}
              variant="secondary"
              size="compact"
              style={styles.action}
              onPress={() => settle(false)}
            />
            <Button
              title={options.confirmLabel}
              variant={options.destructive ? 'destructive' : 'primary'}
              size="compact"
              haptic={options.destructive ? 'commit' : 'press'}
              style={styles.action}
              onPress={() => settle(true)}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tray: {
    marginHorizontal: Spacing.three,
    borderRadius: SurfaceRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  message: {
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  action: { flex: 1 },
});
