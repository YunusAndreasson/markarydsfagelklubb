import 'expo-sqlite/localStorage/install';

import { useState } from 'react';
import type { ImageLoadEventData } from 'expo-image';

import { ASPECT_DEFAULT, createImageAspectCache } from '@/lib/image-aspect';

type Storage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};
const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
const cache = createImageAspectCache(storage);

/**
 * Reserve a known photo's final frame synchronously, even on a cold start.
 * For an unseen photo, hide its pixels until onLoad commits its dimensions in
 * the same render. The placeholder may settle once; the visible photo never
 * stretches from a guessed 4:3 shape to its actual shape.
 */
export function useImageAspect(uri: string | null, cacheKey?: string | null) {
  const identity = cacheKey ?? uri;
  const [loaded, setLoaded] = useState<{ identity: string | null; aspect: number } | null>(null);
  // Only immutable storage paths are persisted. A URL-only caller can still
  // size its current image, without storing expiring tokens on disk.
  const known = cache.get(cacheKey);
  const aspect = loaded?.identity === identity ? loaded.aspect : known;

  function onLoad(event: ImageLoadEventData) {
    const { width, height } = event.source;
    const measured = cache.remember(cacheKey, width, height);
    if (measured === undefined) return;
    setLoaded({ identity, aspect: aspect ?? measured });
  }

  return { aspect: aspect ?? ASPECT_DEFAULT, ready: aspect !== undefined, onLoad };
}
