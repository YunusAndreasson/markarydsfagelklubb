/**
 * Plats-väljaren — pick a common lokal from the quick-chip row, or set the
 * find's location by tapping/dragging the map or via GPS ("Använd min
 * position"). Ported from the web `location-picker` and extended: a chip picks a
 * `saved` lokal (submitted as `locationId`, shown as a named marker), any map
 * tap/drag or GPS fix replaces it with a `coords` value. Location is required,
 * so there is no "clear".
 *
 * Composes the M8 `Map` (tap/drag → `onPick`, token-keyed recenter) and `geo`.
 */
import { useRef, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { FilterChip } from '@/components/filter-chip';
import { CLOSE, EXPAND, Icon, LOCATION } from '@/components/icon';
import { Map } from '@/components/map';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Duration } from '@/constants/motion';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentPosition } from '@/lib/geo';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { commonLocationsQueryOptions, type CommonLocation } from '@/lib/query/locations';

export type LocationValue =
  | { kind: 'none' }
  | { kind: 'saved'; id: number; name: string; latitude?: number; longitude?: number }
  | { kind: 'coords'; latitude: number; longitude: number; accuracy?: number };

const MARKARYD = { latitude: 56.46, longitude: 13.6 };
const MAP_HEIGHT = 260;

export function LocationPicker({
  value,
  onChange,
  invalid,
  error,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  invalid?: boolean;
  /** Validation message shown (destructive) in place of the hint when required-but-empty.
   *  No own haptic — the sibling PickerFields already buzz on the same submit. */
  error?: string | null;
}) {
  const theme = useTheme();
  const { motion } = useMotion();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recenter, setRecenter] = useState<{ latitude: number; longitude: number; token: number }>();
  const tokenRef = useRef(0);

  // The most-used lokaler as one-tap picks. Purely additive sugar: while
  // loading / on error / when empty the row simply isn't there and the map
  // flow stands alone.
  const commonQuery = useQuery(commonLocationsQueryOptions());
  const common = commonQuery.data ?? [];

  const point =
    value.kind === 'coords'
      ? { latitude: value.latitude, longitude: value.longitude }
      : value.kind === 'saved' && value.latitude != null && value.longitude != null
        ? { latitude: value.latitude, longitude: value.longitude }
        : null;
  const accuracy = value.kind === 'coords' ? value.accuracy : undefined;

  function setPoint(latitude: number, longitude: number, acc?: number) {
    onChange({ kind: 'coords', latitude, longitude, accuracy: acc });
  }

  // A deliberate tap/drag to set the point — buzz like the other pickers. (Not
  // inside `setPoint`, which the GPS path also calls — no double buzz.) Shared by
  // the inline map and the fullscreen one.
  function handlePick(latitude: number, longitude: number) {
    hapticSelect();
    setPoint(latitude, longitude);
  }

  function recenterTo(latitude: number, longitude: number) {
    tokenRef.current += 1;
    setRecenter({ latitude, longitude, token: tokenRef.current });
  }

  // No own haptic — FilterChip already buzzes on press.
  function pickCommon(loc: CommonLocation) {
    onChange({
      kind: 'saved',
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    recenterTo(loc.latitude, loc.longitude);
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
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="mutedForeground">
        {sv.observation.locationLabel}
      </ThemedText>

      {common.length > 0 ? (
        // Bleed the scroll row to the screen edges (the form's padding) so chips
        // scroll off-screen instead of clipping at the card border.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.quickBleed}
          contentContainerStyle={styles.quickRow}
        >
          {common.map((loc) => (
            <FilterChip
              key={loc.id}
              label={loc.name}
              selected={value.kind === 'saved' && value.id === loc.id}
              onPress={() => pickCommon(loc)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View
        style={[
          styles.mapWrap,
          {
            borderColor: invalid ? theme.destructive : theme.border,
            borderWidth: invalid ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <Map
          markers={markers}
          center={point ?? MARKARYD}
          zoom={point ? 14 : 11}
          height={MAP_HEIGHT}
          markerDraggable
          onPick={handlePick}
          recenter={recenter}
        />
        {/* Expand to a fullscreen canvas for precise placement. A small corner
            button (not a full overlay) so the inline map stays tap-to-set. */}
        <PressableScale
          variant="icon"
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={sv.observation.mapExpand}
          style={[styles.expandBadge, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Icon name={EXPAND} size={16} color={theme.foreground} />
        </PressableScale>
      </View>

      {error ? (
        <Animated.View entering={motion(FadeInDown.duration(Duration.quick))}>
          <ThemedText type="small" themeColor="destructive">
            {error}
          </ThemedText>
        </Animated.View>
      ) : (
        <ThemedText type="small" themeColor="mutedForeground">
          {hint}
        </ThemedText>
      )}
      {point && accuracy != null ? (
        <ThemedText type="small" themeColor="mutedForeground">
          {sv.observation.locationAccuracy(accuracy)}
        </ThemedText>
      ) : null}

      <Button
        title={sv.observation.locationCurrent}
        variant="secondary"
        loading={pending}
        onPress={() => void requestMyPosition()}
      />

      {errorMsg ? (
        <ThemedText type="small" themeColor="destructive">
          {errorMsg}
        </ThemedText>
      ) : null}

      {blocked ? (
        <View style={[styles.blocked, { backgroundColor: theme.muted }]}>
          <Icon name={LOCATION} size={18} color={theme.mutedForeground} />
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
      ) : null}

      {/* Fullscreen canvas — same interactive map (tap/drag → onChange) on a
          full screen for precise placement, plus GPS and the live hint. State is
          shared, so a point set here is already applied when the modal closes. */}
      <Modal
        visible={expanded}
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
        statusBarTranslucent
      >
        <ThemedView style={styles.full}>
          {expanded ? (
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
            onPress={() => setExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel={sv.observation.mapClose}
            style={[
              styles.close,
              { top: insets.top + Spacing.two, backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Icon name={CLOSE} size={20} color={theme.foreground} />
          </PressableScale>

          <View style={[styles.fullBottom, { bottom: insets.bottom + Spacing.three }]}>
            <View style={[styles.hintPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="mutedForeground">
                {hint}
              </ThemedText>
            </View>
            <Button
              title={sv.observation.locationCurrent}
              variant="secondary"
              loading={pending}
              onPress={() => void requestMyPosition()}
            />
          </View>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  // Negative margin matches the Screen's 16px (`inset="tab"`) horizontal padding
  // so the chip row scrolls edge-to-edge instead of clipping at the form border.
  quickBleed: { marginHorizontal: -Spacing.three },
  quickRow: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  mapWrap: {
    borderRadius: SurfaceRadius.md,
    overflow: 'hidden',
  },
  // Small expand affordance in the inline map's corner — sits above the MapView
  // so its tap opens fullscreen while the rest of the map stays tap-to-set.
  expandBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SurfaceRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
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
  },
  blocked: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: SurfaceRadius.md,
  },
  blockedBody: { flex: 1, gap: Spacing.one, alignItems: 'flex-start' },
});
