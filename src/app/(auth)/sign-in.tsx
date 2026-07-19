import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PressableScale } from '@/components/pressable-scale';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/constants/legal';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

type Pending = 'apple' | 'google' | 'email' | null;
type Mode = 'social' | 'email';

export default function SignInScreen() {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const { signInWithApple, signInWithGoogle, sendMagicLink } = useAuth();

  const [mode, setMode] = useState<Mode>('social');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Apple sign-in exists only on iOS (and only on supported versions). Hide the
  // button otherwise. Provisioned later; untestable on the Android dev box.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // Apple/Google both flip the session on success → the root gate swaps to
  // onboarding/home with no manual navigation. We only handle the failure paths.
  async function runProvider(provider: 'apple' | 'google') {
    setError(null);
    setPending(provider);
    const res = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    setPending(null);
    if (res.cancelled) return;
    if (res.error) {
      hapticError();
      setError(res.error);
    }
  }

  async function onSendLink() {
    setError(null);
    setPending('email');
    const res = await sendMagicLink(email);
    setPending(null);
    if (res.error) {
      hapticError();
      setError(res.error);
      return;
    }
    hapticSuccess();
    setSentTo(email.trim());
  }

  function resetEmail() {
    setSentTo(null);
    setEmail('');
    setError(null);
  }

  // "Check your inbox" screens conventionally offer a jump straight to the mail
  // app (Jakob's Law). `message://` opens Mail on iOS; Android has no universal
  // inbox scheme, so the button is shown on iOS only. Best-effort — a missing
  // Mail app just no-ops, the on-screen instructions still stand.
  function openMail() {
    void Linking.openURL('message://').catch(() => {});
  }

  const busy = pending !== null;

  return (
    <ThemedView style={sharedStyles.flex}>
      <SafeAreaView style={sharedStyles.flex}>
        <KeyboardAvoidingView
          style={sharedStyles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <View style={styles.heading}>
              <ThemedText type="display">{sv.home.title}</ThemedText>
              <ThemedText type="small" themeColor="mutedForeground">
                {sv.home.subtitle}
              </ThemedText>
            </View>

            {sentTo ? (
              // Magic-link sent — "check your inbox".
              <View style={styles.form}>
                <View style={styles.heading}>
                  <ThemedText type="heading">{sv.login.sentTitle}</ThemedText>
                  <ThemedText type="small" themeColor="mutedForeground">
                    {sv.login.sentTo(sentTo)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="mutedForeground">
                    {sv.login.sentHelp}
                  </ThemedText>
                  <ThemedText type="small" themeColor="mutedForeground">
                    {sv.login.sentSpamHint}
                  </ThemedText>
                </View>
                {Platform.OS === 'ios' ? (
                  <Button title={sv.login.openMail} onPress={openMail} />
                ) : null}
                <Button
                  title={sv.login.useDifferentEmail}
                  variant="secondary"
                  onPress={resetEmail}
                />
              </View>
            ) : mode === 'email' ? (
              // Secondary path: email magic-link.
              <View style={styles.form}>
                <TextField
                  label={sv.login.emailLabel}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={sv.login.emailPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoFocus
                  editable={!busy}
                  returnKeyType="go"
                  onSubmitEditing={onSendLink}
                  error={error}
                />
                <Button
                  title={pending === 'email' ? sv.login.sending : sv.login.sendLink}
                  onPress={onSendLink}
                  loading={pending === 'email'}
                />
                <PressableScale
                  variant="link"
                  onPress={() => {
                    setMode('social');
                    setError(null);
                  }}
                  disabled={busy}
                  style={styles.linkRow}
                >
                  <ThemedText type="small" themeColor="mutedForeground">
                    {sv.errors.goBack}
                  </ThemedText>
                </PressableScale>
              </View>
            ) : (
              // Primary path: native social sign-in.
              <View style={styles.form}>
                {appleAvailable ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={
                      colorScheme === 'dark'
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={SurfaceRadius.sm}
                    style={styles.appleButton}
                    onPress={() => void runProvider('apple')}
                  />
                ) : null}

                <Button
                  title={sv.login.continueWithGoogle}
                  variant="secondary"
                  loading={pending === 'google'}
                  disabled={busy}
                  onPress={() => void runProvider('google')}
                />

                {error ? (
                  <ThemedText type="small" themeColor="destructive" style={styles.centerText}>
                    {error}
                  </ThemedText>
                ) : null}

                <View style={styles.divider}>
                  <View style={[styles.rule, { backgroundColor: theme.border }]} />
                  <ThemedText type="small" themeColor="mutedForeground">
                    {sv.login.or}
                  </ThemedText>
                  <View style={[styles.rule, { backgroundColor: theme.border }]} />
                </View>

                <PressableScale
                  variant="link"
                  onPress={() => {
                    setMode('email');
                    setError(null);
                  }}
                  disabled={busy}
                  style={styles.linkRow}
                >
                  <ThemedText type="smallBold" themeColor="primary">
                    {sv.login.withEmail}
                  </ThemedText>
                </PressableScale>
              </View>
            )}

            {/* Standard terms/privacy consent line (Apple requires an agreement for
                apps with user-generated content). Small + muted; links open in the
                browser. Shown in every mode so it's always present at sign-in. */}
            <ThemedText type="small" themeColor="mutedForeground" style={styles.legal}>
              {sv.login.legalPrefix}
              <ThemedText
                type="small"
                themeColor="tint"
                onPress={() => void Linking.openURL(TERMS_URL)}
              >
                {sv.login.legalTerms}
              </ThemedText>
              {sv.login.legalAnd}
              <ThemedText
                type="small"
                themeColor="tint"
                onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
              >
                {sv.login.legalPrivacy}
              </ThemedText>
              {sv.login.legalSuffix}
            </ThemedText>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  heading: { gap: Spacing.one },
  form: { gap: Spacing.three },
  appleButton: { height: 52 },
  centerText: { textAlign: 'center' },
  legal: { textAlign: 'center', paddingHorizontal: Spacing.two },
  linkRow: { alignItems: 'center', paddingVertical: Spacing.two },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
