/**
 * App-wide authentication state, backed by Supabase Auth.
 *
 * Identity is intentionally minimal — a Supabase `auth.users` row giving
 * `{ id, email }` — mirroring the web app. `user.id` ties a person to their
 * profile and observations and is the subject RLS (M4) scopes every write to.
 *
 * The provider seeds from the persisted session (`getSession`) then tracks
 * `onAuthStateChange`, so external sign-outs and token refreshes stay in sync.
 * `initialized` flips true after the first resolution; the root layout holds the
 * splash until then so there's no sign-in flash on a warm start.
 *
 * Sign-in deviates from the web's magic-link: native social sign-in via
 * `signInWithIdToken` (Apple on iOS, Google on Android/iOS), with the email
 * magic-link kept as a secondary, deep-link-redeemed fallback.
 */

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { sv } from '@/lib/i18n/sv';
import { createStrictContext } from '@/lib/create-strict-context';
import { persister, queryClient } from '@/lib/query-client';
import { unregisterCurrentDeviceToken } from '@/lib/query/push-tokens';
import { supabase } from '@/lib/supabase';
import { emailInput } from '@/lib/validation/auth';

// The *Web* OAuth client id — Supabase verifies the Google ID token against it,
// and the native lib needs it to request an ID token at all. Lives in `.env`
// (see `.env.example`). Without it, `signInWithGoogle` reports a clear error.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Configure the native Google client once at module load (synchronous, safe).
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

/** A `cancelled` result means the user dismissed the provider sheet — not an error. */
export type AuthActionResult = { error?: string; cancelled?: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** False until the first session lookup resolves. */
  initialized: boolean;
  signInWithApple: () => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  sendMagicLink: (email: string) => Promise<AuthActionResult>;
  /** Redeem the `?code=` from the `mafk://auth/callback` deep link (PKCE). */
  exchangeMagicLinkCode: (code: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  /**
   * Permanently delete the account + all personal data (Apple 5.1.1(v) / Google
   * data-deletion). Calls the `delete-account` edge function, then clears the
   * local session. Resolves with `{ error }` on failure (nothing is destroyed).
   */
  deleteAccount: () => Promise<AuthActionResult>;
};

const [AuthContext, useAuth] = createStrictContext<AuthContextValue>('useAuth');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let initialSessionResolved = false;

    // Seed from the persisted session, then keep in sync with auth changes
    // (sign-in/out, token refresh) for the rest of the app's lifetime.
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      initialSessionResolved = true;
      setSession(data.session);
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (initialSessionResolved) setInitialized(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithApple = useCallback(async (): Promise<AuthActionResult> => {
    try {
      // Apple binds the identity token to a nonce: send Apple the SHA-256 *hash*
      // and Supabase the *raw* nonce; Supabase checks they correspond. Stops a
      // captured token being replayed.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) return { error: sv.login.errors.appleFailed };
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      return { error: error?.message };
    } catch (e) {
      if (
        e instanceof Error &&
        (e as { code?: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return { cancelled: true };
      }
      return { error: sv.login.errors.appleFailed };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    if (!GOOGLE_WEB_CLIENT_ID) return { error: sv.login.errors.googleFailed };
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return { cancelled: true };
      const idToken = response.data?.idToken;
      if (!idToken) return { error: sv.login.errors.googleFailed };
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      return { error: error?.message };
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        return { cancelled: true };
      }
      return { error: sv.login.errors.googleFailed };
    }
  }, []);

  const sendMagicLink = useCallback(async (email: string): Promise<AuthActionResult> => {
    const parsed = emailInput.safeParse({ email });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? sv.login.errors.invalidEmail };
    }
    // The link redirects to `mafk://auth/callback?code=…`, redeemed by the
    // `auth/callback` route. PKCE (set on the client) keys the verifier to this
    // device, so the link must be opened here.
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: Linking.createURL('/auth/callback') },
    });
    return { error: error ? sv.login.errors.sendFailed : undefined };
  }, []);

  const exchangeMagicLinkCode = useCallback(async (code: string): Promise<AuthActionResult> => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // On success the auth listener flips the session and the gate routes us in.
    return { error: error ? sv.login.errors.callbackFailed : undefined };
  }, []);

  const signOut = useCallback(async () => {
    // Stop this device receiving club alerts for the account being signed out —
    // best-effort, and BEFORE clearing the session (the owner-scoped RLS delete
    // needs the user's auth).
    await unregisterCurrentDeviceToken().catch(() => {});
    await supabase.auth.signOut();
    // Drop ALL cached + persisted data so the previous user's feed/profile is
    // never shown (or rehydrated from disk) to whoever signs in next on this
    // device. `clear()` empties memory; `removeClient()` wipes the on-disk cache.
    queryClient.clear();
    void persister.removeClient();
    // Best-effort: also clear the native Google session so the account picker
    // reappears next time instead of silently reusing the last account.
    try {
      await GoogleSignin.signOut();
    } catch {
      // No Google session (signed in via Apple/email) — nothing to clear.
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<AuthActionResult> => {
    // Best-effort: stop this device receiving alerts BEFORE the account (and its
    // owner-scoped RLS rights) is gone.
    await unregisterCurrentDeviceToken().catch(() => {});
    // The edge function reads the user id from the forwarded JWT and deletes all
    // personal data + the auth user with the service role. A non-2xx surfaces as
    // `error` and nothing local is cleared, so the user stays signed in.
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) return { error: sv.profile.deleteAccount.failed };
    // Account is gone. Clear the now-orphaned local session (local scope — the
    // server token is already invalid) + all cached/persisted data; the auth
    // listener then routes back to sign-in.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    queryClient.clear();
    void persister.removeClient();
    try {
      await GoogleSignin.signOut();
    } catch {
      // No native Google session — nothing to clear.
    }
    return {};
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initialized,
      signInWithApple,
      signInWithGoogle,
      sendMagicLink,
      exchangeMagicLinkCode,
      signOut,
      deleteAccount,
    }),
    [
      session,
      initialized,
      signInWithApple,
      signInWithGoogle,
      sendMagicLink,
      exchangeMagicLinkCode,
      signOut,
      deleteAccount,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export { useAuth };
