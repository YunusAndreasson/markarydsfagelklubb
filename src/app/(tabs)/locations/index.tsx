/**
 * Lokaler — a full-screen map of the club's birding sites. One pin per lokal that
 * has coordinates; a brand-green pin marks a lokal with observations in the last
 * 14 days, a muted pin one that's been quiet (a legend spells the code out). Tap a
 * pin → a peek sheet with that lokal's recent activity and the larm sent from it.
 *
 * The only chrome on top is the NATIVE search bar (`headerSearchBarOptions`), which
 * lives in a transparent, title-less header (see `_layout`) so the map covers the
 * screen edge-to-edge behind it. Typing overlays a filtered results list over the
 * map (active lokaler first); tapping a result flies the map to that pin AND opens
 * the peek — so after dismissing it the map stays framed on the lokal you looked up.
 * A "visa alla" control (bottom-right) reframes every pin after a fly-to zoom.
 *
 * Full-bleed map, so this is NOT the `Screen` ScrollView — a flex `ThemedView`
 * with the `Map` filling it and overlays on top (see `location-picker.tsx`).
 */
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';

import { FloatingIconButton } from '@/components/floating-control';
import { CHEVRON, FIT, Icon, LOCATION } from '@/components/icon';
import { ActivityDot } from '@/components/location-activity';
import { Map, type MapMarker } from '@/components/map';
import { PressableScale } from '@/components/pressable-scale';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import {
  locationActivityQueryOptions,
  locationsQueryOptions,
  type Location,
} from '@/lib/query/locations';

/** A lokal that can be a pin — coordinates are guaranteed non-null. */
type PinnedLocation = Location & { latitude: number; longitude: number };

// Approx height of the native search bar below the status bar. Since the header is
// transparent, floating overlays + the results list would otherwise slide under it,
// so we clear this much below `insets.top`. iOS insets the results list itself via
// `contentInsetAdjustmentBehavior="automatic"`; Android needs the manual padding.
const SEARCH_BAR_CLEARANCE = 56;

export default function LocationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const locationsQuery = useQuery(locationsQueryOptions());
  const activityQuery = useQuery(locationActivityQueryOptions());

  // Memoized so the `?? {}` fallback doesn't hand a fresh object to the marker /
  // results memos on every render.
  const activity = useMemo(() => activityQuery.data ?? {}, [activityQuery.data]);

  // Only lokaler with coordinates can be pins (map-only coverage — coord-less
  // lokaler are omitted until their coords are added). Memoized so the map's
  // markers keep a stable identity across unrelated re-renders (search typing).
  const withCoords = useMemo(
    () =>
      (locationsQuery.data ?? []).filter(
        (l): l is PinnedLocation => l.latitude != null && l.longitude != null,
      ),
    [locationsQuery.data],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      withCoords.map((l) => ({
        id: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        label: l.name,
        tint: (activity[l.id] ?? 0) > 0 ? theme.tint : theme.mutedForeground,
      })),
    [withCoords, activity, theme.tint, theme.mutedForeground],
  );

  // --- Search -------------------------------------------------------------
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const q = query.trim().toLowerCase();
  const resultsVisible = showResults && q.length > 0;

  // Only the *filter* input is deferred, not `q` itself: the panel's visibility
  // above still tracks the typed value, so it opens on the first keystroke while
  // the list below is free to lag a frame. Matches the species picker, which
  // defers the same way — this list does strictly more work per keystroke (a
  // Swedish-collation `localeCompare` sort on top of the scan), so it had the
  // stronger claim on deferral of the two.
  const deferredQ = useDeferredValue(q);

  const results = useMemo(() => {
    if (!deferredQ) return [];
    return withCoords
      .filter((l) => l.name.toLowerCase().includes(deferredQ))
      // Active lokaler first (the ones worth heading to), then A–Ö.
      .sort((a, b) => {
        const aRank = (activity[a.id] ?? 0) > 0 ? 0 : 1;
        const bRank = (activity[b.id] ?? 0) > 0 ? 0 : 1;
        return aRank - bRank || a.name.localeCompare(b.name, 'sv');
      });
  }, [withCoords, deferredQ, activity]);

  // Stable handlers so the native search bar isn't reconfigured on every keystroke.
  const onChangeSearch = useCallback((e: { nativeEvent: { text: string } }) => {
    setQuery(e.nativeEvent.text);
    setShowResults(true);
  }, []);
  const onFocusSearch = useCallback(() => setShowResults(true), []);
  const onCancelSearch = useCallback(() => {
    setQuery('');
    setShowResults(false);
  }, []);

  // --- Imperative map controls -------------------------------------------
  const recenterTokenRef = useRef(0);
  const [recenter, setRecenter] =
    useState<{ latitude: number; longitude: number; token: number }>();
  const [fitToken, setFitToken] = useState(0);

  function flyTo(loc: PinnedLocation) {
    recenterTokenRef.current += 1;
    setRecenter({ latitude: loc.latitude, longitude: loc.longitude, token: recenterTokenRef.current });
  }

  function openLokal(loc: PinnedLocation) {
    hapticSelect();
    // Present the lokal's larm peek as a native sheet (see the root layout's
    // `location/[id]` formSheet). Name + activity count ride along as params so it
    // paints instantly.
    router.push({
      pathname: '/location/[id]',
      params: { id: String(loc.id), name: loc.name, activityCount: String(activity[loc.id] ?? 0) },
    });
  }

  function handleMarkerPress(id: MapMarker['id']) {
    const loc = withCoords.find((l) => l.id === id);
    if (loc) openLokal(loc);
  }

  function openFromSearch(loc: PinnedLocation) {
    setShowResults(false); // drop the list so the fly-to shows above the peek sheet
    flyTo(loc);
    openLokal(loc);
  }

  function handleFit() {
    hapticSelect();
    setFitToken((t) => t + 1);
  }

  function renderResult({ item }: { item: PinnedLocation }) {
    const count = activity[item.id] ?? 0;
    return (
      <PressableScale
        variant="row"
        haptic={false}
        onPress={() => openFromSearch(item)}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        pressedBackgroundColor={theme.backgroundSelected}
        style={styles.resultRow}
      >
        <ActivityDot active={count > 0} />
        <View style={styles.resultText}>
          <ThemedText type="default" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1}>
            {count > 0 ? sv.locations.activityRecent(count) : sv.locations.activityNone}
          </ThemedText>
        </View>
        <Icon name={CHEVRON} size={IconSize.control} color={theme.mutedForeground} />
      </PressableScale>
    );
  }

  const showEmpty =
    !locationsQuery.isPending && !locationsQuery.isError && withCoords.length === 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: sv.locations.searchPlaceholder,
            onChangeText: onChangeSearch,
            onFocus: onFocusSearch,
            onCancelButtonPress: onCancelSearch,
            autoCapitalize: 'none',
            // The map doesn't scroll, so pin the bar instead of hiding it.
            hideWhenScrolling: false,
          },
        }}
      />
      <Map
        markers={markers}
        onMarkerPress={handleMarkerPress}
        recenter={recenter}
        fitToken={fitToken}
        style={styles.map}
      />

      {/* Legend — makes the colour code discoverable (Norman). Hidden until there
          are pins to explain, and while the search results cover the map. */}
      {markers.length > 0 && !resultsVisible ? (
        <View
          style={[
            styles.legend,
            {
              bottom: insets.bottom + Spacing.three,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.legendRow}>
            <ActivityDot active />
            <ThemedText type="small" themeColor="foreground">
              {sv.locations.legendActive}
            </ThemedText>
            <View style={styles.legendGap} />
            <ActivityDot active={false} />
            <ThemedText type="small" themeColor="foreground">
              {sv.locations.legendQuiet}
            </ThemedText>
          </View>
          <ThemedText type="micro" themeColor="mutedForeground">
            {sv.locations.legendWindow}
          </ThemedText>
        </View>
      ) : null}

      {/* "Visa alla" — reframe every pin after a fly-to zoom (bottom-right, opposite
          the legend). Needs 2+ pins to fit; hidden while results cover the map. */}
      {markers.length >= 2 && !resultsVisible ? (
        <FloatingIconButton
          icon={FIT}
          size={IconSize.control}
          accessibilityLabel={sv.locations.showAll}
          onPress={handleFit}
          style={[styles.fab, { bottom: insets.bottom + Spacing.three }]}
        />
      ) : null}

      {/* Native-search results, overlaid on the map while typing. */}
      {resultsVisible ? (
        <FlatList
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={results}
          keyExtractor={(l) => String(l.id)}
          renderItem={renderResult}
          ListEmptyComponent={
            <View style={styles.resultsEmpty}>
              <ThemedText type="small" themeColor="mutedForeground">
                {sv.locations.searchEmpty}
              </ThemedText>
            </View>
          }
          contentContainerStyle={[
            styles.resultsContent,
            // The transparent header doesn't offset content on Android; clear the
            // status bar + search bar so the first result isn't hidden under it.
            Platform.OS === 'android' && { paddingTop: insets.top + SEARCH_BAR_CLEARANCE },
          ]}
        />
      ) : null}

      {/* Error / empty state, floated over the (Markaryd-wide) map. */}
      {!resultsVisible && locationsQuery.isError ? (
        <View
          style={[styles.overlay, { top: insets.top + SEARCH_BAR_CLEARANCE }]}
          pointerEvents="box-none"
        >
          <StateBlock tone="error" title={sv.locations.loadError} />
        </View>
      ) : !resultsVisible && showEmpty ? (
        <View
          style={[styles.overlay, { top: insets.top + SEARCH_BAR_CLEARANCE }]}
          pointerEvents="box-none"
        >
          <StateBlock icon={LOCATION} title={sv.locations.noCoords} />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Fill the flex parent (override the Map's default fixed height).
  map: { flex: 1, height: '100%' },
  legend: {
    position: 'absolute',
    left: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  // Separates the two legend pairs so "aktiv" and "tyst" don't read as one run.
  legendGap: { width: Spacing.two },
  fab: { right: Spacing.three },
  resultsContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: SurfaceRadius.sm,
    minHeight: 52,
  },
  resultText: { flex: 1, gap: Spacing.half },
  resultsEmpty: { paddingVertical: Spacing.four, alignItems: 'center' },
  overlay: { position: 'absolute', left: Spacing.three, right: Spacing.three },
});
