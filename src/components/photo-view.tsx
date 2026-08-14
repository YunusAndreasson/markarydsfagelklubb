/**
 * A tappable observation photo — an inline preview that opens a fullscreen viewer
 * on tap. It mirrors `observation-map.tsx` one-for-one (same expand-badge
 * signifier, same self-contained `Modal`, same 44pt close button) so the detail
 * screen's photo and map read as one interaction vocabulary: both say "tap to see
 * this bigger". Jakob's Law — a photo that can't be enlarged breaks the
 * expectation every other app sets; Norman — the corner badge is the *signifier*
 * that the tap exists.
 *
 * Inline the image is cropped (`cover`) to a tidy 4:3 card; fullscreen it's shown
 * whole (`contain`) so nothing important is clipped, and pinch/double-tap zooms
 * further in — the same vocabulary as Photos/Instagram. Cache is keyed by the
 * stable storage path, not the rotating signed URL (see `observation-card.tsx`).
 */
import { Image, type ImageSource } from 'expo-image';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useImperativeHandle, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpandBadge, FloatingIconButton } from '@/components/floating-control';
import { CLOSE, EXPAND } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedView } from '@/components/themed-view';
import { Duration } from '@/constants/motion';
import { SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

export type PhotoViewProps = {
  /** The (signed) image URL. */
  uri: string;
  /** Stable storage path — keys the disk/memory cache so the photo survives the
   *  signed URL's token rotating (matches the feed card + detail behavior). */
  cacheKey?: string;
};

/** How far a pinch/double-tap may zoom in, relative to the "fit" scale of 1. */
const MAX_SCALE = 4;
/** Double-tap zoom level — enough to read fine detail without a second pinch. */
const DOUBLE_TAP_SCALE = 2.5;

type ZoomableImageHandle = { reset: () => void };

/** `expo-image`'s `Image` animated so `animatedStyle` can drive its transform —
 *  Reanimated's own `Animated.Image` wraps RN's core `Image`, not this one. */
const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Pinch-to-zoom + pan-while-zoomed + double-tap toggle, over the fullscreen
 * `contain`-fit image. Single tap dismisses, but only while at rest (scale 1) —
 * zoomed in, a stray tap shouldn't close the viewer out from under the reader.
 *
 * All shared-value writes happen inside gesture callbacks or plain event
 * handlers (the close button, `reset()` via imperative handle) — never inside a
 * `useEffect` — because the Compiler forbids a shared value being written from
 * both an effect and a gesture (see `picker-sheet.tsx`'s drag-to-dismiss note).
 * That's also why zoom state resets via an imperative `reset()` call rather than
 * an effect keyed on `visible`.
 *
 * `"use no memo"` opts this component out of the Compiler: unlike a JSX
 * `onPress={...}` prop (which the Compiler special-cases as an event handler),
 * `Gesture.Pinch().onUpdate(cb)`-style builder callbacks aren't recognized as
 * one, so every `.value` write here trips `react-hooks/immutability`. Per
 * Reanimated's own React Compiler guidance, worklet-heavy gesture components
 * opt out rather than restructure around the false positive.
 */
function ZoomableImage({
  source,
  onDismiss,
  ref,
}: {
  source: ImageSource;
  onDismiss: () => void;
  ref?: React.Ref<ZoomableImageHandle>;
}) {
  'use no memo';
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    reset: () => {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    },
  }));

  /** Keep the image from panning past where its zoomed edge meets the screen edge. */
  const clampTranslation = (value: number, dimension: number, currentScale: number) => {
    'worklet';
    const max = (dimension * (currentScale - 1)) / 2;
    return clamp(value, -max, max);
  };

  // Gesture builder callbacks (`.onUpdate`/`.onEnd`) aren't JSX event-handler
  // props, so the Compiler's lint doesn't recognize them as a mutation-safe
  // context the way it does `onPress={...}` in pressable-scale.tsx — hence the
  // blanket disable below rather than restructuring away from Reanimated's
  // documented gesture-handler shape.
  /* eslint-disable react-hooks/immutability -- worklet writes, see comment above */
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = clamp(savedScale.value * e.scale, 1, MAX_SCALE);
      scale.value = next;
      translateX.value = clampTranslation(
        savedTranslateX.value + (1 - e.scale) * (e.focalX - width / 2),
        width,
        next,
      );
      translateY.value = clampTranslation(
        savedTranslateY.value + (1 - e.scale) * (e.focalY - height / 2),
        height,
        next,
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      if (scale.value <= 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value <= 1) return;
      translateX.value = clampTranslation(
        savedTranslateX.value + e.translationX,
        width,
        savedScale.value,
      );
      translateY.value = clampTranslation(
        savedTranslateY.value + e.translationY,
        height,
        savedScale.value,
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomingIn = savedScale.value <= 1;
      const next = zoomingIn ? DOUBLE_TAP_SCALE : 1;
      scale.value = withTiming(next);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedScale.value = next;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      if (savedScale.value <= 1) runOnJS(onDismiss)();
    });
  /* eslint-enable react-hooks/immutability */

  const gesture = Gesture.Simultaneous(
    Gesture.Simultaneous(pinch, pan),
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={StyleSheet.absoluteFill}>
        <AnimatedImage
          source={source}
          style={[StyleSheet.absoluteFill, animatedStyle]}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={Duration.quick}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export function PhotoView({ uri, cacheKey }: PhotoViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const zoomRef = useRef<ZoomableImageHandle>(null);

  const source = { uri, cacheKey };

  const close = () => {
    zoomRef.current?.reset();
    setExpanded(false);
  };

  return (
    <View>
      {/* Gentle card-press depress signals the photo is interactive (Norman
          affordance); the corner badge is the explicit signifier. */}
      <PressableScale
        variant="card"
        onPress={() => setExpanded(true)}
        accessibilityRole="button"
        accessibilityLabel={sv.observation.photoExpand}
        style={[styles.preview, { borderColor: theme.border }]}
      >
        <Image
          source={source}
          style={[styles.image, { backgroundColor: theme.muted }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={Duration.quick}
        />
        <ExpandBadge icon={EXPAND} />
      </PressableScale>

      <Modal visible={expanded} animationType="fade" onRequestClose={close} statusBarTranslucent>
        {/* Pinch/double-tap to zoom, pan while zoomed, tap to dismiss while at
            rest — plus an explicit close button for discoverability. */}
        <ThemedView style={styles.full}>
          <ZoomableImage ref={zoomRef} source={source} onDismiss={close} />
          <FloatingIconButton
            icon={CLOSE}
            accessibilityLabel={sv.observation.photoClose}
            onPress={close}
            style={[styles.close, { top: insets.top + Spacing.two }]}
          />
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: SurfaceStyles.clippedCard,
  image: { width: '100%', aspectRatio: 4 / 3 },
  full: { flex: 1 },
  close: { right: Spacing.three },
});
