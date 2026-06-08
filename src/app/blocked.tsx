import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Avatar } from '@/components/avatar';
import { TRAY } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsGroup } from '@/components/settings/settings-group';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';
import { unblockUser, useBlockedUsers } from '@/lib/blocks';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { fetchProfilesByIds } from '@/lib/query/profile';

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

  function onUnblock(userId: string) {
    unblockUser(userId);
    hapticSuccess();
    showToast(sv.moderation.unblocked, 'success');
  }

  if (ids.length === 0) {
    return (
      <Screen inset="sub">
        <StateBlock icon={TRAY} title={sv.blockedMembers.empty} />
      </Screen>
    );
  }

  const members = q.data ?? ids.map((userId) => ({ userId, displayName: null, avatarUrl: null }));

  return (
    <Screen inset="sub">
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
              <Avatar size="sm" name={name} uri={m.avatarUrl} />
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
