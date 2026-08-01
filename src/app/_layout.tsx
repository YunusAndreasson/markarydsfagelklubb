import { useQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfirmSheet } from '@/components/confirm-sheet';
import { ErrorBlock } from '@/components/state-block';
import { ToastHost } from '@/components/toast';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { useTheme } from '@/hooks/use-theme';
import { ThemeModeProvider, useThemeMode } from '@/hooks/use-theme-mode';
import { sv } from '@/lib/i18n/sv';
import { configureNotificationHandler } from '@/lib/notifications';
import { persister, PERSIST_BUSTER, PERSIST_MAX_AGE, queryClient } from '@/lib/query-client';
import { myProfileQueryOptions } from '@/lib/query/profile';

// Hold the splash until auth + profile resolve, so a warm start with a persisted
// session goes straight to the app (or onboarding) instead of flashing sign-in.
void SplashScreen.preventAutoHideAsync();

// Show club alerts as a banner even when the app is foregrounded (set once,
// before React mounts).
configureNotificationHandler();

export default function RootLayout() {
  return (
    // GestureHandlerRootView must wrap the whole app so gesture-based UI added in
    // later milestones (maps, sheets, swipes) receives native touch events.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeModeProvider>
        {/* Persist the query cache to disk so the app opens to the last-known
            feed/profile offline, then refetches when online. */}
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: PERSIST_BUSTER }}
        >
          <AuthProvider>
            <SafeAreaProvider>
              <ThemedNavigation />
            </SafeAreaProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ThemeModeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The app's native-sheet recipe, shared by every `formSheet` route (the lokal
 * peek, the three report-form pickers, the feed filter). Grabber, corner radius
 * and a shown header are identical across all of them by design — only the
 * detents differ, so those are the argument. Keeps a new sheet from drifting
 * onto a different corner radius or losing its grabber.
 */
function sheetOptions(detents: number[], title?: string) {
  return {
    headerShown: true,
    title,
    presentation: 'formSheet' as const,
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: SurfaceRadius.lg,
  };
}

// Feeds our token palette into React Navigation's theme so screen backgrounds,
// headers and transitions use brand colors (and never flash white in dark mode).
// `ThemeProvider`/`DarkTheme`/`DefaultTheme` come from expo-router's bundled
// navigation core — there is no separate `@react-navigation/native` package.
function ThemedNavigation() {
  const { colorScheme } = useThemeMode();
  const theme = useTheme();
  const { session, initialized } = useAuth();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  // Resolve the profile alongside the session (mirrors the web `_authed` gate's
  // `ensureQueryData`). `fetchMyProfile` returns null for "no row" → onboarding;
  // only a thrown error means we genuinely couldn't resolve it.
  const userId = session?.user.id ?? '';
  const profileQuery = useQuery({ ...myProfileQueryOptions(userId), enabled: !!session });
  const profileSettled = !session || profileQuery.isSuccess || profileQuery.isError;
  const ready = initialized && profileSettled;
  const hasProfile = !!profileQuery.data;

  // Keep this device's push token registered + route notification taps (M14).
  // The flag says when the signed-in routes are mounted (the gate below renders
  // a spinner until `ready`), so a cold-start tap is buffered, not dropped.
  usePushRegistration(ready && !!session && hasProfile);

  // Reveal the app once session + profile are known; until then the gate below
  // renders a spinner, and the splash hides the brief signed-out → signed-in
  // correction.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Hold until session + profile are known. On cold start the splash covers
  // this; after a sign-in (while the profile loads) it reads as a brief spinner
  // rather than a frozen blank, and avoids flickering onboarding before the
  // profile resolves.
  if (!ready) {
    return (
      <ThemedView style={styles.errorScreen}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  // Profile fetch failed (network/RLS) — don't guess `hasProfile` and mis-route
  // into onboarding; surface a retry instead.
  if (session && profileQuery.isError) {
    return (
      <ThemedView style={styles.errorScreen}>
        <ErrorBlock
          error={profileQuery.error}
          onRetry={() => void profileQuery.refetch()}
          retrying={profileQuery.isFetching}
        />
      </ThemedView>
    );
  }

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: theme.tint,
          background: theme.background,
          // `card` backs the navigation headers. Keep it equal to the screen
          // background so the top bar reads as seamless chrome (not a brighter
          // elevated surface) and matches the bottom tab bar exactly.
          card: theme.background,
          text: theme.foreground,
          border: theme.border,
          notification: theme.destructive,
        },
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          // Seamless chrome + the iOS-native chevron-only back button (no long
          // "previous title" text) on the pushed observation/member screens.
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        {/* Signed out: only the sign-in flow + the magic-link callback. */}
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="auth/callback" />
        </Stack.Protected>
        {/* Signed in, no profile row yet: first-run onboarding. */}
        <Stack.Protected guard={!!session && !hasProfile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        {/* Signed in + onboarded: the app. `(tabs)` is the bottom-tab shell
            (Larm · Profil) and owns "/"; the new-observation compose modal and
            the observation/member routes push over it; `kitchensink` is the M2
            primitives showcase, gated to `__DEV__` in the screen itself so it
            can't be reached in production. */}
        <Stack.Protected guard={!!session && hasProfile}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          {/* "Larma" — raise a new bird alarm. A compose modal opened from the
              Larm tab header (was the center tab before the IA merge). */}
          <Stack.Screen
            name="new"
            options={{ headerShown: true, title: sv.observation.titleNew, presentation: 'modal' }}
          />
          <Stack.Screen
            name="observation/[id]/index"
            options={{ headerShown: true, title: sv.observation.titleDetail }}
          />
          <Stack.Screen
            name="observation/[id]/edit"
            options={{ headerShown: true, title: sv.observation.titleEdit, presentation: 'modal' }}
          />
          <Stack.Screen
            name="member/[userId]"
            options={{ headerShown: true, title: sv.member.title }}
          />
          {/* A lokal's larm peek — a REAL native sheet (UISheetPresentationController
              on iOS / native sheet on Android): grabber, detents, rubber-band drag
              and swipe-to-dismiss all from the OS, no hand-rolled Modal. Opened from
              the Lokaler map. */}
          {/* The title lives in the native sheet header (headerShown), not in the
              content — a custom in-content title overlapped the first row. The
              header title is set inline from the lokal name. */}
          <Stack.Screen name="location/[id]" options={sheetOptions([0.5, 0.9])} />
          {/* Report-form pickers — each is a REAL native sheet (formSheet). The
              field opens the route and awaits its selection via the picker bridge
              (`lib/picker-bridge`). Title in the native header; grabber +
              swipe-to-dismiss come from the OS. */}
          <Stack.Screen
            name="picker/activity"
            options={sheetOptions([0.6], sv.observation.activityPickTitle)}
          />
          <Stack.Screen
            name="picker/species"
            options={sheetOptions([0.9], sv.observation.speciesLabel)}
          />
          <Stack.Screen
            name="picker/location"
            options={sheetOptions([0.6, 0.9], sv.observation.locationLabel)}
          />
          {/* Larm feed filter — a native sheet like the pickers; reads/writes the
              shared feed-filter store so the feed behind updates live as chips toggle. */}
          <Stack.Screen name="filter" options={sheetOptions([0.6, 0.9], sv.filter.title)} />
          <Stack.Screen
            name="blocked"
            options={{ headerShown: true, title: sv.blockedMembers.title }}
          />
          <Stack.Screen name="kitchensink" />
        </Stack.Protected>
      </Stack>
      {/* Root-mounted so a toast fired from a mutation callback survives the
          originating screen unmounting (e.g. report → navigate to Obsar). */}
      <ToastHost />
      {/* Root confirm host. The edit modal mounts its own on top (an RN Modal
          hosted here presents BEHIND a native-stack modal on iOS). */}
      <ConfirmSheet />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

/**
 * App-wide render-error net.
 *
 * Expo Router wraps a route in a React error boundary whenever its file exports
 * `ErrorBoundary` — this being the root layout, that covers everything below it.
 * Without one, a single throw during render is an uncaught JS error, which in a
 * release build kills the process (Play Vitals reports it as
 * `com.facebook.react.common.JavascriptException`). With one, the user gets a
 * screen they can retry from, and the app survives.
 *
 * It renders in place of the provider subtree it is catching, so it must not
 * reach for `useTheme`/`useThemeMode` (those would throw on a missing provider
 * and take the boundary down with them). It reads the palette straight off
 * `Colors` using React Native's own `useColorScheme`.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];

  // A throw *before* the gate opens leaves the splash up (only the `ready` effect
  // hides it, and that subtree is gone) — which would hide this screen behind it.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={[styles.errorScreen, { backgroundColor: palette.background }]}>
      <Text style={[styles.errorTitle, { color: palette.foreground }]}>
        {sv.errors.somethingWrong}
      </Text>
      <Text style={[styles.errorMessage, { color: palette.mutedForeground }]}>
        {sv.errors.somethingWrongHelp}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={[styles.errorButton, { backgroundColor: palette.primary }]}
      >
        <Text style={[styles.errorButtonLabel, { color: palette.primaryForeground }]}>
          {sv.errors.tryAgain}
        </Text>
      </Pressable>
      {/* The message is the one thing that makes a user's screenshot actionable;
          it is never shown anywhere else once the tree is gone. */}
      {__DEV__ ? (
        <Text style={[styles.errorDetail, { color: palette.mutedForeground }]}>{error.message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorScreen: { flex: 1, justifyContent: 'center', padding: Spacing.three, gap: Spacing.two },
  errorTitle: { fontSize: 20, fontWeight: '600' },
  errorMessage: { fontSize: FontSize.input, lineHeight: 22 },
  errorButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.sm,
  },
  errorButtonLabel: { fontSize: FontSize.input, fontWeight: '600' },
  errorDetail: { fontSize: 12 },
});
