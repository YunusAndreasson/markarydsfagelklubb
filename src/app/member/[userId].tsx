import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { Linking, RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ALERT, BLOCKED, TRAY } from '@/components/icon';
import { ObservationCard } from '@/components/observation-card';
import { ReportBlockButton } from '@/components/report-block-button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Skeleton, SkeletonCard } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { showToast } from '@/components/toast';
import { AvatarSize } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useMotion } from '@/hooks/use-motion';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { unblockUser, useBlockedUsers } from '@/lib/blocks';
import { hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { listEntrance } from '@/lib/motion';
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
  const theme = useTheme();
  const { user } = useAuth();
  const { motion } = useMotion();
  const q = useQuery(memberQueryOptions(userId));
  const { refreshing, onRefresh } = usePullToRefresh(q.refetch);
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
    body = (
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Skeleton width={AvatarSize.lg} height={AvatarSize.lg} radius={AvatarSize.lg / 2} />
          <Skeleton width="50%" height={22} />
        </View>
        <Skeleton width="35%" height={16} />
        {[0, 1].map((n) => (
          <SkeletonCard key={n} height={150} />
        ))}
      </View>
    );
  } else if (q.isError) {
    body = (
      <StateBlock
        tone="error"
        icon={ALERT}
        title={sv.errors.somethingWrong}
        message={sv.errors.somethingWrongHelp}
        action={{ label: sv.errors.tryAgain, onPress: () => void q.refetch(), loading: q.isFetching }}
      />
    );
  } else if (!profile) {
    body = <StateBlock icon={ALERT} title={sv.member.notFound} />;
  } else {
    const telHref = profile.phone ? `tel:${digitsForTel(profile.phone)}` : null;
    body = (
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Avatar size="lg" name={name} uri={profile.avatarUrl} />
          {/* The member's name is the native header title (set below, edenmind
              parity) — don't repeat it as a content heading. */}
          <View style={styles.flex} />
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
          observations.map((obs, i) => (
            <Animated.View key={obs.id} entering={motion(listEntrance(i))}>
              <ObservationCard observation={obs} currentUserId={user?.id} />
            </Animated.View>
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
      <Screen
        inset="sub"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {body}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
});
