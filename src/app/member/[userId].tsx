import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ALERT, BLOCKED, TRAY } from '@/components/icon';
import { ListItemEntrance } from '@/components/list-item-entrance';
import { ObservationCard } from '@/components/observation-card';
import { ReportBlockButton } from '@/components/report-block-button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Skeleton, SkeletonCard } from '@/components/skeleton';
import { ErrorBlock, StateBlock } from '@/components/state-block';
import { showToast } from '@/components/toast';
import { sharedStyles } from '@/constants/shared-styles';
import { AvatarSize } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useMotion } from '@/hooks/use-motion';
import { unblockUser, useBlockedUsers } from '@/lib/blocks';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { deletableListItemMotion } from '@/lib/motion';
import { memberQueryOptions } from '@/lib/query/observations';
import { digitsForTel } from '@/lib/validation/profile';

// Member profile — a member's avatar/name (+ a "Ring" shortcut when they've
// shared a phone) over their last-14-days observations, reusing the M11
// `ObservationCard`. Pushed over the tabs from any observer footer (a feed card
// or the observation detail). Native parity with the web `member/$userId` route;
// the data (`fetchMemberFeed`) and all copy pre-exist (M3). The route owns a
// native header, so this uses the `sub` inset and sets the header title to the
// member's name once loaded (web parity) via an inline `Stack.Screen`.
export default function MemberScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const { motion } = useMotion();
  const q = useQuery(memberQueryOptions(userId));
  const blocked = useBlockedUsers();

  const profile = q.data?.profile ?? null;
  const observations = q.data?.observations ?? [];
  const name = profile?.displayName ?? sv.feed.unknownObserver;
  const isMe = !!user && user.id === userId;
  const isBlocked = blocked.has(userId);

  function handleUnblock() {
    unblockUser(userId);
    hapticSuccess();
    showToast(sv.moderation.unblocked, 'success');
  }

  let body: ReactNode;
  if (isBlocked) {
    // Blocked: hide their fynd, offer to undo right here (and via the header menu).
    body = (
      <StateBlock
        icon={BLOCKED}
        title={sv.member.blockedTitle}
        message={sv.member.blockedMessage}
        action={{ label: sv.blockedMembers.unblock, onPress: handleUnblock }}
      />
    );
  } else if (q.isLoading) {
    // Mirrors the loaded layout exactly. It used to place a wide bar beside the
    // avatar where a name would go — but the name is the nav title here, never
    // content, so that bar resolved into empty space on every load: the skeleton
    // was drawing a row the real screen doesn't have.
    body = (
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Skeleton width={AvatarSize.lg} height={AvatarSize.lg} radius={AvatarSize.lg / 2} />
        </View>
        <Skeleton width="35%" height={16} />
        {[0, 1].map((n) => (
          <SkeletonCard key={n} height={150} />
        ))}
      </View>
    );
  } else if (q.isError) {
    body = <ErrorBlock error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} />;
  } else if (!profile) {
    body = (
      <StateBlock
        icon={ALERT}
        title={sv.member.notFound}
        // A forward path out of the dead end — the native back chevron shouldn't
        // be the only exit.
        action={{ label: sv.observation.backToFeed, onPress: () => router.navigate('/') }}
      />
    );
  } else {
    const telHref = profile.phone ? `tel:${digitsForTel(profile.phone)}` : null;
    const rowMotion = deletableListItemMotion(motion);
    body = (
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Avatar size="lg" name={name} uri={profile.avatarUrl} />
          {/* The member's name is the native header title (set below, edenmind
              parity) — don't repeat it as a content heading. */}
          <View style={sharedStyles.flex} />
          {telHref ? (
            <Button
              title={sv.feed.callButtonGeneric}
              size="compact"
              accessibilityLabel={sv.feed.callButton(name)}
              onPress={() => void Linking.openURL(telHref)}
            />
          ) : null}
        </View>

        <SectionHeader title={sv.member.reportedHeading} />

        {observations.length > 0 ? (
          // `ListItemEntrance` (not a raw `entering` keyframe): the same busy-
          // sibling interruptions that stuck feed cards half-faded apply here
          // (reverse-geocode queries settle within the entrance window). Rows
          // still recede on optimistic edits/deletes via `exiting`.
          observations.map((obs, i) => (
            <ListItemEntrance key={obs.id} index={i} exiting={rowMotion.exiting}>
              {/* Every card here belongs to the member whose name is already the
                  nav title, so the observer footer was repetition — and tapping
                  it pushed a duplicate of this very screen. */}
              <ObservationCard observation={obs} currentUserId={user?.id} hideObserver />
            </ListItemEntrance>
          ))
        ) : (
          <StateBlock icon={TRAY} title={sv.member.empty} />
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: q.data?.profile?.displayName ?? sv.member.title,
          // Report/block another member (Apple 1.2). Stay on the screen after a
          // block so the blocked state + undo render in place.
          headerRight: isMe
            ? undefined
            : () => (
                <ReportBlockButton
                  userId={userId}
                  displayName={profile?.displayName ?? null}
                  reportRef={sv.moderation.reportMemberRef(name)}
                  onBlocked={() => {}}
                />
              ),
        }}
      />
      <Screen inset="sub" bottomInset refresh={q.refetch}>
        {body}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
