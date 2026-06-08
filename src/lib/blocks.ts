/**
 * Client-side block list — the user hides another member's content (App Store
 * Review Guideline 1.2 requires apps with user-generated content to let people
 * block abusive users). Blocking is local to this device: blocked members vanish
 * from the feed and their profile content is replaced with an unblock affordance.
 * No shared-backend schema change — a hidden member's data is untouched server-side.
 *
 * Backed by the same `expo-sqlite/localStorage` shim the theme / auth / push
 * prefs use, and exposed as a tiny external store so screens re-render the moment
 * a block changes (`useBlockedUsers`).
 */
import 'expo-sqlite/localStorage/install';
import { useSyncExternalStore } from 'react';

type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const storage = (globalThis as unknown as { localStorage?: WebStorageLike }).localStorage;
const KEY = 'mafk.blockedUsers';

const listeners = new Set<() => void>();
// Cached immutable snapshot — `useSyncExternalStore` needs a stable reference
// between renders, and a fresh one only when the set actually changes.
let cache: ReadonlySet<string> | null = null;

function read(): ReadonlySet<string> {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function snapshot(): ReadonlySet<string> {
  if (!cache) cache = read();
  return cache;
}

function commit(next: Set<string>): void {
  cache = next;
  try {
    storage?.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // best-effort — the in-memory snapshot still reflects the change this session
  }
  listeners.forEach((l) => l());
}

export function isBlocked(userId: string): boolean {
  return snapshot().has(userId);
}

export function blockUser(userId: string): void {
  if (snapshot().has(userId)) return;
  const next = new Set(snapshot());
  next.add(userId);
  commit(next);
}

export function unblockUser(userId: string): void {
  if (!snapshot().has(userId)) return;
  const next = new Set(snapshot());
  next.delete(userId);
  commit(next);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive set of blocked user ids — re-renders on block/unblock. */
export function useBlockedUsers(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
