import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

// Native header for the Rapportera tab — see the (home) layout for why each
// native tab nests its own Stack.
export const unstable_settings = { initialRouteName: 'index' };

export default function NewObservationTabLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerLargeStyle: { backgroundColor: theme.background },
        headerTintColor: theme.foreground,
        // Force the title color: without this RNScreens lets the iOS large title
        // fall back to the system label color (dark in a light-mode device),
        // which is invisible on the app's themed header background.
        headerTitleStyle: { color: theme.foreground },
        headerLargeTitleStyle: { color: theme.foreground },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: sv.observation.titleNew }} />
    </Stack>
  );
}
