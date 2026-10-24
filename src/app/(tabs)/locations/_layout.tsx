import { Stack } from 'expo-router';

// Full-bleed map tab: the map must cover the screen edge-to-edge with only the
// native search bar on top — no title. A *transparent* header gives exactly that:
// it floats over the map (transparent background → no opaque nav bar, so no
// hairline border cutting across the map), and dropping the title removes the odd
// large "Lokaler" text that sat directly on the map. The native search bar itself
// (`headerSearchBarOptions`) is configured on the index screen, where its
// callbacks can read component state.
export const unstable_settings = { anchor: 'index' };

export default function LocationsTabLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: '', headerTransparent: true, headerShadowVisible: false }}
      />
    </Stack>
  );
}
