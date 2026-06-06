# mafk-mobie — agent & contributor guide

**mafk-mobie** is the native **Expo SDK 56** (expo-router) app for **Markaryds
Fågelklubb** — the mobile sibling of the **mafk** bird-reporting web app. It is
built by mirroring the engineering patterns of the reference Expo app
**edenmind-v2**.

Build order lives in **`MILESTONES.md`** (16 dependency-ordered milestones, each
its own `/plan` run). Read it before starting work.

## Reference projects (read-only inspiration — do not modify)

| What | Where | Use it for |
|---|---|---|
| Product + domain + Swedish copy | `../mafk` (TanStack Start + Drizzle + Supabase web app) | Features, flows, data shapes, copy, validation, brand color |
| Expo engineering reference | `../edenmind-v2/mobile` (Expo SDK 56) | Structure, routing, Supabase client, theming, primitives, native concerns, EAS |

`../mafk` may be touched only for shared-backend work in **M4** (RLS/policies/seeds).

## Locked decisions (do not renegotiate without the user)

1. **Språk.** All UI is **Swedish**. No English fallbacks. Strings come from the
   web app's `../mafk/src/lib/i18n/sv.ts` (ported in M3).
2. **Mobile-first.** Phones held one-handed. Touch targets ≥ 44px. Bottom tab
   navigation. Haptics on meaningful interactions.
3. **Shared Supabase backend.** Same project as mafk web (ref
   `zgnmajovyqibgxlcomvb`, eu-north-1). Publishable key ships in the client.
4. **One UI system, one icon set.** Design tokens in `src/constants/`, themed
   primitives in `src/components/`. No ad-hoc colors (M2).
5. **`auth.*` is owned by Supabase.** Never mutate it.

### The big architectural delta: RLS is now the primary boundary

mafk web reads only through server functions (Drizzle bypasses RLS), so it
deferred owner-scoped RLS policies. This app reads/writes Supabase **directly**
with the publishable key, so **Row Level Security is the real security boundary**
and must be fully specified + tested (**M4**) before any data-driven screen.

## Native deviations from the web app

Magic-link → **Apple + Google sign-in** (M5) · Leaflet → `react-native-maps`
(M8) · browser geo → `expo-location` (M8) · file input → `expo-image-picker`
(M10) · Web Push → `expo-notifications` (M14) · PWA install → removed.

## Conventions

- **Identity:** name "Markaryds Fågelklubb", slug/scheme `mafk`, bundle id
  `nu.markarydsfagelklubb.mafk` (iOS + Android). Locked — used by deep links +
  OAuth in M5.
- **Imports:** path aliases `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- **TypeScript is strict** (see `tsconfig.json`). ESLint is type-aware; use
  `void promise()` for deliberate fire-and-forget.
- **Design discipline:** read only what you're changing; trust named tokens.
- **SDK 56:** always consult versioned docs at
  https://docs.expo.dev/versions/v56.0.0/ — APIs drift between SDKs.

## Local dev (this machine is Linux → Android only)

- Package manager: **npm**.
- `npm run start` — Metro. `npm run typecheck` — `tsc --noEmit`. `npm run lint`.
- `npm run android` — builds + runs the dev client on the Android emulator.
  **JDK 17 is required** (`/usr/lib/jvm/java-17-openjdk`); the default `java` is
  26 and breaks AGP. `scripts/dev-android.sh` pins it and boots the AVD.
- Device interaction / QA goes through the **Argent** MCP tools.
