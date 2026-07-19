/**
 * Intercept the Android hardware **back** button while a screen is focused —
 * the counterpart to native-stack's `gestureEnabled` (which only governs the
 * swipe-to-dismiss). Used to complete an unsaved-changes guard: on Android the
 * back button is a second silent dismiss path the swipe flag doesn't cover.
 *
 * While `active` is true the press is swallowed and `onIntercept` runs (e.g. a
 * "Discard changes?" confirm); while false the default back proceeds untouched.
 * No-op on iOS (there is no hardware back). If the native stack on a given
 * version doesn't route the press through JS, the listener simply never fires —
 * the screen dismisses as it does today, so there is no regression either way.
 */
import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

import { useFocusEffect } from 'expo-router';

export function useHardwareBackGuard(active: boolean, onIntercept: () => void): void {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!active) return false;
        onIntercept();
        return true;
      });
      return () => subscription.remove();
    }, [active, onIntercept]),
  );
}
