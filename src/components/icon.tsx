/**
 * A single cross-platform glyph used across the app. SF Symbols on iOS, Material
 * glyphs on Android. Each `IconName` carries both so call sites name the icon
 * once and it resolves to the right family per platform.
 *
 * The constant set below is the M2 baseline — observation/bird-specific glyphs
 * (home, plus-FAB, map pin, camera, person) get added with their milestones
 * (M6 navigation, M8 maps, M10 images, etc).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, type AnimationSpec, type SFSymbol } from 'expo-symbols';
import { Platform } from 'react-native';

export type IconName = {
  sf: SFSymbol;
  material: keyof typeof MaterialIcons.glyphMap;
};

/** Trailing disclosure chevron, reused by rows and headers. */
export const CHEVRON: IconName = { sf: 'chevron.right', material: 'chevron-right' };

/** Selection checkmark, used by radio-style rows (e.g. the appearance picker). */
export const CHECK: IconName = { sf: 'checkmark', material: 'check' };

/** Forward / start-action arrow on a CTA. */
export const ARROW_FORWARD: IconName = { sf: 'arrow.right', material: 'arrow-forward' };

/** Quick-add affordance. */
export const PLUS: IconName = { sf: 'plus', material: 'add' };

/** Decrement affordance — paired with {@link PLUS} in the count stepper. */
export const MINUS: IconName = { sf: 'minus', material: 'remove' };

/** Search-field glyph (species picker). */
export const SEARCH: IconName = { sf: 'magnifyingglass', material: 'search' };

/** Time / datetime field glyph. */
export const CLOCK: IconName = { sf: 'clock', material: 'schedule' };

/** Edit affordance. */
export const EDIT: IconName = { sf: 'square.and.pencil', material: 'edit' };

/** Camera capture — "take a photo" (image picker chooser). */
export const CAMERA: IconName = { sf: 'camera', material: 'photo-camera' };

/** Photo / library — "choose from gallery" (image picker chooser). */
export const IMAGE: IconName = { sf: 'photo', material: 'image' };

/** Destructive remove — delete an uploaded image. */
export const TRASH: IconName = { sf: 'trash', material: 'delete' };

/** Modal / sheet close button. */
export const CLOSE: IconName = { sf: 'xmark', material: 'close' };

/** Failed-load / error glyph for state blocks. */
export const ALERT: IconName = { sf: 'exclamationmark.triangle', material: 'error-outline' };

/** Empty-tray glyph for "nothing here yet" states. */
export const TRAY: IconName = { sf: 'tray', material: 'inbox' };

/** Map pin — a saved/observed location marker. */
export const LOCATION: IconName = { sf: 'mappin.circle.fill', material: 'location-on' };

/** Crosshair — "use my current position". */
export const MY_LOCATION: IconName = { sf: 'location.fill', material: 'my-location' };

/** Maximize affordance — expand an inline map to fullscreen. */
export const EXPAND: IconName = { sf: 'arrow.up.left.and.arrow.down.right', material: 'fullscreen' };

/** Bell — the push-notification (fågelnotiser) settings row. */
export const BELL: IconName = { sf: 'bell', material: 'notifications-none' };

/** Door-out — the sign-out settings row. */
export const SIGN_OUT: IconName = { sf: 'rectangle.portrait.and.arrow.right', material: 'logout' };

/**
 * A one-shot bounce for peak/celebration glyphs. `repeating: false` plays the
 * effect once when the symbol mounts. iOS-only (SF Symbols); Android falls back
 * to a static glyph. Module-level so its identity is stable across re-renders and
 * the native view never re-fires.
 */
export const BOUNCE_ONCE: AnimationSpec = { effect: { type: 'bounce' }, repeating: false };

export function Icon({
  name,
  size = 17,
  color,
  animationSpec,
}: {
  name: IconName;
  size?: number;
  color: string;
  /**
   * Optional SF Symbol animation (iOS 17+). Pass a stable, module-level spec
   * (e.g. {@link BOUNCE_ONCE}) so re-renders don't restart the effect. Ignored
   * on Android, where the Material glyph stays static.
   */
  animationSpec?: AnimationSpec;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={name.sf}
        size={size}
        tintColor={color}
        type="monochrome"
        animationSpec={animationSpec}
      />
    );
  }
  return <MaterialIcons name={name.material} size={size} color={color} />;
}
