/**
 * The one empty / error block. Replaces scattered bare-sentence and raw
 * `error.message` one-offs with a single card: an optional icon, a title, an
 * optional message, and an optional action button. `tone="error"` tints the
 * title + icon with the destructive color and fires `hapticError` once on mount,
 * so a failed load is *felt*, not just read. Left-aligned to sit inside the same
 * `sharedStyles.empty` card the screens already use.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { sharedStyles } from '@/constants/shared-styles';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticError } from '@/lib/haptics';

export type StateBlockProps = {
  icon?: IconName;
  title: string;
  message?: string;
  tone?: 'muted' | 'error';
  action?: { label: string; onPress: () => void; loading?: boolean };
};

export function StateBlock({ icon, title, message, tone = 'muted', action }: StateBlockProps) {
  const theme = useTheme();

  useEffect(() => {
    if (tone === 'error') hapticError();
  }, [tone]);

  return (
    <View style={[sharedStyles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {icon ? (
        <Icon
          name={icon}
          size={26}
          color={tone === 'error' ? theme.destructive : theme.mutedForeground}
        />
      ) : null}
      <View style={styles.text}>
        <ThemedText type="default" themeColor={tone === 'error' ? 'destructive' : 'foreground'}>
          {title}
        </ThemedText>
        {message ? (
          <ThemedText type="small" themeColor="mutedForeground">
            {message}
          </ThemedText>
        ) : null}
      </View>
      {action ? (
        <Button
          title={action.label}
          variant="secondary"
          onPress={action.onPress}
          loading={action.loading}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { gap: Spacing.half },
});
