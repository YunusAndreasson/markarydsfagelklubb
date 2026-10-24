import { describe, expect, it, vi } from 'vitest';

import { ASPECT_TALLEST, createImageAspectCache } from './image-aspect';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
}

describe('photo aspect persistence', () => {
  it('reserves the measured portrait shape before loading on a cold start', () => {
    const storage = memoryStorage();
    const firstSession = createImageAspectCache(storage);
    expect(firstSession.get('user/observations/portrait.jpg')).toBeUndefined();
    firstSession.remember('user/observations/portrait.jpg', 3024, 4032);

    const restartedSession = createImageAspectCache(storage);
    expect(restartedSession.get('user/observations/portrait.jpg')).toBe(ASPECT_TALLEST);
  });

  it('shares dimensions between feed and detail without rewriting identical metadata', () => {
    const storage = memoryStorage();
    const feed = createImageAspectCache(storage);
    feed.remember('user/observations/bird.jpg', 3000, 2000);
    const detail = createImageAspectCache(storage);
    expect(detail.get('user/observations/bird.jpg')).toBe(1.5);
    detail.remember('user/observations/bird.jpg', 1500, 1000);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    // A replacement photo gets a new path, so cannot inherit the previous shape.
    expect(detail.get('user/observations/replacement.jpg')).toBeUndefined();
  });

  it('rejects invalid dimensions instead of poisoning the next startup', () => {
    const storage = memoryStorage();
    const cache = createImageAspectCache(storage);
    const invalidSizes: [number, number][] = [[0, 100], [100, 0], [-10, 100], [NaN, 100], [100, Infinity]];
    for (const [width, height] of invalidSizes) {
      expect(cache.remember('bird', width, height)).toBeUndefined();
    }
    expect(cache.get('bird')).toBeUndefined();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('recovers from corrupt storage and filters invalid persisted ratios', () => {
    const storage = memoryStorage();
    storage.setItem('mafk.imageAspects.v1', '{broken');
    expect(createImageAspectCache(storage).get('bird')).toBeUndefined();
    storage.setItem('mafk.imageAspects.v1', JSON.stringify([['bird', 1.5], ['bad', -1], ['huge', 50]]));
    const cache = createImageAspectCache(storage);
    expect(cache.get('bird')).toBe(1.5);
    expect(cache.get('bad')).toBeUndefined();
    expect(cache.get('huge')).toBeUndefined();
  });

  it('keeps working for this session when storage fails', () => {
    const cache = createImageAspectCache({
      getItem: () => { throw new Error('read failed'); },
      setItem: () => { throw new Error('disk full'); },
    });
    expect(cache.remember('bird', 2000, 1000)).toBe(1.91);
    expect(cache.get('bird')).toBe(1.91);
  });

  it('bounds persisted metadata instead of growing with every photo ever viewed', () => {
    const storage = memoryStorage();
    const cache = createImageAspectCache(storage);
    for (let i = 0; i < 300; i++) cache.remember(`bird-${i}`, 3000, 2000);
    const restarted = createImageAspectCache(storage);
    expect(restarted.get('bird-0')).toBeUndefined();
    expect(restarted.get('bird-299')).toBe(1.5);
  });

  it('does not persist a signed URL when there is no immutable path', () => {
    const storage = memoryStorage();
    const cache = createImageAspectCache(storage);
    expect(cache.remember(undefined, 1000, 1000)).toBe(1);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
