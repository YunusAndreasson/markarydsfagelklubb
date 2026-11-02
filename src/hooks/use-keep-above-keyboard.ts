import { useEffect, type RefObject } from 'react';
import { Keyboard, TextInput, type ScrollViewInstance, type TextInputInstance } from 'react-native';

import { Spacing } from '@/constants/theme';

/**
 * Scroll a whole multiline input above the keyboard once it has opened.
 *
 * `automaticallyAdjustKeyboardInsets` isn't enough for a tall input: on iOS it
 * scrolls only until the text cursor clears the keyboard, which leaves most of
 * the box hidden, and on Android it doesn't exist.
 *
 * Only scrolls down, and only when this input has focus and is actually covered.
 */
export function useKeepAboveKeyboard(
  inputRef: RefObject<TextInputInstance | null>,
  scrollRef?: { current: ScrollViewInstance | null },
) {
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      // Two frames: Android's scroll room comes from padding that `Screen` adds in
      // response to this same event, and a scroll past the old end would be clamped.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const input = inputRef.current;
          const scroller = scrollRef?.current;
          const scrollHost = scroller?.getNativeScrollRef();
          if (!input || !scroller || !scrollHost) return;
          if (TextInput.State.currentlyFocusedInput() !== input) return;
          input.measureInWindow((_x, inputY, _width, height) => {
            if (inputY + height + Spacing.three <= keyboardTop) return;
            input.measureLayout(
              scrollHost,
              (_contentX, contentY) => {
                scrollHost.measureInWindow((_scrollX, scrollY) => {
                  scroller.scrollTo({
                    y: scrollY + contentY + height + Spacing.three - keyboardTop,
                    animated: true,
                  });
                });
              },
              () => {},
            );
          });
        }),
      );
    });
    return () => subscription.remove();
  }, [inputRef, scrollRef]);
}
