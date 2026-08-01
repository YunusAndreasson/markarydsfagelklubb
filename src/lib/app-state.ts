/**
 * Foreground re-sync — the shared answer to "the user may have changed this in
 * system Settings while we were backgrounded".
 *
 * Device permissions (location, notifications) can only be granted or revoked
 * outside the app, and neither OS notifies us when it happens. The one reliable
 * signal is the app returning to the foreground, so every permission row reads
 * its state on mount and again on each `active` transition. Both the geo watcher
 * and the notification row had grown their own copy of this, `active` guard and
 * all; this is that copy.
 *
 * The guard matters: `read()` is async, so a resolve that lands after unmount
 * would otherwise set state on a dead subscriber.
 */
import { AppState } from 'react-native';

/**
 * Emit `read()`'s result immediately, then again whenever the app is foregrounded.
 * Returns an unsubscribe function — call it on unmount.
 */
export function watchOnForeground<T>(
  read: () => Promise<T>,
  onChange: (value: T) => void,
): () => void {
  let active = true;
  const emit = () => {
    void read().then((value) => {
      if (active) onChange(value);
    });
  };
  emit();
  const subscription = AppState.addEventListener('change', (next) => {
    if (next === 'active') emit();
  });
  return () => {
    active = false;
    subscription.remove();
  };
}
