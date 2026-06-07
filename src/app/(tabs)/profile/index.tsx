import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Icon, SIGN_OUT, type IconName } from '@/components/icon';
import { ImageUpload } from '@/components/image-upload';
import { LocationPermissionSection } from '@/components/location-permission-section';
import { NotificationPermissionSection } from '@/components/notification-permission-section';
import { Screen } from '@/components/screen';
import { SettingsFormInput } from '@/components/settings/settings-form-input';
import { SettingsGroup } from '@/components/settings/settings-group';
import { SettingsRow } from '@/components/settings/settings-row';
import { ThemePicker } from '@/components/theme-picker';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query/keys';
import { myProfileQueryOptions, upsertMyProfile } from '@/lib/query/profile';
import { displayNameSchema, phoneSchema } from '@/lib/validation/profile';

const ADMIN_BADGE: IconName = { sf: 'checkmark.shield.fill', material: 'verified-user' };

type Persisted = { displayName: string; phone: string | null; avatarPath: string | null };

// Profil — the user's own profile + settings, restyled to the app's grouped-
// settings grammar (avatar hero + bordered SettingsGroup cards of rows). Name /
// phone / avatar **autosave** on commit (field blur or avatar pick) — there is no
// standalone Save button: the screen reads as settings, not a form. Read-only
// email + admin badge, appearance, the device-permission rows (M8 location · M14
// push), and sign-out round it out. The tab nests a native Stack
// (`profile/_layout.tsx`), so "Profil" is the native header title.
export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut, user } = useAuth();
  const { data: profile } = useQuery(myProfileQueryOptions());

  const [name, setName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarPath, setAvatarPath] = useState(profile?.avatarPath ?? null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // The last values known to be persisted. Each autosave sends the changed field
  // plus this snapshot for its siblings — so committing one field never writes a
  // half-edited (or invalid) value from another, and concurrent saves can't
  // clobber an in-progress edit. Seeded from the cache-warm profile (the root
  // gate only mounts `(tabs)` once `hasProfile` is true).
  const [saved, setSaved] = useState<Persisted>({
    displayName: profile?.displayName ?? '',
    phone: profile?.phone ?? null,
    avatarPath: profile?.avatarPath ?? null,
  });

  const mutation = useMutation({
    mutationFn: (input: Persisted) => upsertMyProfile(input),
    onSuccess: (result) => {
      // Seed the shared profile query so the gate / other readers see the update
      // without a refetch, and advance the persisted snapshot. The editable
      // fields are intentionally NOT overwritten here — they already hold the
      // user's input, and rewriting them would clobber a parallel edit.
      queryClient.setQueryData(queryKeys.profile, result);
      setSaved({
        displayName: result.displayName,
        phone: result.phone ?? null,
        avatarPath: result.avatarPath,
      });
      hapticSuccess();
      showToast(sv.profile.saved, 'success');
      // The feed embeds the observer's display name — refresh it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
    onError: () => {
      hapticError();
      showToast(sv.profile.saveFailed, 'error');
    },
  });

  function commitName() {
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      hapticError();
      setNameError(parsed.error.issues[0]?.message ?? sv.profile.saveFailed);
      return;
    }
    setNameError(null);
    if (parsed.data !== saved.displayName) {
      mutation.mutate({ displayName: parsed.data, phone: saved.phone, avatarPath: saved.avatarPath });
    }
  }

  function commitPhone() {
    const trimmed = phone.trim();
    let next: string | null = null;
    if (trimmed.length > 0) {
      const parsed = phoneSchema.safeParse(trimmed);
      if (!parsed.success) {
        hapticError();
        setPhoneError(parsed.error.issues[0]?.message ?? sv.profile.phoneInvalid);
        return;
      }
      next = parsed.data;
    }
    setPhoneError(null);
    if (next !== saved.phone) {
      mutation.mutate({ displayName: saved.displayName, phone: next, avatarPath: saved.avatarPath });
    }
  }

  function onChangeAvatar(path: string | null) {
    setAvatarPath(path);
    if (path !== saved.avatarPath) {
      mutation.mutate({ displayName: saved.displayName, phone: saved.phone, avatarPath: path });
    }
  }

  function confirmSignOut() {
    Alert.alert(sv.profile.signOutConfirmTitle, sv.profile.signOutConfirmMessage, [
      { text: sv.common.cancel, style: 'cancel' },
      { text: sv.profile.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <Screen keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {profile?.isAdmin ? (
        <Stack.Screen
          options={{
            headerRight: () => (
              <View style={[styles.badge, { backgroundColor: theme.secondary }]}>
                <Icon name={ADMIN_BADGE} size={13} color={theme.mutedForeground} />
                <ThemedText type="micro" themeColor="mutedForeground">
                  {sv.profile.adminBadge}
                </ThemedText>
              </View>
            ),
          }}
        />
      ) : null}

      <View style={styles.hero}>
        <ImageUpload
          value={avatarPath}
          previewUrl={profile?.avatarUrl ?? null}
          onChange={onChangeAvatar}
          purpose="avatar"
          shape="square"
        />
        <View style={styles.heroText}>
          <ThemedText type="title" numberOfLines={1}>
            {name.trim() || saved.displayName || '—'}
          </ThemedText>
          <ThemedText type="small" themeColor="mutedForeground" numberOfLines={1}>
            {user?.email ?? sv.profile.changePhoto}
          </ThemedText>
        </View>
      </View>

      <SettingsGroup title={sv.profile.detailsSection} footer={sv.profile.phoneHelp}>
        <SettingsFormInput
          label={sv.profile.nameLabel}
          value={name}
          onChangeText={(next) => {
            setName(next);
            setNameError(null);
          }}
          onEndEditing={commitName}
          error={nameError}
          placeholder={sv.profile.namePlaceholder}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={60}
          returnKeyType="done"
        />
        <SettingsFormInput
          label={sv.profile.phoneLabel}
          value={phone}
          onChangeText={(next) => {
            setPhone(next);
            setPhoneError(null);
          }}
          onEndEditing={commitPhone}
          error={phoneError}
          placeholder={sv.profile.phonePlaceholder}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={30}
          returnKeyType="done"
        />
      </SettingsGroup>

      <ThemePicker />

      <SettingsGroup title={sv.profile.deviceSection} footer={sv.profile.deviceFooter}>
        <NotificationPermissionSection />
        <LocationPermissionSection />
      </SettingsGroup>

      <SettingsGroup title={sv.profile.accountSection}>
        <SettingsRow
          icon={SIGN_OUT}
          label={sv.profile.signOut}
          accessory="chevron"
          onPress={confirmSignOut}
        />
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Generous rhythm between the hero and each settings group so the screen reads
  // as distinct sections, not one dense list.
  content: { gap: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  heroText: { alignItems: 'center', gap: Spacing.half },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: SurfaceRadius.pill,
  },
});
