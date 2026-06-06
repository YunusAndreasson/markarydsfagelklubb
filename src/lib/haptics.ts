/**
 * The app's haptic vocabulary — seven intent-named wrappers over `expo-haptics`.
 * Haptics are an *accent* on visible feedback (a toggle just flipped, a card just
 * landed); every call is fire-and-forget, errors are swallowed, and the calls
 * no-op on web. Keeping them here — rather than calling `Haptics.*` directly —
 * means call sites read in intent and there is exactly one place to retune.
 *
 * Pick by intent, not by raw primitive. The mapping below tracks Apple's
 * "Playing Haptics" HIG; Android's `expo-haptics` translates each primitive to
 * a sensible OEM pattern, so no platform branching lives in this file. If
 * Android testing later shows Light impact feels too aggressive vs. iOS, this
 * is the file to tune.
 *
 *   INTENT          WHEN TO USE                                  iOS primitive          Android
 *   hapticTick      A gesture crosses a threshold mid-drag, or   selectionAsync         short selection buzz
 *                   a pull-to-refresh fires. Continuous-motion
 *                   ratchet. Pair with mic open/close.
 *   hapticPress     Default tap confirmation on a button or a    Impact.Light           light tap pattern
 *                   navigation row.
 *   hapticSelect    A value/selection just changed — toggle      selectionAsync         short selection buzz
 *                   flipped, radio chosen, card revealed.
 *   hapticCommit    A gesture commits / something lands — fling  Impact.Medium          medium tap pattern
 *                   release, swipe-to-delete confirmed.
 *   hapticSuccess   End-of-task semantic success — review        Notification.Success   success pattern
 *                   session done, account deleted.
 *   hapticWarning   A destructive confirmation appears —         Notification.Warning   warning pattern
 *                   close-mid-review, sign-out, reset.
 *   hapticError     Validation fails / action rejected — form    Notification.Error     error pattern
 *                   error, voice missed, network failure.
 *
 * Reduce-motion is intentionally *not* gated here. Reduce Motion controls
 * visual motion; iOS exposes a separate "System Haptics" toggle and Android a
 * "Touch feedback" toggle, both of which `expo-haptics` honors at the OS layer.
 * The in-app Haptics preference is the only thing that flips `enabled` below.
 *
 * Safe to call from a Reanimated worklet only via `runOnJS` — these touch the
 * JS bridge and must run on the JS thread.
 */
import * as Haptics from 'expo-haptics';

// Gated by the user's "Haptics" preference. A preferences provider pushes the
// stored value here via `setHapticsEnabled` (added with Settings in M7), so call
// sites (including the Reanimated worklet ones invoked through `runOnJS`) stay
// unchanged and simply no-op when haptics are turned off.
let enabled = true;

/** Enable/disable all haptics app-wide. Driven by the Haptics preference. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

/** Continuous-motion ratchet — gesture crosses a threshold, pull-to-refresh
 *  fires, mic opens/closes. Apple HIG: this is `selectionAsync` territory, not
 *  `Impact.Light` (which reads as a discrete tap). */
export function hapticTick(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

/** Default tap confirmation on a button or navigation row. Use `hapticSelect`
 *  instead when a value/selection changes (toggles, radio rows, card reveal). */
export function hapticPress(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** A discrete selection change — toggle flipped, radio chosen, card revealed. */
export function hapticSelect(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

/** A gesture commits / something lands — fling release, swipe-to-delete
 *  confirmed. Firmer than `hapticPress`. */
export function hapticCommit(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** End-of-task semantic success — e.g. finishing a flow. */
export function hapticSuccess(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** A destructive confirmation appears — sign-out, reset, delete confirm. */
export function hapticWarning(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Validation fails / action rejected — form error, network failure. */
export function hapticError(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
