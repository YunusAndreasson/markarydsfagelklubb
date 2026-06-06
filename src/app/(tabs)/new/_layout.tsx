import { Stack } from 'expo-router';

import { sv } from '@/lib/i18n/sv';

// Native header for the Rapportera tab — see the (home) layout for why each
// native tab nests its own Stack and how the large title is configured.
export const unstable_settings = { initialRouteName: 'index' };

export default function NewObservationTabLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: sv.observation.titleNew, headerLargeTitle: true }} />
    </Stack>
  );
}
