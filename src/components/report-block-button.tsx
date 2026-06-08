/**
 * The overflow (⋯) action shown in the native header on content the signed-in
 * user does NOT own — another member's observation or profile. Opens a native
 * menu to **report** the content (Apple Guideline 1.2) or **block** the member
 * (hides their content locally; see `blocks.ts`). Blocking is confirmed because
 * it changes what the user sees; reporting opens a pre-filled mail to the club.
 */
import { router } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { Icon, MORE } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { showToast } from '@/components/toast';
import { useTheme } from '@/hooks/use-theme';
import { blockUser, unblockUser, useBlockedUsers } from '@/lib/blocks';
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

  function confirmBlock() {
    Alert.alert(sv.moderation.blockConfirmTitle(name), sv.moderation.blockConfirmMessage, [
      { text: sv.common.cancel, style: 'cancel' },
      { text: sv.moderation.blockConfirm, style: 'destructive', onPress: doBlock },
    ]);
  }

  function doUnblock() {
    unblockUser(userId);
    hapticSuccess();
    showToast(sv.moderation.unblocked, 'success');
  }

  function openMenu() {
    Alert.alert(name, undefined, [
      { text: sv.moderation.report, onPress: report },
      isBlocked
        ? { text: sv.moderation.unblock, onPress: doUnblock }
        : { text: sv.moderation.block(name), style: 'destructive', onPress: confirmBlock },
      { text: sv.common.cancel, style: 'cancel' },
    ]);
  }

  return (
    <PressableScale
      variant="icon"
      onPress={openMenu}
      accessibilityRole="button"
      accessibilityLabel={sv.moderation.actionsLabel}
    >
      {/* Understated in COLOR (muted, not a brand-tinted CTA) but sized like a
          normal nav-bar glyph so it's comfortably tappable on the iOS glass bar. */}
      <Icon name={MORE} size={26} color={theme.mutedForeground} />
    </PressableScale>
  );
}
