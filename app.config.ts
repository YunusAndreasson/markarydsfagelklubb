import { ConfigContext, ExpoConfig } from 'expo/config';

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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
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
  ] as ExpoConfig['plugins'],
});
