import { Platform, StyleSheet } from 'react-native';

import { Elevation, type ElevationToken } from '@/constants/theme';

export const SurfaceRadius = {
  xs: 8,
  sm: 14,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/**
 * Avatar geometry. Pair with a `borderRadius: AvatarSize.<size> / 2` to keep
 * the circle in lockstep with the diameter.
 */
export const AvatarSize = {
  sm: 24,
  md: 30,
  lg: 88,
} as const;

/**
 * Squircle radii for app-icon-sized rounded squares (App Store / Spotify-style
 * artwork tiles). Avatar discs use `AvatarSize` instead.
 */
export const IconRadius = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

/**
 * Resolve an `Elevation` token to per-platform style. iOS keeps the soft shadow
 * recipe; Android zeroes shadow values and leans on the `elevation` prop so the
 * Material renderer draws its native layer drop.
 */
function elevationStyle(token: ElevationToken) {
  return Platform.OS === 'ios'
    ? {
        shadowColor: token.shadowColor,
        shadowOpacity: token.shadowOpacity,
        shadowRadius: token.shadowRadius,
        shadowOffset: token.shadowOffset,
        elevation: 0,
      }
    : {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: token.elevation,
      };
}

export const SurfaceStyles = StyleSheet.create({
  flatGroup: {
    borderRadius: SurfaceRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  raisedCard: {
    borderRadius: SurfaceRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    ...elevationStyle(Elevation.raised),
  },
  focusCard: {
    borderRadius: SurfaceRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...elevationStyle(Elevation.elevated),
  },
  inputSurface: {
    borderRadius: SurfaceRadius.sm,
    borderWidth: 1,
  },
  clippedCard: {
    borderRadius: SurfaceRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  /** Floating tray — used under bottom chrome (grade bars, sheets). */
  floatingTray: {
    borderRadius: SurfaceRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...elevationStyle(Elevation.elevated),
  },
});

export { elevationStyle };
