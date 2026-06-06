import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

// Native header for the Profil tab — see the (home) layout for why each native
// tab nests its own Stack.
export const unstable_settings = { initialRouteName: 'index' };

export default function ProfileTabLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerLargeStyle: { backgroundColor: theme.background },
        headerTintColor: theme.foreground,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: sv.profile.title }} />
    </Stack>
  );
}
