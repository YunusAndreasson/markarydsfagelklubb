import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { ImageUpload } from '@/components/image-upload';
import { LocationPermissionSection } from '@/components/location-permission-section';
import { NotificationPermissionSection } from '@/components/notification-permission-section';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
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

// Profil — the user's own profile + settings screen (native port of the web's
// /profile). Editable name/phone + avatar upload, read-only email + admin badge,
// the theme picker, the location (M8) and push (M14) permission sections, and
// sign-out. The tab nests a native Stack (see `profile/_layout.tsx`), so "Profil"
// is the native header title and the admin badge rides in `headerRight`.
export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut, user } = useAuth();
  const { data: profile } = useQuery(myProfileQueryOptions());

  const [name, setName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarPath, setAvatarPath] = useState(profile?.avatarPath ?? null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Fields initialize from the profile, which is cache-warm: the root gate only
  // mounts `(tabs)` once `hasProfile` is true, so `useQuery` returns the row
  // synchronously here and `useState` captures it on the first render. After a
  // save, `onSuccess` re-syncs the fields to the canonical server values.
  const mutation = useMutation({
    mutationFn: (input: { displayName: string; phone: string | null; avatarPath: string | null }) =>
      upsertMyProfile(input),
    onSuccess: (result) => {
      // Seed the shared profile query so the gate / other readers see the update
      // without a refetch, then sync the fields to the canonical server values.
      queryClient.setQueryData(queryKeys.profile, result);
      setName(result.displayName);
      setPhone(result.phone ?? '');
      setAvatarPath(result.avatarPath);
      hapticSuccess();
      showToast(sv.profile.saved, 'success');
      // The feed embeds the observer's display name — refresh it (no-op until M11).
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
    onError: () => {
      hapticError();
      showToast(sv.profile.saveFailed, 'error');
    },
  });

  function onSave() {
    const parsedName = displayNameSchema.safeParse(name);
    if (!parsedName.success) {
      // TextField buzzes itself on the error transition — don't double-fire.
      setNameError(parsedName.error.issues[0]?.message ?? sv.profile.saveFailed);
      return;
    }
    setNameError(null);

    const trimmedPhone = phone.trim();
    let nextPhone: string | null = null;
    if (trimmedPhone.length > 0) {
      const parsedPhone = phoneSchema.safeParse(trimmedPhone);
      if (!parsedPhone.success) {
        setPhoneError(parsedPhone.error.issues[0]?.message ?? sv.profile.phoneInvalid);
        return;
      }
      nextPhone = parsedPhone.data;
    }
    setPhoneError(null);
    // Persist the staged avatar alongside name/phone — `upsertMyProfile` writes
    // `avatarPath` unconditionally, so the picked image (already uploaded) lands on
    // the row here (M10).
    mutation.mutate({
      displayName: parsedName.data,
      phone: nextPhone,
      avatarPath,
    });
  }

  function onChangeName(next: string) {
    setName(next);
    setNameError(null);
  }

  function onChangePhone(next: string) {
    setPhone(next);
    setPhoneError(null);
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

      <View style={styles.form}>
        <ImageUpload
          value={avatarPath}
          previewUrl={profile?.avatarUrl ?? null}
          onChange={setAvatarPath}
          purpose="avatar"
          shape="square"
          disabled={mutation.isPending}
        />

        <TextField
          label={sv.profile.nameLabel}
          value={name}
          onChangeText={onChangeName}
          placeholder={sv.profile.namePlaceholder}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={60}
          editable={!mutation.isPending}
          returnKeyType="done"
          error={nameError}
        />

        <View style={styles.field}>
          <TextField
            label={sv.profile.phoneLabel}
            value={phone}
            onChangeText={onChangePhone}
            placeholder={sv.profile.phonePlaceholder}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={30}
            editable={!mutation.isPending}
            error={phoneError}
          />
          <ThemedText type="small" themeColor="mutedForeground">
            {sv.profile.phoneOptional} · {sv.profile.phoneHelp}
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="mutedForeground">
            {sv.profile.emailLabel}
          </ThemedText>
          <ThemedText type="default">{user?.email ?? '—'}</ThemedText>
        </View>

        <Button
          title={mutation.isPending ? sv.profile.saving : sv.profile.save}
          onPress={onSave}
          loading={mutation.isPending}
          haptic="commit"
        />
      </View>

      <ThemePicker />

      {/* Real permission UX for the device features the app uses
          (M8 location · M14 push). */}
      <LocationPermissionSection />
      <NotificationPermissionSection />

      {/* Utloggning är ofarligt och fullt återställbart — därför lugn `secondary`,
          inte röd `destructive` (som vi sparar till oåterkalleliga handlingar). */}
      <Button
        title={sv.profile.signOut}
        variant="secondary"
        haptic="commit"
        onPress={() => void signOut()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: SurfaceRadius.pill,
  },
  // Major groups (identity form · appearance · location · notifications · sign
  // out) need clear separation so the screen reads as distinct settings groups
  // rather than one dense list. The form's own fields stay tighter (form.gap).
  content: { gap: Spacing.five },
  form: { gap: Spacing.three },
  field: { gap: Spacing.one },
});
