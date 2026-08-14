/**
 * Imperative confirm service — a two-button confirm you can `await` from
 * anywhere (components, mutation callbacks, plain lib functions).
 *
 * Backed by the **platform's own dialog** (`Alert.alert` → `UIAlertController`
 * on iOS, a Material `AlertDialog` on Android). This replaced a hand-built
 * themed sheet, and the swap deleted a lot of machinery that existed only to
 * work around the sheet being an RN `Modal`:
 *
 *  - a **host registry**: an RN `Modal` mounted in the root layout renders
 *    *behind* a native-stack modal, so every screen presented modally had to
 *    mount its own `<ConfirmSheet/>` and `confirm()` had to route to the
 *    topmost one. A native dialog is a real platform window — it is always
 *    frontmost, so there is nothing to host and nothing to register.
 *  - a **deferred-resolution state machine**: callers navigate in the
 *    continuation (`doBlock` → `router.back()`), and navigating while an RN
 *    `Modal` is still dismissing fails silently on iOS. The native dialog is
 *    fully gone by the time a button handler runs, so resolving directly is
 *    safe.
 *
 * The trade is the branded look — this is the system dialog, matching the OS
 * rather than the app's palette. That is the point: it reads as native.
 */
import { Alert } from 'react-native';

import { hapticWarning } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Label on the committing button, e.g. "Ta bort" / "Logga ut". */
  confirmLabel: string;
  /** Defaults to `sv.common.cancel` ("Avbryt"). */
  cancelLabel?: string;
  /** Renders the confirm button in the platform's destructive style. */
  destructive?: boolean;
};

/**
 * Resolves true when the user taps the confirm action, false otherwise —
 * including an Android back-press or outside tap, which is why `onDismiss` is
 * wired too. Settles only once: on Android `onDismiss` fires *in addition to*
 * the pressed button's handler, so the first answer wins.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  // Fires as the dialog presents, matching the old sheet's behavior — see the
  // note at `observation-form.tsx`'s delete action, which relies on it.
  hapticWarning();

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(
      options.title,
      options.message,
      [
        {
          text: options.cancelLabel ?? sv.common.cancel,
          style: 'cancel',
          onPress: () => settle(false),
        },
        {
          text: options.confirmLabel,
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => settle(true),
        },
      ],
      // Android only: back-press / tap-outside dismisses without a button.
      { cancelable: true, onDismiss: () => settle(false) },
    );
  });
}
