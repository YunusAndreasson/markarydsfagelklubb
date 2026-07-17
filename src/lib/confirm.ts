/**
 * Imperative confirm service — the themed replacement for `Alert.alert`
 * two-button confirms. Call `confirm({...})` from anywhere (components,
 * mutation callbacks, plain lib functions) and await the user's choice.
 *
 * Hosts register as a STACK, not a singleton. The root layout mounts one
 * `<ConfirmSheet />` at app start; the edit modal mounts a second one while
 * it's open. This matters because the sheet renders inside an RN `Modal`, and
 * an RN `Modal` hosted in the root layout presents *behind* a native-stack
 * modal (the edit screen) — it can't float above it. So the frontmost modal
 * needs its own host inside its own view tree, the same reason edenmind
 * dual-mounts its toast. `confirm()` always routes to the TOPMOST registered
 * host, so the sheet appears inside whatever modal is currently frontmost.
 *
 * Module-level registry instead of React context so non-component callers
 * need no hook plumbing. If no host is mounted (tests), confirm resolves
 * false — the safe answer for a destructive prompt.
 *
 * Ported from the edenmind reference.
 */

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Label on the committing button, e.g. "Ta bort" / "Logga ut". */
  confirmLabel: string;
  /** Defaults to `sv.common.cancel` ("Avbryt"). */
  cancelLabel?: string;
  /** Renders the confirm button filled red and fires a firmer haptic. */
  destructive?: boolean;
};

type ConfirmHandler = (options: ConfirmOptions) => Promise<boolean>;

// Topmost host wins. The root host registers first (app start); a modal's own
// host pushes on top while it's open and pops on unmount, restoring the root.
const handlers: ConfirmHandler[] = [];

/** Called by each `<ConfirmSheet />` host on mount. Returns an unregister fn. */
export function registerConfirmHandler(next: ConfirmHandler): () => void {
  handlers.push(next);
  return () => {
    const index = handlers.lastIndexOf(next);
    if (index !== -1) handlers.splice(index, 1);
  };
}

/**
 * Resolves true when the user taps the confirm action, false otherwise.
 * Settles only after the sheet has fully closed, so callers can navigate
 * (`router.back()`, push) directly in the continuation — navigating while the
 * sheet's Modal is still presented silently fails on iOS native-stack modals.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  const handler = handlers[handlers.length - 1];
  if (!handler) return Promise.resolve(false);
  return handler(options);
}
