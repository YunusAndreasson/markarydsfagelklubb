/**
 * A lokal's peek — a native sheet (`presentation: 'formSheet'` in the root layout).
 * Built on the app's `Screen` scroller so its `contentInsetAdjustmentBehavior`
 * insets the content below the native sheet header (the lokal name) and fills the
 * sheet with the theme background (no black gap when the sheet expands). Shows the
 * recent-activity line + the durable larm sent from this lokal (newest first).
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { CHEVRON, Icon } from '@/components/icon';
import { LocationActivity } from '@/components/location-activity';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SheetTitle } from '@/components/sheet-title';
import { SkeletonLine } from '@/components/skeleton';
import { ErrorBlock, OfflineBlock, StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';
import { type Alert, locationAlertsQueryOptions } from '@/lib/query/alerts';
import { isOfflinePending } from '@/lib/query/status';

export default function LocationSheet() {
  const { id, name, activityCount } = useLocalSearchParams<{
    id: string;
    name?: string;
    activityCount?: string;
  }>();
  const locationId = Number(id);
  const count = Number(activityCount ?? '0');

  const alertsQuery = useQuery(locationAlertsQueryOptions(locationId));
  const alerts = alertsQuery.data ?? [];
  // The one detail query with no sibling cache to seed from, so `isPending` is
  // the honest flag here — but it's warmed by `prefetchOnIntent` at the tap, and
  // re-opening a lokal hits the 24h cache, so this is usually a first-visit-only
  // placeholder.
  const offline = isOfflinePending(alertsQuery);
  const showSkeleton = useDelayedFlag(alertsQuery.isPending && !offline);
  // One subscription for the whole sheet rather than one per row — the ages tick
  // together, and the sheet is often left open while deciding whether to drive out.
  const now = useNow();

  return (
    <Screen contentContainerStyle={styles.content}>
      {/* Lokal name in the native sheet header — iOS only; Android formSheets
          render no header, which left this sheet completely anonymous: you tap
          one of ~60 pins and nothing on screen says which lokal you got. The
          `SheetTitle` below is the Android half (no-op on iOS, where an
          in-content title would double up with the header). */}
      <Stack.Screen options={{ title: name ?? '' }} />
      <SheetTitle title={name} />

      {/* Activity summary — a dot signifier + one line, sharing the map's code. */}
      <LocationActivity count={count} />

      <SectionHeader title={sv.locations.larmsHeader} />

      {offline ? (
        // Nothing cached and no way to fetch — say so, rather than showing bones
        // that will never resolve or claiming this lokal has never had a larm.
        <OfflineBlock />
      ) : showSkeleton ? (
        // Row-shaped, not floating bars: same 48dp bordered rows the larm list
        // renders, so the list lands exactly where its placeholder stood.
        <View style={styles.loading}>
          {[0, 1, 2].map((n) => (
            <AlertRowSkeleton key={n} />
          ))}
        </View>
      ) : alertsQuery.isPending ? null : alertsQuery.isError ? (
        // Was a bare `StateBlock tone="error"`, which is the drift `ErrorBlock`
        // exists to prevent: it lost the network-aware copy AND the retry, so a
        // failed larm load was a dead end on the one screen you'd most want to
        // reload.
        <ErrorBlock
          error={alertsQuery.error}
          onRetry={() => void alertsQuery.refetch()}
          retrying={alertsQuery.isFetching}
        />
      ) : alerts.length === 0 ? (
        <StateBlock title={sv.locations.larmsEmpty} />
      ) : (
        alerts.map((a) => <AlertRow key={a.id} alert={a} now={now} />)
      )}
    </Screen>
  );
}

/**
 * One larm in the lokal's list. Opens the observation behind it — the row already
 * looked like the app's tappable-row idiom (48 dp, bordered, name + time) but was a
 * plain `View` that did nothing, so the lokal was a dead end.
 *
 * A larm whose `observationId` is null stays inert and gets no chevron: those are
 * backfilled/legacy rows with nothing to open, and a chevron promising a screen
 * that doesn't exist is the same false affordance in the other direction.
 *
 * `dismissTo`, NOT `push`. A formSheet on iOS is a real UIKit modal presentation,
 * so pushing onto the same stack puts the detail INSIDE the sheet — constrained to
 * the sheet's detent, which reads on device as "the tap did nothing". `dismissTo`
 * dispatches POP_TO: it pops to the target, or adds it when it isn't in the stack
 * (which it never is here). The sheet goes away and the detail appears in one
 * state change — no dismiss-then-push race. Back then lands on the Lokaler map.
 */
/** {@link AlertRow}'s bones — the same bordered 48dp row with the name and the
 *  time-ago in their real positions. */
function AlertRowSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, { borderColor: theme.border }]}
    >
      <SkeletonLine type="smallBold" width="55%" style={styles.rowName} />
      <SkeletonLine type="small" width={56} />
    </View>
  );
}

function AlertRow({ alert, now }: { alert: Alert; now: Date }) {
  const theme = useTheme();
  const name = alert.speciesName ?? '—';
  // When the bird was SEEN, not when the push went out — the same instant the
  // feed card ages from. The two drifted apart by however long the reporter took
  // to file, so one Havsörn read "2h sedan" in the feed and "35m sedan" in the
  // lokal peek, and there was no way to tell which one to trust. `sentAt` is the
  // fallback only for the handful of legacy rows with no snapshotted `observedAt`.
  const when = sv.feed.timeAgo(alert.observedAt ?? alert.sentAt, now);

  const body = (
    <>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.rowName}>
        {name}
      </ThemedText>
      <ThemedText type="small" themeColor="mutedForeground">
        {when}
      </ThemedText>
    </>
  );

  if (!alert.observationId) {
    return <View style={[styles.row, { borderColor: theme.border }]}>{body}</View>;
  }

  return (
    <PressableScale
      variant="row"
      onPress={() =>
        router.dismissTo({
          pathname: '/observation/[id]',
          params: { id: alert.observationId as string },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${when}`}
      style={[styles.row, { borderColor: theme.border }]}
    >
      {body}
      <Icon name={CHEVRON} size={IconSize.control} color={theme.mutedForeground} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.two, paddingTop: Spacing.two },
  loading: { gap: Spacing.three, paddingVertical: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: SurfaceRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowName: { flex: 1 },
});
