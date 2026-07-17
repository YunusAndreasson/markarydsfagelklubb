/**
 * The overflow (⋯) action shown in the native header on content the signed-in
 * user does NOT own — another member's observation or profile. Opens a themed
 * action sheet to **report** the content (Apple Guideline 1.2) or **block** the
 * member (hides their content locally; see `blocks.ts`). Blocking is confirmed
 * (via the `confirm()` sheet) because it changes what the user sees; reporting
 * opens a pre-filled mail to the club.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { BLOCKED, FLAG, Icon, MORE, VISIBLE } from '@/components/icon';
import { PickerSheet, SheetActionRow } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { showToast } from '@/components/toast';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { blockUser, unblockUser, useBlockedUsers } from '@/lib/blocks';
import { confirm } from '@/lib/confirm';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { reportMailtoUrl } from '@/lib/moderation';

export type ReportBlockButtonProps = {
  /** The member who authored the content. */
  userId: string;
  displayName: string | null;
  /** Human reference to the reported item, e.g. `sv.moderation.reportObservationRef(id)`. */
  reportRef: string;
  /** Where to go after a block. Defaults to popping the screen. */
  onBlocked?: () => void;
};

export function ReportBlockButton({
  userId,
  displayName,
  reportRef,
  onBlocked,
}: ReportBlockButtonProps) {
  const theme = useTheme();
  const blocked = useBlockedUsers();
  const isBlocked = blocked.has(userId);
  const name = displayName ?? sv.feed.unknownObserver;
  const [menuOpen, setMenuOpen] = useState(false);

  function report() {
    const url = reportMailtoUrl(sv.moderation.reportSubject(reportRef), sv.moderation.reportBody(reportRef));
    Linking.openURL(url).catch(() => showToast(sv.moderation.reportFailed, 'error'));
  }

  function doBlock() {
    blockUser(userId);
    hapticSuccess();
    showToast(sv.moderation.blocked, 'success');
    if (onBlocked) onBlocked();
    else router.back();
  }

  async function confirmBlock() {
    // The confirm() promise settles only after the sheet's Modal has unmounted,
    // so doBlock's `router.back()` runs against a clean presentation stack.
    const ok = await confirm({
      title: sv.moderation.blockConfirmTitle(name),
      message: sv.moderation.blockConfirmMessage,
      confirmLabel: sv.moderation.blockConfirm,
      destructive: true,
    });
    if (ok) doBlock();
  }

  function doUnblock() {
    unblockUser(userId);
    hapticSuccess();
    showToast(sv.moderation.unblocked, 'success');
  }

  /** Close the menu sheet, then run the chosen action. The menu is a JS Modal;
   *  presenting the confirm sheet (another Modal) or the mail composer while it
   *  is still sliding away fails silently on iOS — wait out the dismissal (the
   *  same fix as the image chooser). */
  async function runAction(action: () => void | Promise<void>) {
    setMenuOpen(false);
    if (Platform.OS === 'ios') await new Promise((resolve) => setTimeout(resolve, 350));
    await action();
  }

  return (
    <>
      <PressableScale
        variant="icon"
        onPress={() => setMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={sv.moderation.actionsLabel}
      >
        {/* Understated in COLOR (muted, not a brand-tinted CTA) but sized like a
            normal nav-bar glyph so it's comfortably tappable on the iOS glass bar. */}
        <Icon name={MORE} size={IconSize.header} color={theme.mutedForeground} />
      </PressableScale>
      <PickerSheet visible={menuOpen} title={name} onClose={() => setMenuOpen(false)}>
        <View style={styles.body}>
          <SheetActionRow
            icon={FLAG}
            label={sv.moderation.report}
            onPress={() => void runAction(report)}
          />
          {isBlocked ? (
            <SheetActionRow
              icon={VISIBLE}
              label={sv.moderation.unblock}
              onPress={() => void runAction(doUnblock)}
            />
          ) : (
            <SheetActionRow
              icon={BLOCKED}
              label={sv.moderation.block(name)}
              destructive
              onPress={() => void runAction(confirmBlock)}
            />
          )}
        </View>
      </PickerSheet>
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.two, paddingTop: Spacing.one },
});
