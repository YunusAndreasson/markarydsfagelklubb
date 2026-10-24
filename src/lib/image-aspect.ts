/** Display bounds for uncropped observation photos. */
export const ASPECT_WIDEST = 1.91;
export const ASPECT_TALLEST = 4 / 5;
export const ASPECT_DEFAULT = 4 / 3;

export function clampAspect(width: number, height: number): number {
  return Math.min(ASPECT_WIDEST, Math.max(ASPECT_TALLEST, width / height));
}

type Storage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const STORAGE_KEY = 'mafk.imageAspects.v1';
const CACHE_LIMIT = 256;

function validAspect(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) &&
    value >= ASPECT_TALLEST && value <= ASPECT_WIDEST;
}

/**
 * Dimensions must survive process restarts independently of expo-image's pixel
 * cache. Photo replacement uses a fresh storage path, so these keys also survive
 * signed-URL rotation. Never persist the signed URLs themselves.
 */
export function createImageAspectCache(storage?: Storage) {
  const aspects = new Map<string, number>();
  let restored = false;

  function trim() {
    while (aspects.size > CACHE_LIMIT) {
      const oldest = aspects.keys().next().value;
      if (oldest === undefined) break;
      aspects.delete(oldest);
    }
  }

  function restore() {
    if (restored) return;
    restored = true;
    try {
      const entries: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
      if (!Array.isArray(entries)) return;
      for (const entry of entries) {
        if (Array.isArray(entry) && typeof entry[0] === 'string' && validAspect(entry[1])) {
          aspects.set(entry[0], entry[1]);
        }
      }
      trim();
    } catch {
      // Missing/corrupt storage must not prevent a photo loading.
    }
  }

  return {
    get(key: string | null | undefined): number | undefined {
      if (!key) return undefined;
      restore();
      return aspects.get(key);
    },
    remember(key: string | null | undefined, width: number, height: number): number | undefined {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return undefined;
      }
      const aspect = clampAspect(width, height);
      if (!key) return aspect;
      restore();
      if (aspects.get(key) === aspect) return aspect;
      aspects.delete(key);
      aspects.set(key, aspect);
      trim();
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify([...aspects]));
      } catch {
        // Keep the session cache usable when disk writes fail.
      }
      return aspect;
    },
  };
}
