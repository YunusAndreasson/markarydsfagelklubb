import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * The open keyboard's height on Android, 0 otherwise. The app runs edge-to-edge,
 * so `adjustResize` doesn't shrink the screen and a scroller has to make its own
 * room. Always 0 on iOS, where `automaticallyAdjustKeyboardInsets` does this.
 */
export function useAndroidKeyboardHeight(enabled: boolean) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled]);

  return height;
}
