/**
 * The app's haptic vocabulary — intent-named wrappers over `expo-haptics`.
 * Haptics are an *accent* on visible feedback (a toggle just flipped, a card just
 * landed); every call is fire-and-forget, errors are swallowed, and the calls
 * no-op on web. Keeping them here — rather than calling `Haptics.*` directly —
 * means call sites read in intent and there is exactly one place to retune.
 *
 * Pick by intent, not by raw primitive.
 *
 * THE RULE ABOVE THE TABLE: a haptic confirms a state change the *system* made —
 * a value was selected, a switch flipped, a write committed, something failed. It
 * never confirms a touch the finger already felt. So plain navigation is silent:
 * tapping a card, a list row, a settings chevron, a header action or a tab plays
 * nothing, because the screen arriving is the feedback. `PressableScale` encodes
 * this by variant (only `button` buzzes by default). The one navigation that
 * keeps a tick is a map pin, which has no press state to watch — there the haptic
 * is the only signal that the tap landed on a pin rather than on empty map.
 *
 * PLATFORM SPLIT (this is the modern-SDK part). Each intent maps to the
 * *platform-native* engine, not one API faked across both:
 *
 *  - iOS uses the UIKit generators directly — `impactAsync` (Light…Rigid/Soft),
 *    `notificationAsync` (Success/Warning/Error) and `selectionAsync` — which is
 *    exactly Apple's "Playing Haptics" HIG vocabulary.
 *  - Android uses `performAndroidHapticsAsync(AndroidHaptics.*)`, which drives
 *    the platform `HapticFeedbackConstants` / `View.performHapticFeedback`
 *    engine. Expo's own docs flag the alternative — `impactAsync` /
 *    `notificationAsync` on Android — as the *discouraged* path: it falls back to
 *    the coarse `Vibrator` and needs the `VIBRATE` permission. The constants
 *    below are the OEM-tuned effects Android recommends, honor the system
 *    "Touch feedback" setting, and need no permission. So each side plays its own
 *    full spectrum rather than a lowest-common-denominator buzz.
 *
 *   INTENT          WHEN TO USE                              iOS (UIKit)         Android (AndroidHaptics)
 *   hapticTick      Continuous-motion ratchet — a gesture    selection           Clock_Tick
 *                   crosses a threshold mid-drag, or
 *                   pull-to-refresh fires.
 *   hapticPress     A control that acts in place — a        Impact.Light        Virtual_Key
 *                   button, a stepper ±. NOT a tap that
 *                   merely navigates (see the rule above).
 *   hapticSelect    A value is chosen among discrete         selection           Segment_Tick
 *                   options — radio row, segmented control,
 *                   filter chip, picker row, card reveal.
 *   hapticToggle    An on/off switch is flipped. Carries     Impact.Rigid (on)   Toggle_On (on)
 *                   direction so the "on" click is crisp     Impact.Soft (off)   Toggle_Off (off)
 *                   and the "off" one softer.
 *   hapticCommit    A deliberate action lands / a gesture    Impact.Medium       Long_Press
 *                   commits — fling release, swipe-to-
 *                   delete confirmed, form submit.
 *   hapticSuccess   End-of-task semantic success — report    Notification.       Confirm
 *                   saved, account deleted, permission       Success
 *                   granted.
 *   hapticWarning   A destructive confirmation appears —     Notification.       Context_Click
 *                   sign-out, reset, delete confirm sheet.   Warning
 *   hapticError     Validation fails / action rejected —     Notification.       Reject
 *                   form error, voice missed, net failure.   Error
 *
 * `Impact.Heavy` is intentionally unused — reserved for a genuinely heavy,
 * physics-y collision the app doesn't have yet; reaching for it now would just be
 * spectrum for its own sake. Android has no distinct "warning" effect, so
 * `hapticWarning` borrows `Context_Click` (a firm secondary-action click) — the
 * closest cautionary feel to iOS's warning notification.
 *
 * Reduce-motion is intentionally *not* gated here. Reduce Motion controls visual
 * motion; iOS exposes a separate "System Haptics" toggle and Android a "Touch
 * feedback" toggle, both of which the native engines above honor at the OS layer.
 * The in-app Haptics preference is the only thing that flips `enabled` below.
 *
 * Safe to call from a Reanimated worklet only via `runOnJS` — these touch the
 * JS bridge and must run on the JS thread.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

// Gated by the user's "Haptics" preference. A preferences provider pushes the
// stored value here via `setHapticsEnabled` (added with Settings in M7), so call
// sites (including the Reanimated worklet ones invoked through `runOnJS`) stay
// unchanged and simply no-op when haptics are turned off.
let enabled = true;

/** Enable/disable all haptics app-wide. Driven by the Haptics preference. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

/**
 * Play one intent on whichever engine the current platform owns: the iOS UIKit
 * generator (`ios` thunk, only invoked on iOS) or the Android native constant
 * (only invoked on Android). Fire-and-forget; the sole failure mode is an
 * unsupported device, which we swallow.
 */
function play(ios: () => Promise<void>, android: Haptics.AndroidHaptics): void {
  if (!enabled) return;
  (isAndroid ? Haptics.performAndroidHapticsAsync(android) : ios()).catch(() => {});
}

/** Continuous-motion ratchet — gesture crosses a threshold, pull-to-refresh
 *  fires. A light, repeatable tick (not a discrete tap). */
export function hapticTick(): void {
  play(() => Haptics.selectionAsync(), Haptics.AndroidHaptics.Clock_Tick);
}

/** Default tap confirmation on a button or navigation row. Use `hapticSelect`
 *  when a value/selection changes, or `hapticToggle` for an on/off switch. */
export function hapticPress(): void {
  play(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    Haptics.AndroidHaptics.Virtual_Key,
  );
}

/** A value chosen among discrete options — radio row, segmented control, filter
 *  chip, picker row, card revealed. */
export function hapticSelect(): void {
  play(() => Haptics.selectionAsync(), Haptics.AndroidHaptics.Segment_Tick);
}

/** An on/off switch flipped. Direction-aware: a crisp `Rigid`/`Toggle_On` when
 *  turning on, a softer `Soft`/`Toggle_Off` when turning off. */
export function hapticToggle(on: boolean): void {
  play(
    () =>
      Haptics.impactAsync(
        on ? Haptics.ImpactFeedbackStyle.Rigid : Haptics.ImpactFeedbackStyle.Soft,
      ),
    on ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off,
  );
}

/** A deliberate action lands / a gesture commits — fling release, swipe-to-delete
 *  confirmed, form submit. Firmer than `hapticPress`. */
export function hapticCommit(): void {
  play(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Long_Press,
  );
}

/** End-of-task semantic success — report saved, account deleted, permission
 *  granted. */
export function hapticSuccess(): void {
  play(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
}

/** A destructive confirmation appears — sign-out, reset, delete confirm sheet. */
export function hapticWarning(): void {
  play(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    Haptics.AndroidHaptics.Context_Click,
  );
}

/** Validation fails / action rejected — form error, network failure. */
export function hapticError(): void {
  play(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    Haptics.AndroidHaptics.Reject,
  );
}
