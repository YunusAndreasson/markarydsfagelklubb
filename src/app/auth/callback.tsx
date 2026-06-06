import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ALERT } from '@/components/icon';
import { StateBlock } from '@/components/state-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';

/**
 * Lands the `mafk://auth/callback?code=…` magic link: redeems the PKCE code for
 * a session. On success the auth listener flips the session and the root gate
 * routes us in (this screen unmounts), so there's nothing to navigate here.
 */
export default function AuthCallbackScreen() {
  const theme = useTheme();
  const { exchangeMagicLinkCode } = useAuth();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const handledRef = useRef(false);

  const code = typeof params.code === 'string' ? params.code : undefined;
  // A provider error comes straight off the URL — derive it at render rather than
  // routing it through an effect's setState.
  const urlError = typeof params.error === 'string' && params.error.length > 0;

  useEffect(() => {
    if (handledRef.current || !code) return; // wait for the deep-link code to arrive
    handledRef.current = true;
    void (async () => {
      const res = await exchangeMagicLinkCode(code);
      if (res.error) setExchangeError(res.error);
    })();
  }, [code, exchangeMagicLinkCode]);

  const error = urlError ? sv.login.errors.callbackFailed : exchangeError;

  return (
    <ThemedView style={sharedStyles.flex}>
      <SafeAreaView style={styles.center}>
        {error ? (
          <StateBlock
            icon={ALERT}
            tone="error"
            title={sv.login.tryAgain}
            message={error}
            action={{ label: sv.nav.logIn, onPress: () => router.replace('/sign-in') }}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="mutedForeground">
              {sv.login.verifying}
            </ThemedText>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four },
  loading: { alignItems: 'center', gap: Spacing.two },
});
