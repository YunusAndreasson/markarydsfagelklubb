/**
 * The overflow (⋯) action shown in the native header on content the signed-in
 * user does NOT own — another member's observation or profile. Opens a **native
 * platform menu** (SwiftUI `Menu` on iOS, Compose `DropdownMenu` on Android, via
 * `@expo/ui`) to **report** the content (Apple Guideline 1.2) or **block** the
 * member (hides their content locally; see `blocks.ts`). Blocking is confirmed
 * (via the `confirm()` sheet) because it changes what the user sees; reporting
 * opens a pre-filled mail to the club.
 *
 * This used to be a JS `PickerSheet` (an RN `Modal`), which forced a 350 ms
 * `setTimeout` before presenting the confirm sheet or the mail composer — on iOS
 * a second presentation while the first Modal is still sliding away fails
 * silently. A native menu is not a Modal: it tears down before `onPressAction`
 * fires, so the follow-up presents cleanly and the delay is gone.
 *
 * Icons are SF Symbol names, so they render on iOS only; Compose renders the
 * actions as text, which is the idiomatic Material 3 dropdown anyway.
 */
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { BLOCKED, FLAG, Icon, MORE, VISIBLE } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { showToast } from '@/components/toast';
import { IconSize } from '@/constants/theme';
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

/** Action ids — the value `onPressAction` reports back. */
const REPORT = 'report';
const BLOCK = 'block';
const UNBLOCK = 'unblock';

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
    const url = reportMailtoUrl(
      sv.moderation.reportSubject(reportRef),
      sv.moderation.reportBody(reportRef),
    );
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

  const actions: MenuAction[] = [
    { id: REPORT, title: sv.moderation.report, image: FLAG.sf },
    isBlocked
      ? { id: UNBLOCK, title: sv.moderation.unblock, image: VISIBLE.sf }
      : {
          id: BLOCK,
          title: sv.moderation.block(name),
          image: BLOCKED.sf,
          attributes: { destructive: true },
        },
  ];

  return (
    <MenuView
      title={name}
      actions={actions}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === REPORT) report();
        else if (nativeEvent.event === UNBLOCK) doUnblock();
        else if (nativeEvent.event === BLOCK) void confirmBlock();
      }}
    >
      {/* The menu anchors to this trigger. Understated in COLOR (muted, not a
          brand-tinted CTA) but sized like a normal nav-bar glyph so it's
          comfortably tappable on the iOS glass bar. `haptic={false}` — the
          platform menu plays its own presentation feedback. */}
      <PressableScale
        variant="icon"
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel={sv.moderation.actionsLabel}
      >
        <Icon name={MORE} size={IconSize.header} color={theme.mutedForeground} />
      </PressableScale>
    </MenuView>
  );
}
