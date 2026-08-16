import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Avatar } from '@/components/avatar';
import { TRAY } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsGroup } from '@/components/settings/settings-group';
import { SkeletonSelectRow } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { unblockUser, useBlockedUsers } from '@/lib/blocks';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { fetchProfilesByIds, type MemberSummary } from '@/lib/query/profile';

// Blockerade medlemmar — manage (and undo) the local block list. The only place a
// block can be lifted, since blocked members are hidden everywhere else. The
// route is registered in the root layout and pushed from Profil.
export default function BlockedMembersScreen() {
  const blocked = useBlockedUsers();
  // Sorted so the query key (and list order) is stable across renders.
  const ids = useMemo(() => [...blocked].sort(), [blocked]);

  const q = useQuery({
    queryKey: ['blockedMembers', ids],
    queryFn: () => fetchProfilesByIds(ids),
    enabled: ids.length > 0,
  });
  const showSkeleton = useDelayedFlag(q.isPending);

  function onUnblock(userId: string) {
    unblockUser(userId);
    hapticSuccess();
    showToast(sv.moderation.unblocked, 'success');
  }

  if (ids.length === 0) {
    return (
      <Screen inset="sub" bottomInset>
        <StateBlock icon={TRAY} title={sv.blockedMembers.empty} />
      </Screen>
    );
  }

  // While profiles resolve, hold the rows as skeletons instead of flashing
  // "Okänd observatör" placeholders that pop to real names — but only once the
  // fetch has run long enough to be worth admitting to (`useDelayedFlag`).
  if (q.isPending) {
    return (
      <Screen inset="sub" bottomInset>
        {showSkeleton ? (
          <SettingsGroup footer={sv.blockedMembers.help}>
            {ids.map((userId, i) => (
              <SkeletonSelectRow key={userId} index={i} leading="avatar" />
            ))}
          </SettingsGroup>
        ) : null}
      </Screen>
    );
  }

  // On a failed profile fetch the rows fall back to id-only entries — unblocking
  // must stay possible even when names can't load.
  const members: MemberSummary[] =
    q.data ?? ids.map((userId) => ({ userId, displayName: null, avatarUrl: null, avatarPath: null }));

  return (
    <Screen inset="sub" bottomInset>
      <SettingsGroup footer={sv.blockedMembers.help}>
        {members.map((m) => {
          const name = m.displayName ?? sv.feed.unknownObserver;
          return (
            <PressableScale
              key={m.userId}
              variant="row"
              onPress={() => onUnblock(m.userId)}
              accessibilityRole="button"
              accessibilityLabel={`${sv.blockedMembers.unblock} ${name}`}
              style={styles.row}
            >
              <Avatar size="sm" name={name} uri={m.avatarUrl} cacheKey={m.avatarPath} />
              <ThemedText type="default" numberOfLines={1} style={styles.name}>
                {name}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="tint">
                {sv.blockedMembers.unblock}
              </ThemedText>
            </PressableScale>
          );
        })}
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 52,
  },
  name: { flex: 1 },
});
