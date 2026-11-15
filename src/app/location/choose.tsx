import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings/settings-row';
import { SheetTitle } from '@/components/sheet-title';
import { ErrorBlock, StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { sv } from '@/lib/i18n/sv';
import { locationAlertsQueryOptions } from '@/lib/query/alerts';
import { locationActivityQueryOptions, locationsQueryOptions, type Location } from '@/lib/query/locations';
import { prefetchOnIntent } from '@/lib/query/prefetch';

/** A native sheet makes each overlapping pin independently selectable. */
export default function ChooseLocationScreen() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const locations = useQuery(locationsQueryOptions());
  const activity = useQuery(locationActivityQueryOptions());
  const requested = new Set((Array.isArray(ids) ? ids.join(',') : ids ?? '').split(',').map(Number));
  const choices = (locations.data ?? []).filter((location) => requested.has(location.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));

  function choose(location: Location) {
    prefetchOnIntent(locationAlertsQueryOptions(location.id));
    router.replace({ pathname: '/location/[id]', params: {
      id: String(location.id), name: location.name, activityCount: String(activity.data?.[location.id] ?? 0),
    } });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: sv.locations.chooseTitle }} />
      <SheetTitle title={sv.locations.chooseTitle} />
      <ThemedText type="small" themeColor="mutedForeground">{sv.locations.chooseHelp}</ThemedText>
      {locations.isError ? <ErrorBlock error={locations.error} onRetry={() => void locations.refetch()} /> : null}
      {!locations.isPending && !locations.isError && choices.length === 0 ? <StateBlock title={sv.locations.chooseEmpty} /> : null}
      {choices.map((location) => (
        <SettingsRow key={location.id} label={location.name} labelNumberOfLines={0} accessory="chevron" onPress={() => choose(location)} />
      ))}
    </Screen>
  );
}
