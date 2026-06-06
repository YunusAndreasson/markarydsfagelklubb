import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALERT, TRAY } from '@/components/icon';
import { ObservationCard } from '@/components/observation-card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SkeletonCard } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useMotion } from '@/hooks/use-motion';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { groupFeed, type FeedBucket } from '@/lib/feed';
import { sv } from '@/lib/i18n/sv';
import { listEntrance } from '@/lib/motion';
import { feedQueryOptions } from '@/lib/query/observations';

// Flöde (feed) — the app's home tab and first data-driven screen: the club's
// last-14-days observations, grouped by Stockholm calendar day, newest first.
// The "dashboard" IS the feed (web parity — no stats). NativeTabs render no JS
// header, so the SectionHeader is the visible title (tab-root grammar) and the
// top safe-area inset is applied manually.
const BUCKETS: { key: FeedBucket; label: string }[] = [
  { key: 'today', label: sv.feed.today },
  { key: 'yesterday', label: sv.feed.yesterday },
  { key: 'thisWeek', label: sv.feed.thisWeek },
  { key: 'earlier', label: sv.feed.earlier },
];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAuth();
  const { motion } = useMotion();
  const feed = useQuery(feedQueryOptions());
  const { refreshing, onRefresh } = usePullToRefresh(feed.refetch);

  const grouped = useMemo(() => groupFeed(feed.data ?? []), [feed.data]);
  const total = feed.data?.length ?? 0;

  let body: ReactNode;
  if (total > 0) {
    // One continuous stagger index across all buckets so the cascade reads as a
    // single column rather than restarting under each header.
    const order = new Map<string, number>();
    const sections = BUCKETS.map((b) => ({ ...b, items: grouped[b.key] })).filter(
      (s) => s.items.length > 0,
    );
    sections.forEach((s) => s.items.forEach((o) => order.set(o.id, order.size)));

    body = (
      <>
        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <SectionHeader title={section.label} />
            {section.items.map((obs) => (
              <Animated.View key={obs.id} entering={motion(listEntrance(order.get(obs.id) ?? 0))}>
                <ObservationCard observation={obs} currentUserId={user?.id} />
              </Animated.View>
            ))}
          </View>
        ))}
      </>
    );
  } else if (feed.isLoading) {
    body = (
      <View style={styles.section}>
        {[0, 1, 2].map((n) => (
          <SkeletonCard key={n} height={150} />
        ))}
      </View>
    );
  } else if (feed.isError) {
    body = (
      <StateBlock
        tone="error"
        icon={ALERT}
        title={sv.errors.somethingWrong}
        message={sv.errors.somethingWrongHelp}
        action={{ label: sv.errors.tryAgain, onPress: () => void feed.refetch(), loading: feed.isFetching }}
      />
    );
  } else {
    body = (
      <StateBlock
        icon={TRAY}
        title={sv.feed.empty}
        action={{ label: sv.feed.newObservation, onPress: () => router.navigate('/new') }}
      />
    );
  }

  return (
    <Screen
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: insets.top + Spacing.three }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <SectionHeader title={sv.feed.title} caption={sv.app.tagline} level="card" />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
});
