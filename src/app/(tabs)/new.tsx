import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import {
  ObservationForm,
  formToInput,
  type ObservationFormValue,
} from '@/components/observation-form';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query/keys';
import { createObservation, type FeedObservation } from '@/lib/query/observations';
import { requestBirdAlert } from '@/lib/query/push-tokens';
import { type Species } from '@/lib/query/species';

// Rapportera — the center "new observation" tab. Composes the M9 pickers + M10
// image into the shared `ObservationForm` and inserts directly (M3
// `createObservation`). The feed updates optimistically and we jump to Flöde
// immediately; a failure rolls the row back with a `hapticError` (no toast
// primitive — web parity minus sonner). The tab stays mounted, so the form is
// reset by remounting via a bumped `key`.
export default function NewObservationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [formKey, setFormKey] = useState(0);

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      // The reporter's own member-profile feed embeds this row too — refresh it
      // so a previously-visited profile screen doesn't show stale data.
      if (user) void queryClient.invalidateQueries({ queryKey: queryKeys.member(user.id) });
      // Fan the new fynd out to other members' devices (M14). Fire-and-forget: a
      // non-alert report or an undeployed function must never block the create.
      if (value.alertRequested) void requestBirdAlert(newId).catch(() => {});
    },
    onError: (_err, _value, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.feed, context.previous);
      hapticError();
    },
  });

  return (
    <Screen
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: insets.top + Spacing.three }}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeader title={sv.observation.titleNew} level="card" />
      <ObservationForm
        key={formKey}
        mode="create"
        onSubmit={(v) => {
          createMutation.mutate(v);
          setFormKey((k) => k + 1);
          router.navigate('/');
        }}
        submitting={createMutation.isPending}
      />
    </Screen>
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
