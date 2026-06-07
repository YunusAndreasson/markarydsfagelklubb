import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
// mafk IA: Obsar · Larm · Profil. "Larm" is an ordinary center tab
// (not a FAB) — the create form lands on it in M12.
const { Trigger } = NativeTabs;

// Default tab when entering the group at "/". `anchor` is the SDK 54+ key.
// The feed tab is the `(home)` group (a nested Stack so it gets a native title);
// `new` and `profile` are likewise Stack-wrapped folders.
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
        {/* Kikare = "titta på fynd" — on-brand for a bird club, and avoids the
            "bell = notifications inbox" misread. SF Symbols has binoculars; on
            Android it lives in MaterialCommunityIcons (not MaterialIcons). */}
        {Platform.OS === 'ios' ? (
          <Trigger.Icon sf="binoculars.fill" />
        ) : (
          <Trigger.Icon src={<Trigger.VectorIcon family={MaterialCommunityIcons} name="binoculars" />} />
        )}
      </Trigger>
      <Trigger name="new">
        <Trigger.Label>{sv.bottomNav.newObservation}</Trigger.Label>
        {/* "Larm" = alert the club to a fynd — the bell sits on the *action*
            (which fires the push fan-out), where it reads right; on a content tab
            it would misread as a notifications inbox. `notifications` is already in
            MaterialIcons (no extra font, unlike the binoculars glyph). */}
        {Platform.OS === 'ios' ? (
          <Trigger.Icon sf="bell.fill" />
        ) : (
          <Trigger.Icon src={<Trigger.VectorIcon family={MaterialIcons} name="notifications" />} />
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
