/**
 * Read-only map for an observation's coordinates — the native port of the web's
 * `observation-map.tsx`. An inline, non-interactive preview with a single pin;
 * tapping it opens a fullscreen modal (matching the web Dialog) with a tighter
 * zoom, an optional label badge, and a close button. Used by the M11 feed cards
 * and the M12 detail screen.
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpandBadge, FloatingIconButton } from '@/components/floating-control';
import { CLOSE, EXPAND } from '@/components/icon';
import { Map } from '@/components/map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius, SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

export type ObservationMapProps = {
  latitude: number;
  longitude: number;
  label?: string;
  height?: number;
};

export function ObservationMap({ latitude, longitude, label, height = 160 }: ObservationMapProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const markers = [{ id: 'obs', latitude, longitude, label }];

  return (
    <View>
      <View style={[styles.preview, { height, borderColor: theme.border }]}>
        <Map markers={markers} center={{ latitude, longitude }} zoom={14} height={height} interactive={false} />
        {/* The map view captures touches, so a transparent overlay owns the
            expand tap (the preview is non-interactive anyway). */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={sv.observation.mapExpand}
        />
        <ExpandBadge icon={EXPAND} />
      </View>

      <Modal
        visible={expanded}
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
        statusBarTranslucent
      >
        <ThemedView style={styles.full}>
          <Map markers={markers} center={{ latitude, longitude }} zoom={15} style={styles.fullMap} />
          {label ? (
            <View style={[styles.labelBadge, { top: insets.top + Spacing.two, backgroundColor: theme.card, borderColor: theme.border }]}>
              <ThemedText type="smallBold">{label}</ThemedText>
            </View>
          ) : null}
          <FloatingIconButton
            icon={CLOSE}
            accessibilityLabel={sv.observation.mapClose}
            onPress={() => setExpanded(false)}
            style={[styles.close, { top: insets.top + Spacing.two }]}
          />
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: SurfaceStyles.clippedCard,
  full: { flex: 1 },
  // Override the Map's default fixed height so it fills the flex parent.
  fullMap: { flex: 1, height: '100%' },
  labelBadge: {
    position: 'absolute',
    left: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: SurfaceRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  close: { right: Spacing.three },
});
