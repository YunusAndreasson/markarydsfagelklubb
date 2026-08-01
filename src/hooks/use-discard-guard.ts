/**
 * The compose-modal dismiss guard, shared by the create ("Nytt larm") and edit
 * observation modals. Both need the same three behaviours, which drifted apart
 * when they were written per-route:
 *
 *  1. **Never dismiss mid-write.** A modal that unmounts while its mutation is in
 *     flight takes the per-call success continuation with it, so a report that
 *     actually saved looks stuck.
 *  2. **A clean form closes immediately**; a dirty one asks first — the iOS
 *     "Discard changes?" convention (Norman: forgiveness).
 *  3. **Cover every exit.** `gestureEnabled` blocks the native swipe while dirty
 *     or busy; `useHardwareBackGuard` covers Android's hardware back, which
 *     `gestureEnabled` can't. That leaves the guarded dismiss button as the only
 *     way out.
 *
 * Returns the dismiss handler for the header button and the `gestureEnabled`
 * value for `Stack.Screen`.
 */
import { useCallback } from 'react';
import { router } from 'expo-router';

import { useHardwareBackGuard } from '@/hooks/use-hardware-back-guard';
import { confirm } from '@/lib/confirm';
import { sv } from '@/lib/i18n/sv';

const COPY = {
  create: {
    title: sv.observation.discard.createTitle,
    message: sv.observation.discard.createMessage,
    confirmLabel: sv.observation.discard.createConfirm,
  },
  edit: {
    title: sv.observation.discard.editTitle,
    message: sv.observation.discard.editMessage,
    confirmLabel: sv.observation.discard.editConfirm,
  },
} as const;

export function useDiscardGuard({
  mode,
  dirty,
  busy,
}: {
  mode: 'create' | 'edit';
  /** Does the form hold unsaved input worth confirming before throwing away? */
  dirty: boolean;
  /** Is a create/update/delete in flight? */
  busy: boolean;
}) {
  const dismiss = useCallback(() => {
    if (busy) return;
    if (!dirty) {
      router.back();
      return;
    }
    void (async () => {
      const ok = await confirm({
        ...COPY[mode],
        cancelLabel: sv.observation.discard.keepEditing,
        destructive: true,
      });
      if (ok) router.back();
    })();
  }, [busy, dirty, mode]);

  useHardwareBackGuard(dirty || busy, dismiss);

  return { dismiss, gestureEnabled: !dirty && !busy };
}
