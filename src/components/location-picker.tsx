/**
 * Plats-väljaren — a `PickerField` trigger (like species/activity) that opens a
 * bottom `PickerSheet` shaped as a familiar *list* (Jakob's law: it reads like
 * the activity picker the user already knows). The sheet, top→bottom:
 *   • "Använd min position" — pinned action row; opens the map and drops a pin at
 *     the current GPS position,
 *   • "Välj på karta" — pinned action row; opens the map to tap/drag a point,
 *   • the most-used lokaler as a plain selectable list (tap → `saved`, closes).
 * Precise placement happens on a full-screen map (an opaque `Modal`, so no
 * map-in-transparent-sheet rendering quirks). Location is required — no "clear".
 *
 * Composes the M8 `Map` (tap/drag → `onPick`, token-keyed recenter) and `geo`.
 */
import { useRef, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { CHECK, CLOSE, Icon, LOCATION, MY_LOCATION } from '@/components/icon';
import { Map } from '@/components/map';
import { PickerField } from '@/components/picker-field';
import { PickerSheet, SheetActionRow } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentPosition } from '@/lib/geo';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { locationsQueryOptions, type Location } from '@/lib/query/locations';

export type LocationValue =
  | { kind: 'none' }
  | { kind: 'saved'; id: number; name: string; latitude?: number; longitude?: number }
  | { kind: 'coords'; latitude: number; longitude: number; accuracy?: number };

const MARKARYD = { latitude: 56.46, longitude: 13.6 };

export function LocationPicker({
  value,
  onChange,
  invalid,
  error,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  invalid?: boolean;
  /** Validation message shown (destructive) under the field when required-but-empty. */
  error?: string | null;
}) {
  const theme = useTheme();
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [listOpen, setListOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recenter, setRecenter] = useState<{ latitude: number; longitude: number; token: number }>();
  const tokenRef = useRef(0);

  // The PickerSheet card pads its bottom by the safe-area inset. A scrolling body
  // must extend *through* that padding (negative margin cancels it) and re-add it
  // as scroll content, so the list reaches the sheet's bottom edge instead of
  // leaving a dead band below the viewport.
  const bottomInset = insets.bottom + Spacing.three;

  const locationsQuery = useQuery(locationsQueryOptions());
  const locations = locationsQuery.data ?? [];

  const point =
    value.kind === 'coords'
      ? { latitude: value.latitude, longitude: value.longitude }
      : value.kind === 'saved' && value.latitude != null && value.longitude != null
        ? { latitude: value.latitude, longitude: value.longitude }
        : null;
  const accuracy = value.kind === 'coords' ? value.accuracy : undefined;

  // The field's summary line: the named lokal, "På karta" for a raw point, or the
  // placeholder when nothing is set yet.
  const summary =
    value.kind === 'saved'
      ? value.name
      : value.kind === 'coords'
        ? sv.feed.locationOnMap
        : null;

  function setPoint(latitude: number, longitude: number, acc?: number) {
    onChange({ kind: 'coords', latitude, longitude, accuracy: acc });
  }

  // A deliberate tap/drag on the map — buzz like the other pickers. (Not inside
  // `setPoint`, which the GPS path also calls — no double buzz.)
  function handlePick(latitude: number, longitude: number) {
    hapticSelect();
    setPoint(latitude, longitude);
  }

  function recenterTo(latitude: number, longitude: number) {
    tokenRef.current += 1;
    setRecenter({ latitude, longitude, token: tokenRef.current });
  }

  // Picking a lokal from the list is the quick path — select and close, like the
  // activity picker. Some lokaler have no coordinates (nothing to place on the
  // map); the observation still references the lokal by id.
  function pickLocation(loc: Location) {
    hapticSelect();
    onChange({
      kind: 'saved',
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude ?? undefined,
      longitude: loc.longitude ?? undefined,
    });
    setListOpen(false);
  }

  // The list → map handoff. The sheet closes first so the two modals are never
  // stacked. `withGps` fires a location fix straight away (the "min position" row);
  // "Välj på karta" opens the same map centered on the existing point for a manual
  // tap.
  function openMap(withGps: boolean) {
    setListOpen(false);
    setMapOpen(true);
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
      setPoint(res.position.latitude, res.position.longitude, res.position.accuracy);
      recenterTo(res.position.latitude, res.position.longitude);
    } finally {
      setPending(false);
    }
  }

  const markers = point
    ? [
        {
          id: 'pick',
          latitude: point.latitude,
          longitude: point.longitude,
          label: value.kind === 'saved' ? value.name : undefined,
        },
      ]
    : [];

  const hint = point ? sv.observation.locationDragHint : sv.observation.locationPickHint;

  return (
    <>
      <PickerField
        label={sv.observation.locationLabel}
        value={summary}
        placeholder={sv.observation.locationPlaceholder}
        invalid={invalid}
        error={error}
        onPress={() => setListOpen(true)}
        leading={<Icon name={LOCATION} size={IconSize.control} color={theme.mutedForeground} />}
      />

      {/* The list sheet — familiar activity-picker shape. */}
      <PickerSheet
        visible={listOpen}
        title={sv.observation.locationLabel}
        onClose={() => setListOpen(false)}
      >
        <ScrollView
          style={{ maxHeight: winH * 0.62, marginBottom: -bottomInset }}
          contentContainerStyle={[styles.listBody, { paddingBottom: bottomInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Pinned map actions — "min position" first, then the manual map pick. */}
          <SheetActionRow
            icon={MY_LOCATION}
            label={sv.observation.locationCurrent}
            onPress={() => openMap(true)}
          />
          <SheetActionRow
            icon={LOCATION}
            label={sv.observation.locationMapPick}
            onPress={() => openMap(false)}
          />

          {/* Every saved lokal as a plain selectable list (A–Ö). Absent while
              loading / on error / when empty — the map actions above always
              stand alone. */}
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
                const selected = value.kind === 'saved' && value.id === loc.id;
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
        </ScrollView>
      </PickerSheet>

      {/* Full-screen map — the precise placement canvas (opaque Modal). Tap/drag
          sets the point (state is shared, so it's already applied); "Klar"
          confirms, the corner ✕ goes back to the list. */}
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
            onPress={() => {
              setMapOpen(false);
              setListOpen(true);
            }}
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
              {point && accuracy != null ? (
                <ThemedText type="small" themeColor="mutedForeground">
                  {sv.observation.locationAccuracy(accuracy)}
                </ThemedText>
              ) : null}
            </View>

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

            {/* GPS above the confirm button — the position action stays reachable
                without hunting for it. */}
            <Button
              title={sv.observation.locationCurrent}
              variant="secondary"
              loading={pending}
              onPress={() => void requestMyPosition()}
            />
            <Button title={sv.common.done} onPress={() => setMapOpen(false)} />
          </View>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  listBody: { gap: Spacing.one },
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
  // Override the Map's default fixed height so it fills the flex parent.
  fullMap: { flex: 1, height: '100%' },
  close: {
    position: 'absolute',
    right: Spacing.three,
    // ≥44pt visible target (Apple HIG / Material) for the primary dismiss control.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SurfaceRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullBottom: { position: 'absolute', left: Spacing.three, right: Spacing.three, gap: Spacing.two },
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
