import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * The single place the app reads its own version identity — so every screen that shows a
 * version (Profile today, bug reports / QA tomorrow) agrees, and bumping the app is one edit.
 *
 * How the numbers flow:
 *
 * - **Marketing version** (`1.0.0` → `CFBundleShortVersionString` / `versionName`) is sourced
 *   from `package.json`'s `version` via `app.config.ts`. Bump it there (e.g. `npm version
 *   patch`) and it moves the whole app off 1.0.0: the native binary, the `appVersion`
 *   runtimeVersion policy, and this display all follow.
 * - **Build number** (`CFBundleVersion` / `versionCode`) is owned *remotely* by EAS
 *   (`eas.json` → `appVersionSource: "remote"` + `autoIncrement`). It is therefore NOT in the
 *   JS config — only the compiled binary knows it. That is why we read the runtime identity
 *   from `expo-application`'s native values and fall back to `expo-constants` only when the
 *   native module is unavailable (Expo Go / web).
 */

/** Marketing version, e.g. `"1.0.0"`. Native binary first, bundled config as a fallback. */
export const appVersion =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';

/** EAS-assigned build number, e.g. `"42"`. `null` when unavailable (Expo Go / web). */
export const buildNumber = Application.nativeBuildVersion ?? null;

/** What to show a user: `"1.0.0 (42)"`, or just `"1.0.0"` when the build number is unknown. */
export const versionLabel = buildNumber ? `${appVersion} (${buildNumber})` : appVersion;

/**
 * Which OTA update is actually running on top of the native build — for QA / bug reports.
 * `null` on an embedded launch (no update applied yet) or when updates are disabled (dev).
 */
export const otaUpdateId = Updates.isEmbeddedLaunch ? null : (Updates.updateId ?? null);

/** EAS Update release channel (`preview` / `production`), or `null` in development. */
export const releaseChannel = Updates.channel ?? null;
