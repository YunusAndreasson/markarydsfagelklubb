/**
 * The reusable native map — the `react-native-maps` equivalent of the web's
 * `leaflet-map.tsx`. Props mirror the web `MapClientProps` so callers (the M9
 * location picker, M11 feed cards, M12 detail) share one contract:
 *   • `markers`        — pins to drop (fit-to-bounds kicks in at 2+).
 *   • `onPick`         — tap-to-set + drag-to-refine report (lat, lng).
 *   • `markerDraggable`— make the (single) marker draggable.
 *   • `recenter`       — bump `.token` to imperatively pan to a point.
 *   • `interactive`    — false for a static read-only preview.
 *
 * Android renders Google tiles (`PROVIDER_GOOGLE`), which need a Maps API key in
 * `.env` (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) — without it the base is grey but the
 * component still mounts and reports taps. iOS uses the default provider (Apple
 * Maps), which needs no key or extra SDK; `PROVIDER_GOOGLE` on iOS would require a
 * separate iOS Google Maps SDK + `iosGoogleMapsApiKey` and a native rebuild, so it
 * renders blank there — Apple Maps is the right native choice.
 */
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTheme } from '@/hooks/use-theme';

export type MapMarker = {
  id: string | number;
  latitude: number;
  longitude: number;
  label?: string;
};

export type MapProps = {
  markers?: MapMarker[];
  center?: { latitude: number; longitude: number };
  /** Optional zoom (web parity). Converted to a region delta; defaults to a
   *  Markaryd-wide view. */
  zoom?: number;
  onPick?: (latitude: number, longitude: number) => void;
  markerDraggable?: boolean;
  /** Imperative recenter — bump `token` to pan to the point (lat/lng alone won't
   *  trigger it, matching the web). */
  recenter?: { latitude: number; longitude: number; token: number };
  /** Disable pan/zoom/rotate for a static preview. Default true. */
  interactive?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Markaryd, Sweden — the club's home patch (web `MARKARYD`). */
const MARKARYD = { latitude: 56.46, longitude: 13.6 };
const DEFAULT_DELTA = 0.3; // ≈ web zoom 11 over the Markaryd area.

function regionFor(center: { latitude: number; longitude: number }, zoom?: number) {
  const delta = zoom ? 360 / 2 ** zoom : DEFAULT_DELTA;
  return { ...center, latitudeDelta: delta, longitudeDelta: delta };
}

export function Map({
  markers = [],
  center = MARKARYD,
  zoom,
  onPick,
  markerDraggable = false,
  recenter,
  interactive = true,
  height = 240,
  style,
}: MapProps) {
  const theme = useTheme();
  const ref = useRef<MapView>(null);

  // Imperative recenter, keyed on `token` so a stable parent doesn't re-pan on
  // every render — only an explicit bump moves the camera (web parity).
  useEffect(() => {
    if (!recenter) return;
    ref.current?.animateToRegion(
      regionFor({ latitude: recenter.latitude, longitude: recenter.longitude }, Math.max(zoom ?? 14, 14)),
      350,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenter?.token]);

  // Frame all markers once the map is laid out (only meaningful for 2+).
  function handleReady() {
    if (markers.length >= 2) {
      ref.current?.fitToCoordinates(
        markers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
        { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: false },
      );
    }
  }

  return (
    <MapView
      ref={ref}
      // Google tiles on Android (keyed via the config plugin); Apple Maps on iOS
      // (default provider) — iOS has no Google Maps SDK/key, so PROVIDER_GOOGLE
      // would render blank.
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      style={[{ height }, styles.map, style]}
      initialRegion={regionFor(center, zoom)}
      onMapReady={handleReady}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      onPress={onPick ? (e) => onPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude) : undefined}
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          title={m.label}
          pinColor={theme.tint}
          draggable={markerDraggable}
          onDragEnd={
            markerDraggable && onPick
              ? (e) => onPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
              : undefined
          }
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%' },
});
