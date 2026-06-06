/**
 * App-wide light/dark/system control.
 *
 * `system` follows the OS appearance; `light`/`dark` override it. The choice is
 * persisted and read back synchronously on first render (so there's no theme
 * flash), then applied two ways:
 *   1. `Appearance.setColorScheme` — so native UI (the native tab bar, action
 *      sheets, etc.) follows the override, not just JS-rendered views.
 *   2. `expo-system-ui` root background — so the view behind the React tree
 *      matches and never flashes white/black during transitions.
 *
 * JS components read the resolved scheme from this context (via `useTheme`)
 * rather than `useColorScheme` directly, so an override applies immediately
 * without waiting on the `Appearance` effect.
 */

import 'expo-sqlite/localStorage/install';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createStrictContext } from '@/lib/create-strict-context';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'mafk.theme-mode';

// `globalThis.localStorage` is the SQLite-backed Web Storage shim installed by
// `expo-sqlite/localStorage/install` (synchronous; a no-op on web where a real
// `localStorage` exists). Typed locally so this compiles without the DOM lib.
type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};
const storage = (globalThis as unknown as { localStorage?: WebStorageLike }).localStorage;

function readStoredMode(): ThemeMode {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // Storage unavailable (e.g. SSR/web hydration) — fall back to system.
  }
  return 'system';
}

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The concrete scheme to render with, after resolving `system`. */
  colorScheme: ResolvedScheme;
};

const [ThemeModeContext, useThemeMode] = createStrictContext<ThemeModeContextValue>('useThemeMode');

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const systemScheme = useColorScheme();

  // For explicit modes the value is known directly; for `system` fall back to
  // the OS scheme (defaulting to light when it's null/unspecified).
  const colorScheme: ResolvedScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      storage?.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort persistence; ignore failures.
    }
  }, []);

  // Push the override down to native UIKit/Android views. `'unspecified'`
  // reverts to the OS appearance (RN's value for "follow system").
  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);

  // Keep the root background (behind the React tree) in sync with the theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors[colorScheme].background).catch(() => {});
  }, [colorScheme]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, setMode, colorScheme }),
    [mode, setMode, colorScheme],
  );

  return <ThemeModeContext value={value}>{children}</ThemeModeContext>;
}

export { useThemeMode };
