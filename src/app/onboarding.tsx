import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import {
  peekPendingDisplayName,
  takePendingDisplayName,
} from '@/lib/auth/pending-display-name';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query/keys';
import { upsertMyProfile } from '@/lib/query/profile';
import { displayNameSchema } from '@/lib/validation/profile';

/**
 * First-run onboarding: confirm/capture the display name. "Needs onboarding" =
 * no `profiles` row exists (the root gate's profile query is null) — exactly the
 * web's rule. Name-only; avatar/phone live in the profile screen (M7/M10).
 *
 * When a social provider (Apple / Google) supplied the user's name at sign-in we
 * PRE-FILL the field with it — App Store Guideline 4 forbids re-asking for a name
 * the Authentication Services framework already provided, so the user only
 * confirms (or tweaks) it rather than re-typing. Magic-link sign-in carries no
 * name, so the field simply starts empty.
 */
export default function OnboardingScreen() {
  // Pre-fill from the provider-supplied name (peek is a pure read, safe under
  // React Strict Mode's double-invoked initializer). The effect below consumes it.
  const [name, setName] = useState(() => peekPendingDisplayName() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Consume the stashed name so it can't pre-fill a later, unrelated onboarding
  // (e.g. after sign-out + magic-link sign-in on the same device).
  useEffect(() => {
    takePendingDisplayName();
  }, []);

  async function onSave() {
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      hapticError();
      setError(parsed.error.issues[0]?.message ?? sv.onboarding.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const profile = await upsertMyProfile({ displayName: parsed.data });
      // Seed the gate's profile query so it re-routes to the app immediately,
      // without waiting on a refetch.
      queryClient.setQueryData(queryKeys.profile, profile);
      hapticSuccess();
    } catch {
      hapticError();
      setError(sv.onboarding.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={sharedStyles.flex}>
      <SafeAreaView style={sharedStyles.flex}>
        <KeyboardAvoidingView
          style={sharedStyles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <View style={styles.heading}>
              <ThemedText type="display">{sv.onboarding.title}</ThemedText>
              <ThemedText type="small" themeColor="mutedForeground">
                {sv.onboarding.description}
              </ThemedText>
            </View>
            <View style={styles.form}>
              <TextField
                label={sv.onboarding.nameLabel}
                value={name}
                onChangeText={setName}
                placeholder={sv.onboarding.namePlaceholder}
                autoCapitalize="words"
                autoComplete="name"
                maxLength={60}
                autoFocus
                editable={!saving}
                returnKeyType="go"
                onSubmitEditing={onSave}
                error={error}
              />
              <Button
                title={saving ? sv.onboarding.saving : sv.onboarding.save}
                onPress={onSave}
                loading={saving}
              />
            </View>
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
});
