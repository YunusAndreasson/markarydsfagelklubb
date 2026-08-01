/**
 * A lokal's recent-activity signifier: a brand-green dot when the site has been
 * reported from inside the 14-day window, a muted one when it's been quiet, plus
 * the matching one-liner. The same pairing appears on the Lokaler map (search
 * results + legend) and in the lokal peek sheet, and the two had to agree — the
 * dot colour is the map's pin colour, so a mismatch would make the sheet
 * contradict the pin the user just tapped.
 *
 * `dotOnly` renders the disc alone, for the map legend where the label is its own
 * text run.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

/** Diameter of the activity disc — matches the map legend's swatch. */
export const ACTIVITY_DOT_SIZE = 10;

export function ActivityDot({ active }: { active: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.dot, { backgroundColor: active ? theme.tint : theme.mutedForeground }]} />
  );
}

export function LocationActivity({ count }: { count: number }) {
  const active = count > 0;
  return (
    <View style={styles.row}>
      <ActivityDot active={active} />
      <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1} style={styles.label}>
        {active ? sv.locations.activityRecent(count) : sv.locations.activityNone}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: ACTIVITY_DOT_SIZE, height: ACTIVITY_DOT_SIZE, borderRadius: ACTIVITY_DOT_SIZE / 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { flex: 1 },
});
