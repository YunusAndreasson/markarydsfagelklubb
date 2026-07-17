import { useMutation } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { HeaderButton } from '@/components/header-button';
import { Screen } from '@/components/screen';
import {
  ObservationForm,
  formToInput,
  type ObservationFormHandle,
  type ObservationFormValue,
} from '@/components/observation-form';
import { showToast } from '@/components/toast';
import { useAuth } from '@/hooks/use-auth';
import { reverseGeocodePlaceName } from '@/hooks/use-reverse-geocode';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query/keys';
import { createObservation, type FeedObservation } from '@/lib/query/observations';
import { requestBirdAlert } from '@/lib/query/push-tokens';
import { type Species } from '@/lib/query/species';

// Larm — the center "new observation" tab. Composes the M9 pickers + M10
// image into the shared `ObservationForm` and inserts directly (M3
// `createObservation`). The feed updates optimistically and we jump to Obsar
// immediately; a failure rolls the row back with a `hapticError` (no toast
// primitive — web parity minus sonner). The tab stays mounted, so the form is
// reset by remounting via a bumped `key`.
export default function NewObservationScreen() {
  const { user } = useAuth();
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<ObservationFormHandle>(null);
  const scrollRef = useRef<ScrollView>(null);

  const createMutation = useMutation({
    mutationFn: (value: ObservationFormValue) => createObservation(formToInput(value)),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });
      const previous = queryClient.getQueryData<FeedObservation[]>(queryKeys.feed);
      const optimistic = user ? buildOptimisticRow(value, user.id) : null;
      if (optimistic) {
        queryClient.setQueryData<FeedObservation[]>(queryKeys.feed, (prev) => [
          optimistic,
          ...(prev ?? []),
        ]);
      }
      return { previous };
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
    onError: (_err, _value, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.feed, context.previous);
      hapticError();
      showToast(sv.observation.saveFailed, 'error');
    },
  });

  return (
    <>
      <Stack.Screen
        options={{
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
          key={formKey}
          ref={formRef}
          mode="create"
          scrollRef={scrollRef}
          submitInHeader
          onSubmit={(v) => {
            createMutation.mutate(v);
            setFormKey((k) => k + 1);
            router.navigate('/');
          }}
          submitting={createMutation.isPending}
        />
      </Screen>
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
    observerDisplayName: null,
    observerPhone: null,
    imagePath: value.imagePath,
    imageUrl: null,
    observerAvatarUrl: null,
    activity: value.activity,
  };
}
