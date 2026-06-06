import { StyleSheet } from 'react-native';

import { SurfaceStyles } from '@/constants/surface';
import { Spacing } from '@/constants/theme';

export const sharedStyles = StyleSheet.create({
  flex: { flex: 1 },
  empty: {
    ...SurfaceStyles.raisedCard,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'flex-start' as const,
  },
  /** Shared contentContainerStyle for tab-root screens (16px horizontal). */
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  /** Shared contentContainerStyle for sub-screens (24px horizontal). */
  scrollContentInset: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
});
