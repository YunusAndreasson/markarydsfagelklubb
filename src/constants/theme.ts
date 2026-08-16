/**
 * Semantic color tokens for the native app. The palette is the web app's
 * (`../mafk/src/styles/app.css`) — Markaryd green on clean neutrals — converted
 * from OKLCH to sRGB hex, arranged in the token shape from the edenmind reference
 * app so the themed primitives drop in unchanged. Color is reserved for action
 * and status; surface hierarchy comes from subtle fill shifts, faint borders, and
 * scoped elevation.
 *
 * The legacy keys (`text`, `textSecondary`, `backgroundElement`,
 * `backgroundSelected`) are retained as aliases so the ported component APIs keep
 * working.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FFFFFF',
    foreground: '#0A0A0A',
    card: '#FFFFFF',
    cardForeground: '#0A0A0A',
    /** Markaryd-grön — the brand primary (web `--primary` oklch(0.52 0.13 152)). */
    primary: '#137D41',
    primaryForeground: '#FAFAFA',
    secondary: '#F5F5F5',
    secondaryForeground: '#171717',
    muted: '#F5F5F5',
    mutedForeground: '#737373',
    accent: '#F5F5F5',
    accentForeground: '#171717',
    destructive: '#E7000B',
    border: '#E5E5E5',
    /** Focus / active accent. The web uses the green primary as its focus ring. */
    tint: '#137D41',
    /** Switch thumb fill — high-contrast disc against tinted/untinted tracks. */
    switchThumb: '#FFFFFF',
    /** Foreground for colored badges/avatars — always light so the glyph reads on
     *  a saturated accent fill in both themes. */
    badgeForeground: '#FFFFFF',
    // --- Legacy aliases (do not remove without updating consumers) ---
    text: '#0A0A0A',
    textSecondary: '#737373',
    backgroundElement: '#F5F5F5',
    backgroundSelected: '#F5F5F5',
  },
  dark: {
    background: '#080B09',
    foreground: '#FAFAFA',
    card: '#151816',
    cardForeground: '#FAFAFA',
    /** Markaryd-grön, lifted for dark surfaces (web dark `--primary`). */
    primary: '#259F56',
    primaryForeground: '#FAFAFA',
    secondary: '#232724',
    secondaryForeground: '#FAFAFA',
    muted: '#232724',
    mutedForeground: '#9AA49D',
    accent: '#232724',
    accentForeground: '#FAFAFA',
    destructive: '#FF6467',
    border: 'rgba(255, 255, 255, 0.1)',
    /** Focus / active accent — brighter green so it reads on dark surfaces. */
    tint: '#32B364',
    /** Switch thumb fill — off-white retains contrast against dark track. */
    switchThumb: '#FAFAFA',
    /** Foreground for colored badges/avatars — light glyph so it reads on accent
     *  fills in dark mode (matches light-mode behavior). */
    badgeForeground: '#FFFFFF',
    // --- Legacy aliases (do not remove without updating consumers) ---
    text: '#FAFAFA',
    textSecondary: '#9AA49D',
    backgroundElement: '#232724',
    backgroundSelected: '#232724',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Translucent surface tints used by modal scrims and frosted-glass surfaces.
 * Kept off `Colors` so they don't widen `ThemeColor`; resolved with the active
 * scheme by consumers.
 */
export const SurfaceOverlay = {
  light: {
    /** Frosted-glass tint for trays/toasts floating over light content. */
    glassLight: 'rgba(255,255,255,0.65)',
    /** Frosted-glass tint when used inside an explicitly dark surface. */
    glassDark: 'rgba(8,11,9,0.65)',
    /** Modal/menu scrim — dims content behind a foreground sheet. */
    scrim: 'rgba(0,0,0,0.32)',
  },
  dark: {
    glassLight: 'rgba(255,255,255,0.18)',
    glassDark: 'rgba(8,11,9,0.78)',
    scrim: 'rgba(0,0,0,0.48)',
  },
} as const;

/**
 * Rarity "heat" scale for the rarity badge — a small chip showing the rarity
 * number 0–5, running 0 = rarest (a true rarity) → 5 = most common. Prominence is
 * *graded*, not just hue: the rare end (0/1) is a SOLID, saturated fill so an
 * alarm-worthy bird pops out of the feed and the species list even from the
 * card's top-right corner, while the common end stays quiet but still *stepped*
 * so adjacent levels never blur together: amber (2) → warm tan (3) → cool
 * blue-grey (4) → faint neutral (5). Hues stay clear of the brand green (and the
 * cool 4 leans blue, not teal) so the badge never reads as a primary marker. Kept
 * off `Colors` (like {@link SurfaceOverlay}) so it doesn't widen `ThemeColor`;
 * resolved with the active scheme by `@/lib/rarity`.
 */
export const RarityScale = {
  light: {
    0: { background: '#C42A20', foreground: '#FFFFFF' },
    1: { background: '#C4610E', foreground: '#FFFFFF' },
    2: { background: '#F2E1AE', foreground: '#8A6606' },
    3: { background: '#E7DEBE', foreground: '#756535' },
    4: { background: '#E2E7ED', foreground: '#5F6771' },
    5: { background: '#F2F2F2', foreground: '#6F6F6F' },
  },
  dark: {
    0: { background: '#D23B2E', foreground: '#FFF3F1' },
    1: { background: '#C4650F', foreground: '#FFF6EE' },
    2: { background: 'rgba(240,180,60,0.22)', foreground: '#EBC063' },
    3: { background: 'rgba(202,185,140,0.20)', foreground: '#D2C08C' },
    4: { background: 'rgba(150,172,196,0.15)', foreground: '#A6B2C0' },
    5: { background: 'rgba(255,255,255,0.07)', foreground: '#9AA49D' },
  },
} as const;

/**
 * Elevation recipe table. Names map to intent (resting card vs. sheet vs.
 * floating tray), not the raw shadow values. iOS gets a soft, color-quiet shadow;
 * Android relies on the `elevation` prop so we zero `shadowOpacity` there. Spread
 * the matching token via `Platform.select` at the consumer site — see
 * `SurfaceStyles` for the canonical usage.
 */
export type ElevationToken = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

export const Elevation: Record<'flat' | 'raised' | 'elevated' | 'floating', ElevationToken> = {
  flat: {
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.055,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  // Android (and any other native platform).
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Shared opacity ramps — keep disabled/dimmed controls visually identical. */
export const Opacity = {
  disabled: 0.5,
} as const;

/**
 * Icon sizes by semantic role, so the same role reads at the same size
 * everywhere: `chipClose` = the ✕ inside a filter chip, `meta` = inline
 * metadata glyphs beside small text, `control` = row chevrons and field
 * adornments, `close` = sheet/fullscreen close buttons, `action` = sheet
 * action-row icons, `header` = nav-bar buttons.
 */
export const IconSize = {
  chipClose: 14,
  meta: 16,
  control: 18,
  close: 20,
  action: 22,
  header: 26,
} as const;

/**
 * Font sizes for raw `TextInput`s, which can't render through `ThemedText`.
 * Values mirror the ThemedText ladder (`default` 16 / `subtitle` 32) so typed
 * text sits on the same scale as displayed text.
 */
export const FontSize = {
  input: 16,
  display: 32,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
