import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { type ComponentProps } from 'react';
import { DynamicColorIOS, Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticPress } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

// Native bottom tabs: UITabBarController on iOS (Liquid Glass on iOS 26),
// Material bottom navigation on Android. Icons are platform-native — SF Symbols
// on iOS (`sf`, no assets), @expo/vector-icons Material glyphs on Android via an
// image `src`. Mirrors edenmind's tab shell; here the three triggers are the
// mafk IA: Larm · Lokaler · Profil — all nouns (destinations). "Larm" is the
// club's alerts stream (the feed); the create action ("Larma") is a header button
// on it that opens the compose modal (see the root `_layout` `new` route), so the
// destination and its verb sit together instead of on separate tabs. "Lokaler" is
// the club's birding sites on a map. Profil stays rightmost (convention).
const { Trigger } = NativeTabs;

// Default tab when entering the group at "/". `anchor` is the SDK 54+ key.
// The Larm tab is the `(home)` group (a nested Stack so it gets a native title);
// `profile` is likewise a Stack-wrapped folder.
export const unstable_settings = { anchor: '(home)' };

export default function TabsLayout() {
  const theme = useTheme();

  // The Android Material tab bar tracks the system uiMode, not RN's in-app
  // Appearance override, so an in-app theme change leaves it stale. Color it
  // explicitly from the resolved theme so it always matches. iOS keeps the
  // default (Liquid Glass) bar — UIKit re-tints it via Appearance — and just
  // gets the brand accent as a dynamic color.
  const barProps: Partial<ComponentProps<typeof NativeTabs>> =
    Platform.OS === 'android'
      ? {
          // Match the screen background so the bar reads as seamless chrome
          // rather than a brighter elevated surface.
          backgroundColor: theme.background,
          iconColor: { default: theme.mutedForeground, selected: theme.tint },
          labelStyle: {
            default: { color: theme.mutedForeground },
            selected: { color: theme.tint },
          },
          indicatorColor: theme.backgroundSelected,
          rippleColor: theme.backgroundSelected,
        }
      : {
          tintColor: DynamicColorIOS({ light: Colors.light.tint, dark: Colors.dark.tint }),
        };

  // Material's bottom navigation fires a ripple but no haptic by default; iOS's
  // UITabBar already plays its own subtle tick, so gate to Android to avoid a
  // double-tap feel.
  const screenListeners =
    Platform.OS === 'android' ? { tabPress: () => hapticPress() } : undefined;

  return (
    <NativeTabs {...barProps} screenListeners={screenListeners}>
      <Trigger name="(home)">
        <Trigger.Label>{sv.bottomNav.feed}</Trigger.Label>
        {/* "Larm" = the club's alerts stream (the feed). A megaphone reads as
            "announcements broadcast to the club" — not the notifications inbox a
            bell implies. The verb ("Larma") lives on the header button that opens
            the compose modal. MaterialIcons `campaign` is the megaphone glyph —
            same font as person, so no extra font ships. */}
        {Platform.OS === 'ios' ? (
          <Trigger.Icon sf="megaphone.fill" />
        ) : (
          <Trigger.Icon src={<Trigger.VectorIcon family={MaterialIcons} name="campaign" />} />
        )}
      </Trigger>
      <Trigger name="locations">
        <Trigger.Label>{sv.bottomNav.locations}</Trigger.Label>
        {/* A map pin reads as "places / sites" — the club's lokaler. MaterialIcons
            `map` is the same font as person/campaign, so no extra font ships. */}
        {Platform.OS === 'ios' ? (
          <Trigger.Icon sf="map.fill" />
        ) : (
          <Trigger.Icon src={<Trigger.VectorIcon family={MaterialIcons} name="map" />} />
        )}
      </Trigger>
      <Trigger name="profile">
        <Trigger.Label>{sv.bottomNav.profile}</Trigger.Label>
        {Platform.OS === 'ios' ? (
          <Trigger.Icon sf="person.fill" />
        ) : (
          <Trigger.Icon src={<Trigger.VectorIcon family={MaterialIcons} name="person" />} />
        )}
      </Trigger>
    </NativeTabs>
  );
}
