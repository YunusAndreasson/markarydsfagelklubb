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
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { Elevation } from '@/constants/theme';
import { elevationStyle } from '@/constants/surface';
import { useTheme } from '@/hooks/use-theme';

export type MapMarker = {
  id: string | number;
  latitude: number;
  longitude: number;
  label?: string;
  /** Per-marker pin colour. Defaults to the brand tint when omitted. */
  tint?: string;
};

export type MapProps = {
  markers?: MapMarker[];
  center?: { latitude: number; longitude: number };
  /** Optional zoom (web parity). Converted to a region delta; defaults to a
   *  Markaryd-wide view. */
  zoom?: number;
  onPick?: (latitude: number, longitude: number) => void;
  /** Tap a specific pin (by its `id`). Distinct from `onPick`, which is a
   *  map-level tap used to set a point. */
  onMarkerPress?: (id: MapMarker['id']) => void;
  markerDraggable?: boolean;
  /** Imperative recenter — bump `token` to pan to the point (lat/lng alone won't
   *  trigger it, matching the web). */
  recenter?: { latitude: number; longitude: number; token: number };
  /** Imperative fit-to-bounds — bump this number to reframe all `markers` in view
   *  (the Lokaler "visa alla" control). No-op with fewer than 2 markers. */
  fitToken?: number;
  /** Disable pan/zoom/rotate for a static preview. Default true. */
  interactive?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Markaryd, Sweden — the club's home patch (web `MARKARYD`). */
const MARKARYD = { latitude: 56.46, longitude: 13.6 };
const DEFAULT_DELTA = 0.3; // ≈ web zoom 11 over the Markaryd area.

/** A dot marker's centre IS its coordinate (unlike a teardrop, whose tip is). */
const CENTER_ANCHOR = { x: 0.5, y: 0.5 } as const;
/** Visible disc; the transparent box around it is what makes the pin tappable. */
const DOT_SIZE = 16;
const DOT_HIT = 36;

function regionFor(center: { latitude: number; longitude: number }, zoom?: number) {
  const delta = zoom ? 360 / 2 ** zoom : DEFAULT_DELTA;
  return { ...center, latitudeDelta: delta, longitudeDelta: delta };
}

/**
 * A pin that draws its own coloured disc instead of using `pinColor`.
 *
 * `tracksViewChanges` has to start true or the custom view can rasterize blank
 * on Android, but leaving it on re-rasterizes every frame — a real cost at ~60
 * pins. So each marker switches itself off once it has laid out. `onLayout` is
 * an event handler, so this needs no effect (and doesn't trip the Compiler's
 * set-state-in-effect rule). Colour changes remount via the parent's key.
 */
function DotMarker({
  marker,
  tint,
  ring,
  onPress,
}: {
  marker: MapMarker;
  tint: string;
  ring: string;
  onPress?: (id: MapMarker['id']) => void;
}) {
  const [tracks, setTracks] = useState(true);
  return (
    <Marker
      coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
      title={marker.label}
      anchor={CENTER_ANCHOR}
      tracksViewChanges={tracks}
      onPress={onPress ? () => onPress(marker.id) : undefined}
    >
      {/* Transparent box = the touch target; the disc is what you see. */}
      <View
        style={styles.dotHit}
        onLayout={() => {
          if (tracks) setTracks(false);
        }}
      >
        <View style={[styles.dot, { backgroundColor: tint, borderColor: ring }]} />
      </View>
    </Marker>
  );
}

export function Map({
  markers = [],
  center = MARKARYD,
  zoom,
  onPick,
  onMarkerPress,
  markerDraggable = false,
  recenter,
  fitToken,
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

  // Frame all markers (only meaningful for 2+). `animated` off for the initial
  // layout fit, on for an explicit "visa alla" tap so the reframe reads as motion.
  function fitAll(animated: boolean) {
    if (markers.length < 2) return;
    ref.current?.fitToCoordinates(
      markers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
      { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated },
    );
  }

  function handleReady() {
    fitAll(false);
  }

  // Imperative fit-to-bounds, keyed on `fitToken` so only an explicit bump
  // reframes (same pattern as `recenter`).
  useEffect(() => {
    if (!fitToken) return;
    fitAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

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
      // Google's own map toolbar ("Get directions" / "Open in Google Maps") pops
      // up over our UI whenever a marker is selected, and both buttons leave the
      // app. Not part of the design — off.
      toolbarEnabled={false}
      onPress={onPick ? (e) => onPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude) : undefined}
    >
      {markers.map((m) =>
        // A `tint`ed marker draws its OWN dot instead of using `pinColor`.
        // Android reduces `pinColor` to one of Google's fixed marker HUES, so a
        // neutral grey (`mutedForeground` #737373, saturation 0) collapsed to
        // hue 0 = HUE_RED: every quiet lokal rendered as a loud red pin, exactly
        // inverting the legend it was supposed to match. A child view renders the
        // real colour identically on both platforms — and matches `ActivityDot`,
        // which the legend and the peek sheet already use.
        m.tint ? (
          // Keyed on the tint too, so a lokal flipping active↔quiet REMOUNTS the
          // marker and re-rasterizes at the new colour (see DotMarker).
          <DotMarker
            key={`${m.id}-${m.tint}`}
            marker={m}
            tint={m.tint}
            ring={theme.card}
            onPress={onMarkerPress}
          />
        ) : (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.label}
            pinColor={theme.tint}
            draggable={markerDraggable}
            onPress={onMarkerPress ? () => onMarkerPress(m.id) : undefined}
            onDragEnd={
              markerDraggable && onPick
                ? (e) => onPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
                : undefined
            }
          />
        ),
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%' },
  dotHit: { width: DOT_HIT, height: DOT_HIT, alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    // A card-coloured ring keeps the disc legible against both the green land
    // and the blue water of the base map.
    borderWidth: 2,
    ...elevationStyle(Elevation.raised),
  },
});
