import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

// `NativeTabs` only renders the bottom bar — to get a real title bar at the top
// of a tab (a large, collapsing title on iOS), each tab nests its own native
// `Stack`. The header is themed to match the screen background so it reads as
// seamless chrome (same grammar as the root stack + the bottom bar).
export const unstable_settings = { initialRouteName: 'index' };

export default function FeedTabLayout() {
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
      <Stack.Screen name="index" options={{ title: sv.feed.title }} />
    </Stack>
  );
}
