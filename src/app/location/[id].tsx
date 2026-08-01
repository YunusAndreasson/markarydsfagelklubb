/**
 * A lokal's peek — a native sheet (`presentation: 'formSheet'` in the root layout).
 * Built on the app's `Screen` scroller so its `contentInsetAdjustmentBehavior`
 * insets the content below the native sheet header (the lokal name) and fills the
 * sheet with the theme background (no black gap when the sheet expands). Shows the
 * recent-activity line + the durable larm sent from this lokal (newest first).
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { LocationActivity } from '@/components/location-activity';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Skeleton } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';
import { locationAlertsQueryOptions } from '@/lib/query/alerts';

export default function LocationSheet() {
  const theme = useTheme();
  const { id, name, activityCount } = useLocalSearchParams<{
    id: string;
    name?: string;
    activityCount?: string;
  }>();
  const locationId = Number(id);
  const count = Number(activityCount ?? '0');

  const alertsQuery = useQuery(locationAlertsQueryOptions(locationId));
  const alerts = alertsQuery.data ?? [];

  return (
    <Screen contentContainerStyle={styles.content}>
      {/* Lokal name lives in the native sheet header (set from the param). */}
      <Stack.Screen options={{ title: name ?? '' }} />

      {/* Activity summary — a dot signifier + one line, sharing the map's code. */}
      <LocationActivity count={count} />

      <SectionHeader title={sv.locations.larmsHeader} />

      {alertsQuery.isPending ? (
        <View style={styles.loading}>
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} width="80%" height={16} />
          ))}
        </View>
      ) : alertsQuery.isError ? (
        <StateBlock tone="error" title={sv.locations.larmsError} />
      ) : alerts.length === 0 ? (
        <StateBlock title={sv.locations.larmsEmpty} />
      ) : (
        alerts.map((a) => (
          <View key={a.id} style={[styles.row, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.rowName}>
              {a.speciesName ?? '—'}
            </ThemedText>
            <ThemedText type="small" themeColor="mutedForeground">
              {sv.feed.timeAgo(a.sentAt)}
            </ThemedText>
          </View>
        ))
      )}
    </Screen>
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
