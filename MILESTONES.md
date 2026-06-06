# mafk-mobie — Expo app milestones

Native Expo (SDK 56) app for **Markaryds Fågelklubb**'s bird-reporting tool. This
is the native sibling of the **mafk** web app (`../mafk`), built using the
patterns of the reference Expo app **edenmind-v2** (`../edenmind-v2/mobile`).

> **How to use this file.** Each milestone below is a self-contained unit of work
> meant to become its own Claude plan (run `/plan` per milestone — do **not** try
> to do several at once). Milestones are ordered by dependency. Every milestone
> lists: **Goal**, **Why/notes**, **References** (real file paths in both repos),
> **New deps**, **Deliverables**, **Acceptance**, and **Risks/decisions**.

All UI is **Swedish**. Design **mobile-first**. The web app (`../mafk`) is the
near-perfect product reference — replicate its features and flows; only deviate
where native is *genuinely* better (auth, maps, camera, push, navigation).

---

## Reference projects

| What | Where | Use it for |
|---|---|---|
| Product + domain + copy reference | `../mafk` (TanStack Start + Drizzle + Supabase web app) | Features, flows, data shapes, Swedish copy, validation, theme color |
| Expo engineering reference | `../edenmind-v2/mobile` (Expo SDK 56) | Project structure, routing, Supabase client, theming, components, native concerns, EAS |
| This app | `../mafk-mobie` (currently empty) | The native app we are building |

Both reference repos are read-only inspiration — **do not modify `../edenmind-v2`**.
`../mafk` may be touched only for the **shared backend** work in Milestone 4
(RLS/policies/seeds live in `../mafk/db` and `../mafk/supabase`).

---

## Locked decisions (carried from mafk, adapted for native)

These mirror `../mafk/CLAUDE.md` "Inlåsta beslut". Do not renegotiate without the user.

1. **Språk.** All UI is Swedish. Strings come from the web app's
   `../mafk/src/lib/i18n/sv.ts` — port it as the copy source of truth. No English fallbacks.
2. **Mobile-first.** Designed for phones held one-handed. Touch targets ≥ 44px.
   Bottom tab navigation. Haptics on meaningful interactions.
3. **Shared Supabase backend.** The app talks to the **same** Supabase project as
   mafk web (project-ref `zgnmajovyqibgxlcomvb`, eu-north-1). Same DB, same `auth.*`,
   same storage bucket. This is exactly how `../edenmind-v2/mobile/.env.example`
   shares its web project. Publishable key (`sb_publishable_*`) ships in the client.
4. **One UI system, one icon set.** Design tokens in `src/constants/`, themed
   primitives in `src/components/` (edenmind pattern). No ad-hoc colors.
5. **`auth.*` is owned by Supabase.** Never mutate it.

### The one big architectural delta: RLS becomes the primary boundary

The web app's #1 rule is "**server functions are the only path to the DB**" —
Drizzle connects as the table owner and **bypasses RLS**, and nothing reads via
PostgREST/supabase-js (`../mafk/CLAUDE.md`, Arkitekturprinciper 1–3). The web app
therefore **deliberately deferred owner-scoped RLS policies to v2** ("andra
läsvägen").

**The mobile app *is* that second read path.** It reads/writes Supabase directly
with the publishable key, so **Row Level Security is now the real security
boundary** and must be fully specified and tested. This is the single most
important difference from the web app and is its own milestone (**M4**). Until
those policies exist, PostgREST returns nothing (RLS is enabled but policy-less =
deny-by-default), so M4 blocks every data-driven screen.

---

## Web → native replacement map

| Web (mafk) | Native (mafk-mobie) | Milestone |
|---|---|---|
| Magic-link email auth (`signInWithOtp`) | **Sign in with Apple + Google** (`signInWithIdToken`), email magic-link optional | M5 |
| Server functions (`src/server/fns/*`) | Direct `supabase-js` queries/mutations + RPC + edge functions | M3, M4 |
| Leaflet / react-leaflet / OSM tiles | `react-native-maps` (Apple/Google Maps) | M8 |
| Browser Geolocation + Permissions API (`src/lib/geo.ts`) | `expo-location` | M8 |
| `<input type=file>` + `browser-image-compression` | `expo-image-picker` + `expo-image-manipulator` | M10 |
| Web Push (Service Worker + VAPID, `push_subscriptions`) | `expo-notifications` device tokens + Expo Push API | M14 |
| PWA "add to home screen" (`install-pwa-button.tsx`) | **Removed** — the native app *is* the install | — |
| `navigator.vibrate` (`src/lib/haptics.ts`) | `expo-haptics` vocabulary (edenmind `src/lib/haptics.ts`) | M2 |
| CSS `<input datetime-local>` | native date/time picker | M9 |
| shadcn/Base UI (Drawer, Dialog, Command) | edenmind themed primitives + bottom sheet + `FlatList` | M2, M9 |
| `next-themes` + CSS vars | `expo-system-ui` + persisted theme mode (edenmind `use-theme-mode.tsx`) | M2 |

---

## Locked choices (confirmed 2026-06-05)

- **Auth methods:** **Apple + Google as primary, email magic-link as secondary
  fallback.** Apple is required by the App Store when any third-party login is
  offered. Magic-link needs `mafk://auth/callback?code=` deep-link handling. (M5)
- **Repo shape:** **Standalone Expo app in `../mafk-mobie`** — its own repo,
  sharing only the **backend** with mafk (not code). Port the Zod schemas and
  regenerate Supabase types; do not set up a shared monorepo. (M1, M3)
- **Maps provider:** **`react-native-maps` with native tiles** — Apple Maps on
  iOS, Google Maps on Android. Requires a Google Maps API key + Android SHA-1.
  (M8)

## Still open (decide in-milestone)

- **Push:** reuse the `push_subscriptions` table with an added `expo_push_token`
  path, **or** a new `device_push_tokens` table (Expo tokens ≠ web-push
  endpoint/p256dh/auth). → suggest **new table**, decided in M4/M14.

---

# Milestones

## M1 — Scaffold the Expo app  ✅ DONE (2026-06-05)
**Status.** Complete & verified on-device. App boots on the Android emulator and
renders the Swedish placeholder ("Markaryds Fågelklubb" / "Fågelrapportering för
medlemmar" / "Under utveckling"). `tsc --noEmit`, `expo lint`, `expo export`
(Hermes), and the native `app-debug.apk` build all pass. Identity locked:
slug/scheme `mafk`, bundle id `nu.markarydsfagelklubb.mafk`. Next: **M2**.

**Goal.** A booting Expo SDK 56 + expo-router app on iOS simulator / Android
emulator showing a placeholder screen, with the project conventions in place.

**Why/notes.** Mirror edenmind's structure and tooling exactly so later
milestones drop in cleanly.

**References.**
- Structure & config: `../edenmind-v2/mobile/package.json`, `app.json`,
  `eas.json`, `babel.config.js`, `tsconfig.json` (path alias `@/*` → `./src/*`),
  `eslint.config.js`, `scripts/dev-android.sh`, `AGENTS.md`.
- Folder layout to recreate: `src/app/`, `src/components/`, `src/constants/`,
  `src/hooks/`, `src/lib/`.
- App identity from `../mafk` (name "Markaryds Fågelklubb" / "mafk", Swedish,
  portrait, scheme `mafk`).

**New deps.** `expo` (SDK 56), `expo-router`, `react`/`react-native` (pinned by
SDK), `react-native-safe-area-context`, `react-native-screens`,
`react-native-gesture-handler`, `react-native-reanimated`, `expo-constants`,
`expo-status-bar`, `expo-splash-screen`, `expo-system-ui`. Dev: `typescript`
(strict), `eslint` + `eslint-config-expo`.

**Deliverables.** `app.json` (bundle ids `nu.markarydsfagelklubb.mafk` or similar,
scheme `mafk`, `typedRoutes` + `reactCompiler` experiments, splash, icons
placeholder), `tsconfig.json` with `@/*` alias, `babel.config.js` (include the
Supabase variable-dynamic-import stub from edenmind `babel.config.js`),
`eslint.config.js`, `eas.json` (dev/preview/production profiles), `.gitignore`,
root `src/app/_layout.tsx` + `src/app/index.tsx` placeholder, dev scripts.

**Acceptance.** `expo start` boots; app launches on a simulator (via Argent) and
shows a placeholder Swedish screen; `tsc --noEmit` and `eslint` pass.

**Risks/decisions.** Lock bundle identifiers and `scheme` now (used by deep links
+ OAuth redirects in M5). **Decided:** standalone Expo app — no monorepo.

---

## M2 — Design system & theming
**Goal.** The visual foundation: Markaryd-green theme tokens, light/dark with
persisted mode, themed primitives, and a haptics vocabulary — before any feature
screens.

**Why/notes.** edenmind builds every screen from tokens + themed primitives; do
the same so feature milestones are pure composition. Pull the brand color and
component shapes from mafk.

**References.**
- Tokens & theming (edenmind): `src/constants/theme.ts` (Colors light/dark,
  Spacing, fonts, elevation), `surface.ts` (radii, elevation recipe),
  `shared-styles.ts`, `motion.ts` (Duration/Spring/Curve/HitSlop);
  `src/hooks/use-theme.ts`, `use-color-scheme.ts(.web.ts)`, `use-theme-mode.tsx`.
- Primitives (edenmind): `src/components/themed-text.tsx`, `themed-view.tsx`,
  `screen.tsx`, `button.tsx`, `text-field.tsx`, `pressable-scale.tsx`, `icon.tsx`,
  `skeleton.tsx`, `section-header.tsx`, `list-card.tsx`, `state-block.tsx`.
- Brand color & component shapes (mafk): `../mafk/src/styles/app.css` (primary =
  Markaryd green `oklch(0.52 0.13 152)`, plus secondary/muted/destructive),
  `../mafk/src/components/ui/{button,card,badge,input,skeleton,separator}.tsx`.
- Haptics: port edenmind `src/lib/haptics.ts` (7-intent vocabulary, `setHapticsEnabled`).

**New deps.** `expo-haptics`, `expo-symbols` (iOS) + `@expo/vector-icons`
(Android), `@shopify/react-native-skia` only if charts are needed later (defer).

**Deliverables.** `src/constants/theme.ts` with the green primary converted to
hex/RGB, full Spacing/radii/motion tokens; `src/hooks/use-theme*`; themed
primitives listed above; `src/lib/haptics.ts`. A small "kitchen-sink" demo screen
to eyeball tokens (can be removed later).

**Acceptance.** Demo screen renders typography ladder, buttons, inputs, cards in
both light & dark; theme mode persists across relaunch; haptics fire on press
(verify on device via Argent).

**Risks/decisions.** Convert OKLCH → sRGB carefully (the brand green must match
the web). Decide font strategy (edenmind uses native system fonts; mafk uses Inter
— **suggest native system fonts** for performance, Inter optional).

---

## M3 — Supabase client + data & logic foundation
**Goal.** A typed Supabase client wired to the shared project, plus all portable
domain logic (types, Zod validation, feed bucketing, query keys, Swedish copy,
TanStack Query) — independent of any screen.

**Why/notes.** Most of this is a near-verbatim port from mafk; doing it once
unblocks every feature. No server functions — the client reads/writes directly.

**References.**
- Supabase client (edenmind): `src/lib/supabase.ts` (`createClient<Database>`,
  `react-native-url-polyfill/auto`, `expo-sqlite/localStorage/install` storage
  adapter, `autoRefreshToken`/`persistSession`, `detectSessionInUrl: false`,
  AppState-driven refresh), `.env.example` (EXPO_PUBLIC_ prefixes),
  `src/lib/create-strict-context.ts`.
- Schema / types: `../mafk/src/lib/db/schema.ts` (profiles, species, locations,
  observations, push_subscriptions) → generate `src/lib/database.types.ts` from
  the live project (edenmind has one at `src/lib/database.types.ts`).
- Validation to port (mafk): `../mafk/src/lib/validation/{auth,observation,
  profile,storage,location,push}.ts` (+ their `.test.ts`).
- Domain logic to port (mafk): `../mafk/src/lib/feed.ts` (today/yesterday/
  thisWeek/earlier bucketing, Stockholm TZ), `../mafk/src/lib/query/keys.ts`,
  `../mafk/src/lib/i18n/sv.ts` (the entire Swedish dictionary + time formatters).
- Data contracts to replicate (mafk server fns → direct queries):
  `../mafk/src/server/fns/{observations,species,locations,profile,storage,push}.ts`
  — note `FeedObservation` shape in `observations.ts` (the joined feed row).
- Query layer pattern (edenmind): `src/lib/query/{stacks,invalidation}.ts`
  (queryKeys factories, `queryOptions`, `useMutation` + invalidation).

**New deps.** `@supabase/supabase-js`, `@tanstack/react-query`,
`react-native-url-polyfill`, `expo-sqlite`, `zod`, `date-fns`.

**Deliverables.** `src/lib/supabase.ts`, `.env` + `.env.example` (pointing at the
shared project), `src/lib/database.types.ts` (generated), ported `src/lib/
validation/*`, `src/lib/feed.ts`, `src/lib/i18n/sv.ts`, `src/lib/query/keys.ts`,
`src/lib/create-strict-context.ts`, a `QueryClient` instance, and **data-access
modules** under `src/lib/query/` for species, locations, observations, profile,
storage (the direct-Supabase equivalents of the web server fns), each returning
the same shapes (e.g. `FeedObservation`). Port the validation `.test.ts` files.

**Acceptance.** `tsc` passes against generated types; ported validation tests
pass; a throwaway script/screen can call `listSpeciesFn`-equivalent and log rows
(may return empty until M4 RLS — that's expected).

**Risks/decisions.** snake_case (DB) ↔ camelCase (app) mapping — follow the
edenmind `fetchMyStacks` mapping pattern. The web `FeedObservation` attaches
**signed image URLs** server-side; decide where to mint those on mobile (client
calls `storage.createSignedUrl`, batched) — see M10/M11.

---

## M4 — Backend hardening: RLS, storage policies, push fan-out (shared Supabase)
**Goal.** Make the shared Supabase backend safe and complete for **direct client
access**: owner-scoped RLS policies on every table, storage bucket policies, and a
server-side path for the push fan-out the web did in a server fn.

**Why/notes.** **This is the security-critical milestone and a prerequisite for
all data screens** (see "RLS becomes the primary boundary" above). The web app
deferred this; the mobile app forces it. Work happens against the shared project —
author SQL as migrations/policies, ideally committed under `../mafk/db/policies/`
(the repo already has that convention) and applied via the mafk migration
pipeline, or via Supabase migrations. **Treat as outward-facing/irreversible —
confirm with the user before applying to the live DB; prefer a Supabase branch.**

**References.**
- Existing policy convention (mafk): `../mafk/db/policies/README.md`,
  `../mafk/db/policies/0001_storage_user_uploads.sql`, `../mafk/db/migrations/*`.
- RLS intent (mafk): `../mafk/CLAUDE.md` Arkitekturprinciper 1–3 (what was
  deferred and why), schema `.enableRLS()` calls in `../mafk/src/lib/db/schema.ts`.
- Access patterns that policies must allow — derive from each server fn:
  `../mafk/src/server/fns/{observations,profile,locations,species,storage,push}.ts`
  (who can read/write what: species/locations world-readable to authed users;
  observations readable by all authed users, writable only by owner; profiles
  readable by all authed, writable by owner; admin-only location create via
  `profiles.is_admin`).
- Seeds (mafk): `../mafk/db/seeds/{swedish-birds.json,markaryd-locations.json}` —
  already loaded in the shared DB; mobile just reads them.

**New deps.** None in-app. Tooling: Supabase MCP / CLI for migrations & advisors.

**Deliverables.** RLS policies (SQL) for `profiles`, `species`, `locations`,
`observations`, `push_subscriptions` (or its M14 successor), and storage-object
policies for the uploads bucket (`STORAGE_BUCKET` in
`../mafk/src/server/fns/storage.ts`) scoping reads/writes to `auth.uid()`-prefixed
paths. A Supabase **RPC or Edge Function** for `createObservation`-with-alert
fan-out (the web does this in `observations.ts` → `src/server/push/send.ts`);
on mobile the insert is a direct call, so the alert side-effect must move to a DB
trigger / RPC / edge function. Run `get_advisors` (security lints) and fix.

**Acceptance.** With a real authed JWT (use M5 or a test token / Supabase SQL
editor): species & locations read; another user's observations read; insert/
update/delete only succeeds on own rows; cross-user writes denied; storage upload
only into own path. `get_advisors` shows no critical RLS gaps.

**Risks/decisions.** Live shared DB — **prefer a Supabase branch / staging first**.
Coordinate with web app owner. Decide whether policies live in `../mafk/db/policies`
(reuse pipeline) or a new migrations home. This milestone can be authored before
M5 but is fully *verified* once auth exists.

---

## M5 — Auth: Sign in with Apple + Google (+ session gate + onboarding)
**Goal.** Native social sign-in (Apple + Google), persisted session, an auth gate
that holds the splash until resolved, and the first-run onboarding (display name).

**Why/notes.** **User-flagged as an important step.** Native Apple/Google sign-in
is the "genuinely better on mobile" deviation from the web's magic-link. Apple is
**required** by the App Store when offering any third-party login. Flow & copy
otherwise follow mafk's login/onboarding.

**References.**
- Auth provider & gate (edenmind): `src/hooks/use-auth.tsx` (getSession +
  `onAuthStateChange` + `initialized`), `src/app/_layout.tsx` (provider stack +
  `Stack.Protected` guards + `SplashScreen.preventAutoHideAsync` until
  `initialized`), `src/app/index.tsx` (entry redirect), `src/app/(auth)/_layout.tsx`,
  `src/app/(auth)/sign-in.tsx` (sign-in screen shape).
- Flow & copy (mafk): `../mafk/src/routes/index.tsx` (landing → login),
  `../mafk/src/routes/login.tsx`, `../mafk/src/routes/auth/callback.tsx`,
  `../mafk/src/routes/_authed.tsx` (gate: no user → login, no profile →
  onboarding), `../mafk/src/routes/_authed/onboarding.tsx` (display-name capture),
  `../mafk/src/server/fns/auth.ts` + `profile.ts` (`upsertMyProfileFn`),
  `../mafk/src/lib/i18n/sv.ts` (`sv.login`, `sv.onboarding`).
- Supabase auth config (mafk): `../mafk/supabase/config.toml` (providers; will add
  Apple + Google client IDs, allowed redirect URLs for the `mafk` scheme).

**New deps.** `expo-apple-authentication`, Google sign-in via
`@react-native-google-signin/google-signin` **or** `expo-auth-session` +
`expo-web-browser` + `expo-crypto`; `expo-secure-store` optional. Supabase
`signInWithIdToken({ provider, token, nonce })`.

**Deliverables.** `src/hooks/use-auth.tsx` (+ strict context), root layout
provider stack & protected routes, `(auth)/sign-in.tsx` (Swedish: Apple button
per HIG + Google button + optional "logga in med e-post"), onboarding screen,
sign-out. Supabase dashboard/`config.toml` configured for Apple + Google
(client IDs, redirect URLs, nonce handling). Deep-link scheme `mafk` registered.

**Acceptance.** Cold start with no session → sign-in screen (no flash); Apple
sign-in and Google sign-in each create a Supabase session; first login with no
profile → onboarding → display name saved (`profiles` upsert succeeds under M4
RLS) → app; session persists across relaunch; sign-out returns to sign-in. Verify
on device via Argent.

**Risks/decisions.** Apple sign-in requires a paid Apple Developer account &
Services ID config; Google needs OAuth client IDs (iOS, Android, Web) + SHA-1 for
Android. Nonce must match between native token and Supabase. **Decided:** email
magic-link is kept as a secondary method — implement `mafk://auth/callback?code=`
deep-link handling (`expo-linking`) that calls `exchangeCodeForSession`.

---

## M6 — App shell & navigation
**Goal.** The tab + stack navigation skeleton with placeholder screens, matching
the web's IA: Home (feed) · center "+" (new observation) · Profile, plus stacks
for observation detail/new/edit and member pages.

**Why/notes.** Establish routing before filling screens. The web uses a 3-slot
bottom nav with a prominent center FAB; replicate natively.

**References.**
- Tabs & stacks (edenmind): `src/app/(tabs)/_layout.tsx` (NativeTabs / Tabs,
  icons, platform tint, haptics on Android press), nested stack example
  `src/app/(tabs)/settings/_layout.tsx`, full-screen modal pattern in
  `src/app/_layout.tsx` (`presentation: "fullScreenModal"`).
- IA & FAB (mafk): `../mafk/src/components/app/bottom-nav.tsx` (Home + center
  `+` FAB to `/observation/new` + Profile), `../mafk/src/components/app/
  app-shell.tsx`, route tree under `../mafk/src/routes/_authed/`.
- Icons: `HomeIcon`, `PlusIcon`, `UserIcon` (lucide) → SF Symbols / Material
  equivalents via `src/components/icon.tsx`.

**New deps.** None beyond expo-router (already in M1).

**Deliverables.** `src/app/(tabs)/_layout.tsx` with Home/Profile tabs + a center
"new observation" affordance (custom tab button or FAB overlay), placeholder
screens for `(tabs)/index` (feed), `(tabs)/profile`, and stack routes
`observation/new`, `observation/[id]/index`, `observation/[id]/edit`,
`member/[userId]`. Deep-link-ready route names.

**Acceptance.** Can navigate Home ↔ Profile ↔ New ↔ Detail ↔ Edit ↔ Member with
placeholders; back gestures behave; safe-area respected; the "+" affordance is
prominent and reachable one-handed. Verify via Argent.

**Risks/decisions.** Center FAB on a native tab bar needs a custom tab button or
an overlaid FAB — decide which. Whether "new observation" is a tab or a pushed
modal (**suggest pushed screen/modal**, matching the web's dedicated route).

---

## M7 — Profile & settings
**Goal.** The user's own profile/settings screen: edit display name & phone,
avatar, email + admin badge display, theme picker, sign out. (Push toggle &
location permission UI land in M14/M8 respectively but their rows can be stubbed.)

**References.**
- Screen & flow (mafk): `../mafk/src/routes/_authed/profile.tsx`,
  `../mafk/src/components/app/theme-picker.tsx`,
  `../mafk/src/server/fns/profile.ts` (`fetchMyProfileFn`, `upsertMyProfileFn`),
  validation `../mafk/src/lib/validation/profile.ts` (displayName 1–60, phone
  ≥6 digits, `digitsForTel`).
- Settings UI primitives (edenmind): `src/app/(tabs)/settings/index.tsx`,
  `src/components/settings/{settings-group,settings-row,settings-action-row,
  settings-form-input}.tsx`, `src/hooks/use-theme-mode.tsx`.

**New deps.** None new (avatar upload reuses M10; can stub until then).

**Deliverables.** `(tabs)/profile.tsx` with name/phone form (TextField +
validation + haptic on error), avatar (placeholder until M10), email + admin
badge, theme mode picker (system/light/dark), sign-out button. Profile query +
upsert mutation with invalidation.

**Acceptance.** Loads current profile; editing name/phone persists (RLS-scoped
upsert) and reflects after relaunch; theme picker switches & persists; sign-out
works. Verify via Argent.

**Risks/decisions.** Avatar upload depends on M10 — keep the avatar row but wire
the picker in M10.

---

## M8 — Maps & geolocation
**Goal.** Native maps + GPS: a reusable map component (draggable/tap-to-set
marker, fit-bounds, recenter), current-position via `expo-location`, and
permission handling — the substrate for the location picker and observation map.

**Why/notes.** Web uses Leaflet + browser geolocation; native uses
`react-native-maps` + `expo-location`. Keep the same UX (tap/drag to set a point,
"använd min position", accuracy readout).

**References.**
- Map components (mafk): `../mafk/src/components/app/leaflet-map.tsx`
  (draggable marker, click-to-set, fit bounds, imperative recenter),
  `map-view.tsx` (lazy wrapper), `observation-map.tsx` (inline preview +
  fullscreen modal), `location-picker.tsx` ("use my position", accuracy ±m,
  blocked state), `location-permission-section.tsx`.
- Geolocation (mafk): `../mafk/src/lib/geo.ts` (`getCurrentPosition`,
  `getGeoPermission`, `watchGeoPermission` — replicate the return shapes).
- Copy (mafk): `sv` strings for location/permission in `i18n/sv.ts`.

**New deps.** `react-native-maps`, `expo-location`.

**Deliverables.** `src/components/map.tsx` (marker, tap/drag-to-set onPick,
fit-bounds, recenter token), an `observation-map` preview + fullscreen modal,
`src/lib/geo.ts` native port (expo-location), permission-request UX. Android
Google Maps API key wired in `app.json` if Google provider chosen.

**Acceptance.** Map renders with markers; tapping/dragging updates the chosen
coordinate; "använd min position" fills coords + shows accuracy; denied
permission shows guidance; fullscreen preview opens/closes. Verify via Argent.

**Risks/decisions.** **Decided:** `react-native-maps` with native provider tiles
(Apple Maps iOS / Google Maps Android). Provision a Google Maps API key + add the
Android SHA-1; set it in `app.json`. Marker drag uses `react-native-maps`
`onDragEnd`.

---

## M9 — Form inputs: species, locations, count, datetime, activity
**Goal.** The reusable observation-form building blocks as native pickers:
species picker (search + virtualized ~300 list + "Olistad art"), location picker
(saved locations + map point + GPS), count stepper, native datetime picker,
activity single-select.

**Why/notes.** These compose into the create/edit form (M12). The web builds them
as drawers/command palettes; native uses bottom sheets + `FlatList`.

**References.**
- Pickers (mafk): `../mafk/src/components/app/species-picker.tsx` (deferred
  search, `@tanstack/react-virtual` row list `ROW_HEIGHT=64`, "Olistad art"
  pinned, auto-scroll to selected, haptic on pick), `location-picker.tsx`,
  `datetime-picker.tsx` (max = now, "Idag 14:30" label), and the count stepper +
  activity-chips sections inside `observation-form.tsx`.
- Data (mafk): `../mafk/src/server/fns/{species,locations}.ts`,
  validation `../mafk/src/lib/validation/observation.ts` (`ACTIVITIES` order +
  labels), activity labels in `i18n/sv.ts` (`sv.observation.activity.*`).
- Native list/sheet patterns (edenmind): `src/components/swipe-card.tsx`,
  `context-menu.tsx`, `segmented-picker.tsx`; `FlatList` for virtualization.

**New deps.** `@gorhom/bottom-sheet` (sheets) + `@react-native-community/
datetimepicker` (or `expo`'s date picker); `FlatList` is built-in (no
react-virtual needed).

**Deliverables.** `SpeciesPicker`, `LocationPicker` (composes M8 map),
`CountStepper`, `DateTimePicker`, `ActivityPicker` — each themed, haptic, Swedish,
with the same validation semantics as the web.

**Acceptance.** Species search filters the full list smoothly; "Olistad art"
selectable; location picker yields either a saved location or a coordinate;
count clamps to valid range; datetime cannot be in the future; activity is
single-select and required. Verify via Argent.

**Risks/decisions.** Confirm bottom-sheet lib. Date picker UX differs iOS vs
Android — wrap to a single component.

---

## M10 — Image capture & upload
**Goal.** Pick/take a photo, compress/resize, upload to the shared Supabase
storage bucket via signed URL, display via `expo-image`; used for observation
photos and profile avatars.

**References.**
- Upload flow (mafk): `../mafk/src/components/app/image-upload.tsx` (accepts
  JPEG/PNG/WebP/HEIC ≤ 8 MB, compress > 800 KB, preview, remove, signed-URL PUT),
  `../mafk/src/server/fns/storage.ts` (`createUploadUrlFn` → server-generated
  path `${userId}/...`, `getSignedUrlFn`, `deleteUploadFn`),
  validation `../mafk/src/lib/validation/storage.ts` (`ALLOWED_MIME`,
  `MAX_UPLOAD_BYTES`, path schema).
- Native image display (edenmind): uses `expo-image` (`src/components/...`).

**New deps.** `expo-image-picker` (camera + library), `expo-image-manipulator`
(resize/compress), `expo-file-system` (upload), `expo-image` (display).

**Deliverables.** `src/components/image-upload.tsx` (observation: rectangular;
avatar: square), a storage data module mirroring `storage.ts` semantics
(signed upload URL via `supabase.storage.createSignedUploadUrl`, read URLs via
`createSignedUrl`, ownership-scoped delete), wired into Profile (M7) avatar.

**Acceptance.** Can pick from library and take with camera; large images
compress under the limit; upload lands in the user's namespaced path (RLS
enforced); preview & remove work; avatars round-crop. Verify via Argent.

**Risks/decisions.** HEIC handling on Android. Camera & library permission copy
(Swedish) in `app.json` infoPlist / Android permissions.

---

## M11 — Feed / dashboard (home)
**Goal.** The home feed: recent observations (14-day window) grouped into
today / yesterday / this-week / earlier, with pull-to-refresh, section headers,
rich observation cards, and an empty state.

**Why/notes.** This is the app's center of gravity, exactly like the web
dashboard. Reuse `feed.ts` bucketing verbatim.

**References.**
- Feed screen (mafk): `../mafk/src/routes/_authed/dashboard.tsx`,
  `../mafk/src/components/app/feed-section.tsx` (sticky header + count badge,
  hides when empty), `../mafk/src/components/app/observation-card.tsx` (species
  + scientific name, time-ago + "very recent" pulse, count/activity badges,
  "Mine" badge, location + inline map, image, observer footer → member link,
  edit link if mine), `../mafk/src/lib/feed.ts` (already ported in M3).
- Data (mafk): `../mafk/src/server/fns/observations.ts` `listFeedFn` +
  `FeedObservation` shape (joins species/locations/profiles, signed image URLs).
- Pull-to-refresh (edenmind): `src/hooks/use-pull-to-refresh.ts` (gesture-driven
  `RefreshControl`, platform-aware tick), `src/components/screen.tsx`,
  `section-header.tsx`, `state-block.tsx` (empty state).

**New deps.** None new.

**Deliverables.** `(tabs)/index.tsx` feed screen, `ObservationCard` (native),
`FeedSection`, pull-to-refresh, empty state with "rapportera" CTA, the feed query
(14-day, joined, batched signed image URLs), member-link + edit-link navigation.

**Acceptance.** Feed shows real observations grouped correctly (Stockholm TZ);
pull-to-refresh refetches with a haptic tick; cards show species/time/count/
activity/location/photo/observer; tapping a card → detail, observer → member,
edit → edit; empty state shown when no data. Verify via Argent.

**Risks/decisions.** Batch signed-URL minting to avoid N requests (cache per
imagePath). Inline map in cards may be heavy in a list — consider a static
snapshot or lazy mount.

---

## M12 — Observation create / detail / edit / delete
**Goal.** The full observation lifecycle: detail view, create form (composing M9
pickers + M8 map + M10 image), edit (owner-only), delete with confirm; with
optimistic feed update and the alert-request fan-out.

**References.**
- Routes (mafk): `../mafk/src/routes/_authed/observation/new.tsx`,
  `.../observation/$id.index.tsx` (detail), `.../observation/$id/edit.tsx`.
- Form (mafk): `../mafk/src/components/app/observation-form.tsx` (field-level
  validation, scroll-to-error, disabled while submitting, delete confirm, edit
  repopulation), validation `../mafk/src/lib/validation/observation.ts`.
- Data (mafk): `../mafk/src/server/fns/observations.ts` (`createObservationFn`,
  `updateObservationFn`, `deleteObservationFn`, `fetchObservationFn`; owner
  scoping; `alertRequested` triggers push — now via the M4 RPC/trigger; old image
  cleanup on replace/delete).
- Mutation + invalidation pattern (edenmind): `src/lib/query/stacks.ts`.

**New deps.** None new.

**Deliverables.** Detail screen (read-only `ObservationCard` + back), create form
(full composition + submit → insert + optional alert), edit form (repopulate +
update + image cleanup), delete (confirm dialog + delete + image cleanup),
optimistic feed insert/update, query invalidation.

**Acceptance.** Create a complete observation (species+count+time+location/coords+
activity+comment+photo) → appears in feed; edit own observation persists; delete
own removes it + its image; cannot edit/delete others'; `alertRequested` sends a
push (verify in M14); validation errors surface in Swedish and scroll into view.
Verify via Argent.

**Risks/decisions.** location XOR coords rule (validation already encodes it).
Optimistic update rollback on failure. Ensure the alert side-effect lives in the
backend (M4), not the client.

---

## M13 — Member profiles
**Goal.** Public-ish member page: avatar, display name, phone (tap to call), and
that member's recent observations.

**References.**
- Screen (mafk): `../mafk/src/routes/_authed/member/$userId.tsx`,
  data `../mafk/src/server/fns/observations.ts` `fetchMemberFeedFn`
  (`{ profile, observations }`, 14-day window), `digitsForTel` from
  `../mafk/src/lib/validation/profile.ts`.

**New deps.** `expo-linking` (tel: links) — likely already present.

**Deliverables.** `member/[userId].tsx` with avatar + name + phone (`tel:` via
Linking) + their observation list (reusing `ObservationCard`), reachable from feed
& detail observer footers.

**Acceptance.** Opening a member shows their profile + observations; phone link
dials; back returns. Verify via Argent.

**Risks/decisions.** RLS must allow reading other users' profile fields exposed
here (display name, phone, avatar) — confirm scoped in M4.

---

## M14 — Push notifications (device tokens + fan-out)
**Goal.** Native push: register device token, store it, fan out a notification
when a new alert-requested observation is created, and deep-link the tap to the
observation. Plus the enable/disable toggle in settings.

**Why/notes.** Web uses Web Push (Service Worker + VAPID, `push_subscriptions`
with endpoint/p256dh/auth). Native uses Expo push tokens — a different shape — so
this needs a small backend decision (M4 flagged it).

**References.**
- Web push (mafk, for behavior parity): `../mafk/src/server/fns/push.ts`,
  `../mafk/src/components/app/push-notification-toggle.tsx`,
  `../mafk/src/server/push/send.ts`, `geocode.ts`,
  validation `../mafk/src/lib/validation/push.ts`.
- Native notifications (edenmind): `src/lib/notifications.ts` (permissions,
  foreground handler, scheduling), `app.json` `expo-notifications` plugin block,
  settings toggle `src/app/(tabs)/settings/notifications.tsx`.

**New deps.** `expo-notifications`, `expo-device`.

**Deliverables.** Token registration on enable → stored in a `device_push_tokens`
table (or extended `push_subscriptions`), a Supabase Edge Function (extends M4
fan-out) that sends via the **Expo Push API** to all members (minus the author)
when `alertRequested` observations are inserted, a settings toggle
(enable/disable = upsert/delete token), foreground handler, and deep-link routing
from a tapped notification to `observation/[id]`.

**Acceptance.** Enabling push registers a token (real device — push needs a dev
build, not Expo Go); creating an alert-requested observation from one account
delivers a push to another; tapping it opens the observation; disabling removes
the token. Verify via dev build.

**Risks/decisions.** Requires an EAS dev/preview build (push doesn't work in Expo
Go). Token table schema decision. Apple Push key + Google FCB/FCM config in EAS.
Edge function auth to the Expo Push API.

---

## M15 — Polish, native UX & QA
**Goal.** Make it feel native and ship-ready: haptics everywhere meaningful,
loading skeletons, error/empty/offline states, reduced-motion, dark-mode pass,
accessibility & dynamic type, a Swedish-copy audit against `i18n/sv.ts`, app icon
& splash, and an end-to-end UI test pass.

**References.**
- Motion/feel (edenmind): `src/constants/motion.ts`, `src/components/
  pressable-scale.tsx`, `skeleton.tsx`, `state-block.tsx`, `undo-toast.tsx`,
  `src/hooks/use-pull-to-refresh.ts`.
- Copy source of truth (mafk): `../mafk/src/lib/i18n/sv.ts`.
- Argent skills for QA: `argent-test-ui-flow`, `argent-screenshot-diff`,
  `argent-react-native-profiler` (re-render/CPU), `argent-create-flow` (record
  the core report flow for regression).

**New deps.** None new (optional: `@shopify/react-native-skia` if charts added).

**Deliverables.** Haptic pass, skeletons for feed/detail, consistent
error/empty/retry states, reduced-motion handling, full dark-mode review, a11y
labels + `maxFontSizeMultiplier`, finalized app icon & splash, recorded Argent
flow for the report-an-observation journey, and a profiling pass on the feed.

**Acceptance.** Core flows (sign-in → report → see in feed → edit → delete) run
clean on iOS & Android via Argent; dark mode correct; no Swedish-copy gaps; feed
scroll is smooth (profiler shows no obvious re-render hotspots).

**Risks/decisions.** Inline-map performance in long feeds (revisit M11 decision).

---

## M16 — EAS build & release
**Goal.** Reproducible builds and a release path: EAS Build profiles, EAS Update,
internal distribution (TestFlight / Android internal), and store metadata.

**References.**
- Build config (edenmind): `eas.json` (development/preview/production profiles,
  `appVersionSource: remote`, autoIncrement, APK for Android preview,
  device-only iOS), `app.json` (`runtimeVersion.policy`, `updates.url`, EAS
  `projectId`), `scripts/dev-android.sh`.

**New deps.** `eas-cli` (global/dev), `expo-updates`.

**Deliverables.** Finalized `eas.json` + `app.json` (bundle ids, versions,
runtime policy, update channel, icons/splash), EAS project linked, a successful
preview build for iOS & Android, EAS Update channel wired, and store-listing
metadata (Swedish) drafted.

**Acceptance.** `eas build --profile preview` produces installable iOS + Android
artifacts that run against the shared Supabase project; `eas update` delivers an
OTA JS update to the preview channel.

**Risks/decisions.** Apple Developer + Google Play accounts, signing credentials,
push credentials (ties to M14). Privacy/permission strings (location, camera,
notifications) must be complete for store review.

---

## Suggested dependency graph (build order)

```
M1 Scaffold
└─ M2 Design system ─┐
   M3 Supabase + logic ┤
      └─ M4 Backend/RLS (shared Supabase, security-critical)
            └─ M5 Auth (Apple + Google) + onboarding
                  └─ M6 Navigation shell
                        ├─ M7 Profile/settings
                        ├─ M8 Maps & geolocation ─┐
                        │     └─ M9 Form inputs ───┤
                        ├─ M10 Image upload ───────┤
                        │                          └─ M12 Observation CRUD
                        ├─ M11 Feed/dashboard ─────────┘ │
                        ├─ M13 Member profiles ───────────┘
                        └─ M14 Push notifications
                              └─ M15 Polish & QA
                                    └─ M16 EAS build & release
```

M2 and M3 can proceed in parallel after M1. M4 must precede any data-driven
screen. M9 depends on M8 (location picker needs the map). M12 depends on M8/M9/M10.

---

## Appendix — full native dependency shortlist (by milestone)

- **Core (M1):** expo, expo-router, react-native-safe-area-context,
  react-native-screens, react-native-gesture-handler, react-native-reanimated,
  expo-constants, expo-status-bar, expo-splash-screen, expo-system-ui.
- **Theming/native (M2):** expo-haptics, expo-symbols, @expo/vector-icons.
- **Data (M3):** @supabase/supabase-js, @tanstack/react-query,
  react-native-url-polyfill, expo-sqlite, zod, date-fns.
- **Auth (M5):** expo-apple-authentication, @react-native-google-signin/
  google-signin (or expo-auth-session + expo-web-browser + expo-crypto).
- **Maps (M8):** react-native-maps, expo-location.
- **Inputs (M9):** @gorhom/bottom-sheet, @react-native-community/datetimepicker.
- **Images (M10):** expo-image-picker, expo-image-manipulator, expo-file-system,
  expo-image.
- **Push (M14):** expo-notifications, expo-device.
- **Linking (M13):** expo-linking.

All versions should be pinned to the SDK-56-compatible releases (match
`../edenmind-v2/mobile/package.json` where overlapping).
