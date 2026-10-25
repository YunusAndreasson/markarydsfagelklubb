import { AppState } from 'react-native';

/** TanStack's focus source on native. Repeated active events are deduplicated
 * by focusManager; a missing initial state waits for the first native event. */
export function watchQueryFocus(setFocused: (focused: boolean) => void): () => void {
  if (AppState.currentState != null) setFocused(AppState.currentState === 'active');
  const subscription = AppState.addEventListener('change', (state) => {
    setFocused(state === 'active');
  });
  return () => subscription.remove();
}
