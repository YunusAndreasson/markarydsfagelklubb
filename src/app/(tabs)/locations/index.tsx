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
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FloatingIconButton } from '@/components/floating-control';
import { CHEVRON, FIT, Icon, LOCATION } from '@/components/icon';
import { ActivityDot } from '@/components/location-activity';
import { Map, type MapMarker } from '@/components/map';
import { PressableScale } from '@/components/pressable-scale';
import { SearchField } from '@/components/search-field';
import { ErrorBlock, StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { foldSearch } from '@/lib/search';
import { locationAlertsQueryOptions } from '@/lib/query/alerts';
import {
  locationActivityQueryOptions,
  locationsQueryOptions,
  type Location,
} from '@/lib/query/locations';
import { prefetchOnIntent } from '@/lib/query/prefetch';
import { isOfflinePending } from '@/lib/query/status';

/** A lokal that can be a pin — coordinates are guaranteed non-null. */
type PinnedLocation = Location & { latitude: number; longitude: number };

/** Height of the app's own search field (`SearchField`, Android). */
const SEARCH_FIELD_HEIGHT = 48;

// How far below `insets.top` the search control ends. The header is transparent,
// so floating overlays and the results list would otherwise slide under it. On
// Android this is the exact geometry of the field below (gap + field + gap); on
// iOS it approximates the native bar, which insets the results list itself via
// `contentInsetAdjustmentBehavior="automatic"`.
const SEARCH_BAR_CLEARANCE = Spacing.two + SEARCH_FIELD_HEIGHT + Spacing.two;

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
  // Folded, so "angaback" finds Ängabäck — see `lib/search`.
  const q = foldSearch(query.trim());
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
      .filter((l) => foldSearch(l.name).includes(deferredQ))
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
    // The peek's larm list is the one detail query with no cache to seed from, so
    // start it here rather than letting it begin when the route mounts — that buys
    // it the navigation commit plus the sheet's presentation animation.
    prefetchOnIntent(locationAlertsQueryOptions(loc.id));
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
    if (!loc) return;
    // The one navigation that keeps its tick: a map pin has no press state to
    // watch, so the haptic is the only confirmation that the tap landed on a pin
    // and not on empty map. The search row below navigates the ordinary way and
    // stays silent.
    hapticSelect();
    openLokal(loc);
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
        onPress={() => openFromSearch(item)}
        // Fetch on intent: the larm query starts while the finger is still down.
        onPressIn={() => prefetchOnIntent(locationAlertsQueryOptions(item.id))}
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
  const locationsOffline = isOfflinePending(locationsQuery);
  // Offline says its piece immediately (nothing is coming); an ordinary fetch
  // gets the usual grace period before the app admits to loading.
  const delayedLoading = useDelayedFlag(locationsQuery.isPending && !locationsOffline);
  const showLoadingPill = locationsOffline || delayedLoading;

  // The lokal peek is a formSheet presented OVER this screen, and it rises from
  // the bottom — straight over the legend (bottom-left) and "visa alla"
  // (bottom-right), which sit at `insets.bottom`. Both ended up half-swallowed by
  // the sheet: a legend sliced through its own text, and a floating button you
  // could see the top of but not press. They explain the map, and the map is what
  // the sheet is covering, so the honest move is to take them away while it's up
  // and give them back on dismiss. `usePathname` is reactive and needs no state —
  // the peek route is `/location/<id>`.
  const pathname = usePathname();
  const peekOpen = pathname.startsWith('/location/');
  const mapChromeVisible = !resultsVisible && !peekOpen;

  // Dark status-bar glyphs while this screen is showing, so the map can keep
  // running edge-to-edge under them.
  //
  // The base map is light in BOTH app themes, but the root layout sets the
  // glyphs from the app theme — so in dark mode they went white-on-pale-green
  // (measured 1.15:1). That was first "fixed" with an opaque band the height of
  // `insets.top`, which bought contrast by covering the map: on a light theme it
  // read as a white gap above a map that is supposed to be full-bleed. Setting
  // the STYLE fixes the same contrast at its source (dark glyphs on light tiles
  // is ~15:1) and costs the map nothing. Same trick as the photo viewer, which
  // forces light glyphs over its black backdrop.
  //
  // Gated on the route because native tabs mount every tab at startup (see
  // `native-tabs-render-all-tabs-eagerly`): an ungated `StatusBar` here would
  // sit on expo-status-bar's stack from launch and force dark glyphs across the
  // whole app. `/location` matches both this screen and the peek sheet, which
  // leaves the map visible behind it.
  const mapOnScreen = pathname.startsWith('/location');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          // iOS only — Android searches with the app's own `SearchField` below.
          // Its transparent header used to draw no native bar at all; since
          // SDK 58 (react-native-screens 4.30) it draws the native search icon on
          // top of that field, which expands into a second, overlapping bar.
          headerSearchBarOptions:
            Platform.OS === 'ios'
              ? {
                  placeholder: sv.locations.searchPlaceholder,
                  onChangeText: onChangeSearch,
                  onFocus: onFocusSearch,
                  onCancelButtonPress: onCancelSearch,
                  autoCapitalize: 'none',
                  // The map doesn't scroll, so pin the bar instead of hiding it.
                  hideWhenScrolling: false,
                }
              : undefined,
        }}
      />
      <Map
        markers={markers}
        onMarkerPress={handleMarkerPress}
        recenter={recenter}
        fitToken={fitToken}
        style={styles.map}
      />

      {mapOnScreen ? <StatusBar style="dark" /> : null}

      {/* Legend — makes the colour code discoverable (Norman). Hidden until there
          are pins to explain, and while the results list or the peek sheet covers
          the map. */}
      {markers.length > 0 && mapChromeVisible ? (
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
          the legend). Needs 2+ pins to fit; hidden while the results list or the
          peek sheet covers the map. */}
      {markers.length >= 2 && mapChromeVisible ? (
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

      {/* The Android search field, floating over the map — LAST, so it stays on
          top of the results list it drives. Android's transparent header renders
          no visible native search bar (see `SearchField`), which left the map's
          only control invisible: nothing said this screen was searchable, and
          typed text appeared from nowhere over the tiles. No-op on iOS, where the
          native bar in the header is the real control. */}
      <View
        style={[styles.searchOverlay, { top: insets.top + Spacing.two }]}
        pointerEvents="box-none"
      >
        <SearchField
          value={query}
          onChangeText={(next) => {
            setQuery(next);
            setShowResults(true);
          }}
          placeholder={sv.locations.searchPlaceholder}
          elevated
        />
      </View>

      {/* Loading / error / empty state, floated over the (Markaryd-wide) map. */}
      {!resultsVisible && showLoadingPill ? (
        // Deliberately a quiet pill, not a skeleton: the map IS the content and
        // it is already drawn, so the only thing missing is the pins. A pinless
        // Markaryd otherwise reads as "this kommun has no lokaler", which is the
        // same false-empty the feed had.
        <View
          style={[styles.overlay, { top: insets.top + SEARCH_BAR_CLEARANCE }]}
          pointerEvents="none"
        >
          <ThemedView
            style={[styles.loadingPill, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <ThemedText type="small" themeColor="mutedForeground">
              {locationsOffline ? sv.errors.offline : sv.locations.loading}
            </ThemedText>
          </ThemedView>
        </View>
      ) : !resultsVisible && locationsQuery.isError ? (
        <View
          style={[styles.overlay, { top: insets.top + SEARCH_BAR_CLEARANCE }]}
          pointerEvents="box-none"
        >
          {/* Was a bare `StateBlock tone="error"` with no way out — same drift as
              the lokal peek. `ErrorBlock` brings the network-aware copy and a
              retry. */}
          <ErrorBlock
            error={locationsQuery.error}
            onRetry={() => void locationsQuery.refetch()}
            retrying={locationsQuery.isFetching}
          />
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
  searchOverlay: { position: 'absolute', left: Spacing.three, right: Spacing.three },
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
  loadingPill: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  overlay: { position: 'absolute', left: Spacing.three, right: Spacing.three },
});
