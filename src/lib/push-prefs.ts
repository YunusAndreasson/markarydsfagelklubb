/**
 * A single persisted flag: did the user explicitly turn club notiser OFF?
 *
 * The OS permission can't be revoked programmatically, so "Stäng av notiser" in
 * Profil can't un-grant it — instead it records an opt-out here and drops this
 * device's token. The auto-registration hook respects this flag so a cold start
 * doesn't silently re-subscribe a user who turned notiser off.
 *
 * Backed by the same `expo-sqlite/localStorage` shim the theme + Supabase auth
 * already use; every call is best-effort (storage may be unavailable mid-init).
 */
import 'expo-sqlite/localStorage/install';

type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const storage = (globalThis as unknown as { localStorage?: WebStorageLike }).localStorage;
const OPT_OUT_KEY = 'mafk.push.optOut';

export function isPushOptedOut(): boolean {
  try {
    return storage?.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPushOptedOut(optedOut: boolean): void {
  try {
    if (optedOut) storage?.setItem(OPT_OUT_KEY, '1');
    else storage?.removeItem(OPT_OUT_KEY);
  } catch {
    // best-effort
  }
}
