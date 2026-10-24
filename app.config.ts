import { ConfigContext, ExpoConfig } from 'expo/config';
import {
  AndroidConfig,
  type ConfigPlugin,
  withInfoPlist,
  withStringsXml,
} from 'expo/config-plugins';

import { version } from './package.json';

// Dynamic Expo config. `app.json` stays the static source of truth; this layer
// adds the native modules introduced after M1 (M8 maps + location, M10 images) and
// injects the Google Maps key from the environment so it never lands in version
// control.
//
// The Android Maps key is wired through the `react-native-maps` config plugin
// (`androidGoogleMapsApiKey`) — the canonical path for react-native-maps ≥1.22 on
// Expo SDK ≥53. An empty key is valid for the build; the map simply renders grey
// until `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env` (see the M8 plan).
// `expo-location`'s plugin sets the iOS usage string and adds the Android
// ACCESS_FINE/COARSE_LOCATION permissions at prebuild.
//
// M10: `expo-image-picker` bakes the iOS photo-library/camera usage strings and the
// Android media/camera permissions into the manifest at prebuild — so these strings
// must live here, not be patched post-hoc. `expo-image` registers its own plugin.

const LOCATION_PERMISSION =
  'Appen använder din plats för att markera var du sett fågeln.';
const PHOTOS_PERMISSION =
  'Appen behöver tillgång till dina bilder för att lägga till foton på fynd.';
const CAMERA_PERMISSION = 'Appen använder kameran för att ta foton på fynd.';

// expo/eas-cli#4715 (open as of 2026-10-24): SDK 58's prebuild names the iOS target
// "MarkarydsFagelklubb" (å → a), but eas-cli still bundles the SDK 55 name sanitizer,
// which drops the å and then can't find "MarkarydsFgelklubb" in the Xcode project —
// every iOS build fails in "Configure Xcode project". An ASCII `name` gives both the
// same target, and `withDisplayName` puts app.json's real name back wherever people see
// it. Remove both once eas-cli bundles @expo/config-plugins 58: the target stays the same.
const asciiName = (name: string) => name.normalize('NFKD').replace(/\p{M}/gu, '');

const withDisplayName: ConfigPlugin<string> = (config, displayName) => {
  config = withInfoPlist(config, (c) => {
    c.modResults.CFBundleDisplayName = displayName;
    return c;
  });
  return withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: displayName })],
      c.modResults,
    );
    return c;
  });
};

export default ({ config }: ConfigContext): ExpoConfig => withDisplayName({
  ...(config as ExpoConfig),
  name: asciiName(config.name ?? ''),
  // Single source of truth for the marketing version is `package.json` — bump it there
  // (`npm version patch|minor|major`) and it flows everywhere: the native binary
  // (CFBundleShortVersionString / versionName), the `appVersion` runtimeVersion policy
  // (so a new version = a new OTA lane), and the in-app display (src/lib/app-version.ts).
  // The build number (versionCode / buildNumber) is owned remotely by EAS
  // (eas.json → appVersionSource: "remote" + autoIncrement) and is deliberately not set here.
  version,
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' }],
    ['expo-location', { locationWhenInUsePermission: LOCATION_PERMISSION }],
    'expo-image',
    [
      'expo-image-picker',
      {
        photosPermission: PHOTOS_PERMISSION,
        cameraPermission: CAMERA_PERMISSION,
        microphonePermission: false,
      },
    ],
    // M14: push notifications. `color` tints the Android small icon; `defaultChannel`
    // matches the channel created at runtime. `getExpoPushTokenAsync` still needs an
    // EAS projectId (`eas init`) and Android delivery needs FCM creds on the EAS
    // project — see supabase/functions/send-bird-alert/README.md.
    ['expo-notifications', { color: '#137D41', defaultChannel: 'default' }],
    // AppCheckCore 11.3.0 (pulled transitively by GoogleSignIn) added a dependency on
    // RecaptchaInterop, which doesn't define modules and breaks pod install for static
    // Swift pods. Pin the last good version (no Podfile.lock exists under CNG, so
    // transitive pods float between builds). Revisit when GoogleSignIn requires >11.2.
    [
      'expo-build-properties',
      { ios: { extraPods: [{ name: 'AppCheckCore', version: '= 11.2.0' }] } },
    ],
  ] as ExpoConfig['plugins'],
}, config.name ?? '');
