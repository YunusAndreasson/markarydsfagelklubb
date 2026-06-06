import { Stack } from 'expo-router';

import { sv } from '@/lib/i18n/sv';

// `NativeTabs` renders no header, so each tab nests its own native `Stack` to get
// a real (large, collapsing on iOS) title bar. Header colors come from the root
// `ThemeProvider` (`text`/`card`) — no per-tab tint overrides, matching edenmind.
//
// `headerLargeTitle` is opt-in on the tab root only (iOS HIG): leaving it in
// `screenOptions` gives any pushed screen a ~100pt phantom large-title block.
export const unstable_settings = { initialRouteName: 'index' };

export default function FeedTabLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: sv.feed.title, headerLargeTitle: true }} />
    </Stack>
  );
}
