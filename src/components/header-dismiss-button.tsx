/**
 * The left-slot dismiss action for a compose/edit modal, made platform-correct
 * (Jakob's Law — match what each platform's users already expect):
 *
 *  - iOS shows a text **"Avbryt"**. Apple's convention for a modal that holds
 *    unsaved input is a worded Cancel, not a glyph — "Avbryt" says *discard what
 *    I typed*, which a bare ✕ can't (Mail, Kalender, Påminnelser all do this).
 *  - Android shows an **✕ (close) icon**. Material's full-screen-dialog pattern
 *    is a leading close glyph + a trailing confirm action.
 *
 * The trailing confirm ("Larma" / "Spara") stays a text action on both platforms
 * either way. One component so `new` and `edit` present identically.
 */
import { Platform } from 'react-native';

import { HeaderButton } from '@/components/header-button';
import { CLOSE } from '@/components/icon';
import { sv } from '@/lib/i18n/sv';

export function HeaderDismissButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  // `title` doubles as the accessibility label on the Android icon path, so the
  // ✕ still reads as "Avbryt" (the discard semantic) to a screen reader.
  return Platform.OS === 'android' ? (
    <HeaderButton icon={CLOSE} title={sv.common.cancel} onPress={onPress} disabled={disabled} />
  ) : (
    <HeaderButton title={sv.common.cancel} onPress={onPress} disabled={disabled} />
  );
}
