import { useMutation } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { ConfirmSheet } from '@/components/confirm-sheet';
import { HeaderButton } from '@/components/header-button';
import { HeaderDismissButton } from '@/components/header-dismiss-button';
import { Screen } from '@/components/screen';
import {
  ObservationForm,
  formToInput,
  type ObservationFormHandle,
  type ObservationFormValue,
} from '@/components/observation-form';
import { showToast } from '@/components/toast';
import { useAuth } from '@/hooks/use-auth';
import { useDiscardGuard } from '@/hooks/use-discard-guard';
import { reverseGeocodePlaceName } from '@/hooks/use-reverse-geocode';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query/keys';
import { createObservation, type FeedObservation } from '@/lib/query/observations';
import { beginOptimistic, rollback } from '@/lib/query/optimistic';
import { type MyProfile } from '@/lib/query/profile';
import { requestBirdAlert } from '@/lib/query/push-tokens';
import { type Species } from '@/lib/query/species';

// Nytt larm — the create-observation compose modal, opened from the "Larma"
// button in the Larm tab header (a root-level `presentation: 'modal'` route, see
// the root `_layout`). Composes the M9 pickers + M10 image into the shared
// `ObservationForm` and inserts directly (M3 `createObservation`). The feed
// updates optimistically (`onMutate`) and dismisses after the insert commits; a
// failure rolls the row back while preserving the form for retry. As a modal it
// unmounts on dismiss, so there's no long-lived form to reset via a bumped key.
export default function NewObservationScreen() {
  const { user } = useAuth();
  const formRef = useRef<ObservationFormHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Tracks whether the form has unsaved input, so a swipe/Avbryt on a half-filled
  // report asks before throwing it away (Norman: forgiveness; the iOS "Discard
  // changes?" convention). While dirty, swipe-to-dismiss is disabled too, so the
  // guarded Avbryt is the only exit and no draft is lost silently.
  const [dirty, setDirty] = useState(false);

  const createMutation = useMutation({
    mutationFn: (value: ObservationFormValue) => createObservation(formToInput(value)),
    onMutate: async (value) => {
      const snapshots = await beginOptimistic([queryKeys.feed]);
      const optimistic = user ? buildOptimisticRow(value, user.id) : null;
      if (optimistic) {
        queryClient.setQueryData<FeedObservation[]>(queryKeys.feed, (prev) => [
          optimistic,
          ...(prev ?? []),
        ]);
      }
      return snapshots;
    },
    onSuccess: (newId, value) => {
      hapticSuccess();
      showToast(sv.observation.reported, 'success');
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      // The reporter's own member-profile feed embeds this row too — refresh it
      // so a previously-visited profile screen doesn't show stale data.
      if (user) void queryClient.invalidateQueries({ queryKey: queryKeys.member(user.id) });
      // Fan the new fynd out to other members' devices (M14). Fire-and-forget: a
      // non-alert report or an undeployed function must never block the create.
      // Pin-drop reports have no lokal row in the DB — resolve the same
      // reverse-geocoded label the feed shows so the notification names the place.
      if (value.alertRequested) {
        void (async () => {
          // Best-effort: a throttled/failed geocode must not stop the alert.
          const placeLabel =
            value.location.kind === 'coords'
              ? await reverseGeocodePlaceName(
                  value.location.latitude,
                  value.location.longitude,
                ).catch(() => null)
              : null;
          await requestBirdAlert(newId, placeLabel);
        })().catch(() => {});
      }
    },
    onError: (_err, _value, snapshots) => {
      rollback(snapshots);
      hapticError();
      showToast(sv.observation.saveFailed, 'error');
    },
  });

  // Never dismiss while the insert is in flight: doing so would unmount the
  // per-call success continuation and make a successful report look stuck. A
  // clean form closes immediately; a dirty one still gets the discard guard.
  const busy = createMutation.isPending;
  const { dismiss, gestureEnabled } = useDiscardGuard({ mode: 'create', dirty, busy });

  return (
    <>
      <Stack.Screen
        options={{
          // While the form is dirty, block the native swipe-to-dismiss so a draft
          // can't vanish with an accidental drag — the guarded Avbryt below is the
          // only way out, and it confirms.
          gestureEnabled,
          // Compose-modal chrome: dismiss (text "Avbryt" on iOS, ✕ on Android)
          // cancels, Larma submits (via the form's imperative handle). Both live
          // in the native bar, not the body.
          headerLeft: () => <HeaderDismissButton onPress={dismiss} disabled={busy} />,
          headerRight: () => (
            <HeaderButton
              title={sv.observation.submitNew}
              onPress={() => formRef.current?.submit()}
              loading={createMutation.isPending}
            />
          ),
        }}
      />
      <Screen ref={scrollRef} keyboardAware keyboardShouldPersistTaps="handled">
        <ObservationForm
          ref={formRef}
          mode="create"
          scrollRef={scrollRef}
          submitInHeader
          onDirtyChange={setDirty}
          onSubmit={(v) => {
            createMutation.mutate(v, { onSuccess: () => router.back() });
          }}
          submitting={createMutation.isPending}
        />
      </Screen>
      {/* Own confirm host: this route is a native-stack modal, so the root-mounted
          host's RN Modal would present BEHIND it (same reason as the edit modal). */}
      <ConfirmSheet />
    </>
  );
}

// Mirror of the web `buildOptimisticRow`: a placeholder feed row shown until the
// real insert + refetch lands. The species name/scientific come from the warm
// species cache; a temp id keeps it keyed (replaced on invalidation).
function buildOptimisticRow(value: ObservationFormValue, userId: string): FeedObservation | null {
  if (!value.speciesId) return null;
  const species = queryClient
    .getQueryData<Species[]>(queryKeys.species)
    ?.find((s) => s.id === value.speciesId);
  // Seed the reporter's own identity from the cached profile, so their fresh
  // observation shows *their* name + avatar immediately instead of flashing
  // "Okänd observatör" (with a "?" avatar) until the background refetch merges
  // the observer profile in — a flash that also persisted across a cold start
  // via the query persister.
  const me = queryClient.getQueryData<MyProfile>(queryKeys.profile(userId));
  const coords = value.location.kind === 'coords' ? value.location : null;
  return {
    id: `optimistic-${Date.now()}`,
    userId,
    observedAt: value.observedAt,
    count: value.count,
    comment: value.comment.trim() || null,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    createdAt: new Date(),
    speciesId: value.speciesId,
    speciesSwedishName: species?.swedishName ?? '…',
    speciesScientificName: species?.scientificName ?? '',
    speciesRarity: species?.rarity ?? null,
    locationId: value.location.kind === 'saved' ? value.location.id : null,
    locationName: value.location.kind === 'saved' ? value.location.name : null,
    locationLatitude: null,
    locationLongitude: null,
    observerDisplayName: me?.displayName ?? null,
    observerPhone: me?.phone ?? null,
    imagePath: value.imagePath,
    imageUrl: null,
    observerAvatarUrl: me?.avatarUrl ?? null,
    activity: value.activity,
  };
}
