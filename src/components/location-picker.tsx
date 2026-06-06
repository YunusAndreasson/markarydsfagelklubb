/**
 * Plats-väljaren — set the find's location by tapping/dragging the map or via GPS
 * ("Använd min position"). The native port of the web `location-picker`: it emits
 * a coordinate on any user action; a `saved` value is only an inbound (edit-mode)
 * display state rendered as a named marker — there is no saved-location list here
 * (web parity). Location is required, so there is no "clear".
 *
 * Composes the M8 `Map` (tap/drag → `onPick`, token-keyed recenter) and `geo`.
 */
import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, LOCATION } from '@/components/icon';
import { Map } from '@/components/map';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentPosition } from '@/lib/geo';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

export type LocationValue =
  | { kind: 'none' }
  | { kind: 'saved'; id: number; name: string; latitude?: number; longitude?: number }
  | { kind: 'coords'; latitude: number; longitude: number; accuracy?: number };

const MARKARYD = { latitude: 56.46, longitude: 13.6 };

export function LocationPicker({
  value,
  onChange,
  invalid,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  invalid?: boolean;
}) {
  const theme = useTheme();
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recenter, setRecenter] = useState<{ latitude: number; longitude: number; token: number }>();
  const tokenRef = useRef(0);

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

  function recenterTo(latitude: number, longitude: number) {
    tokenRef.current += 1;
    setRecenter({ latitude, longitude, token: tokenRef.current });
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

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="mutedForeground">
        {sv.observation.locationLabel}
      </ThemedText>
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
          height={220}
          markerDraggable
          onPick={(lat, lng) => {
            // A deliberate tap/drag to set the point — buzz like the other pickers.
            // (Not inside `setPoint`, which the GPS path also calls — no double buzz.)
            hapticSelect();
            setPoint(lat, lng);
          }}
          recenter={recenter}
        />
      </View>

      <ThemedText type="small" themeColor="mutedForeground">
        {point ? sv.observation.locationDragHint : sv.observation.locationPickHint}
      </ThemedText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  mapWrap: {
    borderRadius: SurfaceRadius.md,
    overflow: 'hidden',
  },
  blocked: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: SurfaceRadius.md,
  },
  blockedBody: { flex: 1, gap: Spacing.one, alignItems: 'flex-start' },
});
