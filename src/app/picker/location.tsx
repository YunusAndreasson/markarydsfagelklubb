/**
 * Plats-väljaren, as a native sheet (`presentation: 'formSheet'` in the root
 * layout; title in the native header). Built on the app's `Screen` scroller so the
 * list insets below the header and fills the sheet (no black gap on expand). Reads
 * like the other pickers — the saved lokaler plus two pinned actions:
 *   • "Använd min position" — GPS, then confirm on the map,
 *   • "Välj på karta" — tap/drag a point on the map.
 * Precise placement is a full-screen opaque `Modal`. The chosen `LocationValue`
 * goes back to the report form via the picker bridge. Location is required.
 */
import { useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { CHECK, CLOSE, Icon, LOCATION, MY_LOCATION, type IconName } from '@/components/icon';
import { Map } from '@/components/map';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentPosition } from '@/lib/geo';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { usePickerResult } from '@/lib/picker-bridge';
import {
  locationsQueryOptions,
  nearestLocationWithin,
  type Location,
  type LocatedLocation,
} from '@/lib/query/locations';
import { type LocationValue } from '@/components/location-picker';

const MARKARYD = { latitude: 56.46, longitude: 13.6 };

// Snap radius for "min position": if the GPS fix lands within this many metres of
// a named lokal, offer that lokal instead of a bare coordinate. 150 m is a
// deliberate middle ground — loose enough to catch "I'm standing at the site"
// given a Balanced (~100 m) fix and lokal points that mark a viewpoint/parking,
// yet tight enough that it rarely reaches a *different* nearby lokal. It stays a
// SUGGESTION (the user confirms it, or keeps the exact point), so a stray hit is
// harmless.
const SNAP_RADIUS_M = 150;

export default function LocationPickerSheet() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { currentId } = useLocalSearchParams<{ currentId?: string }>();
  const selectedId = currentId != null ? Number(currentId) : null;
  const choose = usePickerResult<LocationValue>();

  const [mapOpen, setMapOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [point, setPoint] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(
    null,
  );
  // A named lokal near the current GPS point (within SNAP_RADIUS_M) — the snap
  // suggestion. Only ever set from a GPS fix; a manual map pick clears it (a
  // deliberate point placement shouldn't be second-guessed).
  const [nearby, setNearby] = useState<LocatedLocation | null>(null);
  const [recenter, setRecenter] = useState<{ latitude: number; longitude: number; token: number }>();
  const tokenRef = useRef(0);

  const locationsQuery = useQuery(locationsQueryOptions());
  const locations = locationsQuery.data ?? [];

  function recenterTo(latitude: number, longitude: number) {
    tokenRef.current += 1;
    setRecenter({ latitude, longitude, token: tokenRef.current });
  }

  function handlePick(latitude: number, longitude: number) {
    hapticSelect();
    setPoint({ latitude, longitude });
    // A hand-placed point is intentional — drop any GPS snap suggestion.
    setNearby(null);
  }

  function pickLocation(loc: Location) {
    hapticSelect();
    choose({
      kind: 'saved',
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude ?? undefined,
      longitude: loc.longitude ?? undefined,
    });
  }

  function openMap(withGps: boolean) {
    setMapOpen(true);
    setNearby(null); // fresh each open; a GPS fix re-derives it below
    if (withGps) void requestMyPosition();
  }

  async function requestMyPosition() {
    setPending(true);
    try {
      const res = await getCurrentPosition();
      if (!res.ok) {
        setBlocked(res.denied);
        setErrorMsg(res.denied ? null : res.error);
        return;
      }
      setBlocked(false);
      setErrorMsg(null);
      setPoint({
        latitude: res.position.latitude,
        longitude: res.position.longitude,
        accuracy: res.position.accuracy,
      });
      // Snap: if we're standing at a named lokal, offer it instead of raw coords.
      setNearby(
        nearestLocationWithin(
          res.position.latitude,
          res.position.longitude,
          locations,
          SNAP_RADIUS_M,
        ),
      );
      recenterTo(res.position.latitude, res.position.longitude);
    } finally {
      setPending(false);
    }
  }

  function confirmPoint() {
    if (!point) {
      setMapOpen(false);
      return;
    }
    choose({ kind: 'coords', latitude: point.latitude, longitude: point.longitude, accuracy: point.accuracy });
  }

  const markers = point ? [{ id: 'pick', latitude: point.latitude, longitude: point.longitude }] : [];
  const hint = point ? sv.observation.locationDragHint : sv.observation.locationPickHint;

  return (
    <>
      <Screen contentContainerStyle={styles.content}>
        {/* Pinned map actions — "min position" first, then the manual map pick. */}
        <SheetAction icon={MY_LOCATION} label={sv.observation.locationCurrent} onPress={() => openMap(true)} />
        <SheetAction icon={LOCATION} label={sv.observation.locationMapPick} onPress={() => openMap(false)} />

        {locationsQuery.isPending ? (
          <View style={styles.loadingRows}>
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} width="70%" height={16} />
            ))}
          </View>
        ) : locations.length > 0 ? (
          <>
            <ThemedText type="smallBold" themeColor="mutedForeground" style={styles.listHeader}>
              {sv.observation.locationListHeader}
            </ThemedText>
            {locations.map((loc) => {
              const selected = selectedId === loc.id;
              return (
                <PressableScale
                  key={loc.id}
                  variant="row"
                  haptic={false}
                  onPress={() => pickLocation(loc)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.row, selected && { backgroundColor: theme.muted }]}
                >
                  <ThemedText
                    type="default"
                    themeColor={selected ? 'tint' : 'foreground'}
                    numberOfLines={1}
                    style={styles.rowLabel}
                  >
                    {loc.name}
                  </ThemedText>
                  {selected ? <Icon name={CHECK} size={IconSize.control} color={theme.tint} /> : null}
                </PressableScale>
              );
            })}
          </>
        ) : null}
      </Screen>

      {/* Full-screen map — the precise placement canvas (opaque Modal). */}
      <Modal
        visible={mapOpen}
        animationType="slide"
        onRequestClose={() => setMapOpen(false)}
        statusBarTranslucent
      >
        <ThemedView style={styles.full}>
          {mapOpen ? (
            <Map
              markers={markers}
              center={point ?? MARKARYD}
              zoom={point ? 15 : 11}
              markerDraggable
              onPick={handlePick}
              recenter={recenter}
              style={styles.fullMap}
            />
          ) : null}

          <PressableScale
            variant="icon"
            onPress={() => setMapOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={sv.common.close}
            style={[
              styles.close,
              { top: insets.top + Spacing.two, backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Icon name={CLOSE} size={IconSize.close} color={theme.foreground} />
          </PressableScale>

          <View style={[styles.fullBottom, { bottom: insets.bottom + Spacing.three }]}>
            <View style={[styles.hintPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="mutedForeground">
                {hint}
              </ThemedText>
              {point && point.accuracy != null ? (
                <ThemedText type="small" themeColor="mutedForeground">
                  {sv.observation.locationAccuracy(point.accuracy)}
                </ThemedText>
              ) : null}
            </View>

            {/* Snap suggestion — tint-bordered so it reads as an offer, not chrome. */}
            {nearby ? (
              <View style={[styles.suggestion, { backgroundColor: theme.card, borderColor: theme.tint }]}>
                <Icon name={LOCATION} size={IconSize.control} color={theme.tint} />
                <ThemedText type="smallBold" themeColor="foreground" style={styles.flex} numberOfLines={2}>
                  {sv.observation.locationNearby(nearby.name)}
                </ThemedText>
              </View>
            ) : null}

            {blocked ? (
              <View style={[styles.blocked, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Icon name={LOCATION} size={IconSize.control} color={theme.mutedForeground} />
                <View style={styles.blockedBody}>
                  <ThemedText type="small" themeColor="mutedForeground">
                    {sv.observation.locationBlockedHelpNative}
                  </ThemedText>
                  <PressableScale
                    variant="link"
                    onPress={() => void Linking.openSettings()}
                    accessibilityRole="button"
                  >
                    <ThemedText type="smallBold" themeColor="tint">
                      {sv.profile.location.openSettings}
                    </ThemedText>
                  </PressableScale>
                </View>
              </View>
            ) : errorMsg ? (
              <View style={[styles.hintPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ThemedText type="small" themeColor="destructive">
                  {errorMsg}
                </ThemedText>
              </View>
            ) : null}

            {nearby ? (
              // Standing at a named lokal → default to it, but keep the exact
              // point one tap away.
              <>
                <Button
                  title={sv.observation.locationUseNearby(nearby.name)}
                  onPress={() => pickLocation(nearby)}
                />
                <Button
                  title={sv.observation.locationUseExact}
                  variant="secondary"
                  onPress={confirmPoint}
                />
              </>
            ) : (
              <>
                <Button
                  title={sv.observation.locationCurrent}
                  variant="secondary"
                  loading={pending}
                  onPress={() => void requestMyPosition()}
                />
                <Button title={sv.common.done} onPress={confirmPoint} />
              </>
            )}
          </View>
        </ThemedView>
      </Modal>
    </>
  );
}

/** A pinned action row (min position / pick on map). */
function SheetAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      variant="row"
      haptic="select"
      onPress={onPress}
      style={[styles.action, { borderColor: theme.border }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={IconSize.action} color={theme.foreground} />
      <ThemedText type="default">{label}</ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.one, paddingTop: Spacing.two },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SurfaceRadius.md,
    minHeight: 56,
  },
  loadingRows: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  listHeader: { paddingHorizontal: Spacing.one, paddingTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: SurfaceRadius.sm,
  },
  rowLabel: { flex: 1 },
  full: { flex: 1 },
  fullMap: { flex: 1, height: '100%' },
  close: {
    position: 'absolute',
    right: Spacing.three,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SurfaceRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullBottom: { position: 'absolute', left: Spacing.three, right: Spacing.three, gap: Spacing.two },
  flex: { flex: 1 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.md,
    borderWidth: 1,
  },
  hintPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
  },
  blocked: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: SurfaceRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  blockedBody: { flex: 1, gap: Spacing.one, alignItems: 'flex-start' },
});
