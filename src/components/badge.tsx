/**
 * A small pill for compact metadata — observation count, activity, the "Min"
 * marker. Three tones: `neutral` (filled secondary), `primary` (filled brand, for
 * the own-observation marker), `outline` (hairline border, for the activity
 * label). Shared by the feed card and the observation detail screen so the pill
 * geometry lives in exactly one place. Display-only — never wrap it in a press
 * target.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'primary' | 'outline';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();

  if (tone === 'outline') {
    return (
      <View style={[styles.pill, styles.outline, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="mutedForeground">
          {label}
        </ThemedText>
      </View>
    );
  }

  const primary = tone === 'primary';
  return (
    <View style={[styles.pill, { backgroundColor: primary ? theme.primary : theme.secondary }]}>
      <ThemedText type="small" themeColor={primary ? 'badgeForeground' : 'secondaryForeground'}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    // Tight internal padding so the pill hugs its label (vertical is already at
    // the 2px floor); the pill radius keeps it reading as a badge, not a box.
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: SurfaceRadius.pill,
  },
  outline: { borderWidth: StyleSheet.hairlineWidth },
});
