import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Saknar EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Kopiera .env.example till .env.',
  );
}

// `expo-sqlite/localStorage/install` installs a Web Storage-compatible global
// `localStorage` backed by SQLite (already used by the M2 theme persistence).
// Reach it through globalThis with a typed shim so this compiles without
// pulling the DOM lib into the React Native type environment.
type WebStorageLike = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};
const storage = (globalThis as unknown as { localStorage: WebStorageLike }).localStorage;

// Shared backend with the mafk web app. The publishable key (sb_publishable_*)
// is safe to ship in the client — Row Level Security is the real boundary (M4).
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE so the email magic-link carries a `?code=` we redeem on this device
    // with `exchangeCodeForSession` (M5). The code verifier is held in `storage`
    // between sending the link and opening it — hence "open the link on this
    // device". Native ID-token sign-in (Apple/Google) is a separate flow and is
    // unaffected by this.
    flowType: 'pkce',
  },
});

// Dev-only: expose the live client on `globalThis` so a connected debugger can
// drive auth (e.g. provision a throwaway test account) during local QA without
// ever shipping a handle in a release build. Guarded by `__DEV__`, so it is
// dead-code-eliminated from production bundles.
if (__DEV__) {
  (globalThis as unknown as { __sb?: typeof supabase }).__sb = supabase;
}

// Supabase's React Native guidance: drive token auto-refresh by app foreground
// state (on top of `autoRefreshToken`). Stop refreshing in the background,
// resume on return to foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
