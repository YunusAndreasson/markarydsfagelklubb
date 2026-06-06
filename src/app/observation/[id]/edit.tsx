import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ALERT } from '@/components/icon';
import {
  ObservationForm,
  formToInput,
  type ObservationFormValue,
} from '@/components/observation-form';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { StateBlock } from '@/components/state-block';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query/keys';
import {
  deleteObservation,
  observationQueryOptions,
  updateObservation,
  type FeedObservation,
} from '@/lib/query/observations';
import { deleteUpload } from '@/lib/query/storage';

// Observation edit (owner-only) — a modal over the tabs. Repopulates the shared
// `ObservationForm`, then updates/deletes via the M3 mutations. Both flows patch
// the feed + detail caches optimistically and dismiss immediately; the side
// effects (invalidate, image cleanup, rollback, haptics) live in the
// `useMutation` option callbacks, which fire even after the modal unmounts.
export default function ObservationEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const q = useQuery(observationQueryOptions(id));
  const obs = q.data;

  const updateMutation = useMutation({
    mutationFn: (value: ObservationFormValue) => updateObservation({ id, ...formToInput(value) }),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });
      const previousFeed = queryClient.getQueryData<FeedObservation[]>(queryKeys.feed);
      const previousObs = queryClient.getQueryData<FeedObservation | null>(queryKeys.observation(id));
      queryClient.setQueryData<FeedObservation[]>(queryKeys.feed, (prev) =>
        (prev ?? []).map((row) => (row.id === id ? patchRow(row, value) : row)),
      );
      queryClient.setQueryData<FeedObservation | null>(queryKeys.observation(id), (prev) =>
        prev ? patchRow(prev, value) : prev,
      );
      return { previousFeed, previousObs };
    },
    onSuccess: (_data, value) => {
      hapticSuccess();
      // The photo path is deterministic on edit (`draftId = id`), so a replace
      // overwrites in place. Only a path that genuinely changed (e.g. the old row
      // had a random create-time path) leaves an orphan to clean up.
      if (value.imagePath !== obs?.imagePath && obs?.imagePath) {
        void deleteUpload(obs.imagePath).catch(() => {});
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      void queryClient.invalidateQueries({ queryKey: queryKeys.observation(id) });
      // The owner's member-profile feed also embeds this row.
      if (obs) void queryClient.invalidateQueries({ queryKey: queryKeys.member(obs.userId) });
    },
    onError: (_err, _value, context) => {
      if (context?.previousFeed) queryClient.setQueryData(queryKeys.feed, context.previousFeed);
      if (context) queryClient.setQueryData(queryKeys.observation(id), context.previousObs);
      hapticError();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteObservation(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });
      const previousFeed = queryClient.getQueryData<FeedObservation[]>(queryKeys.feed);
      queryClient.setQueryData<FeedObservation[]>(queryKeys.feed, (prev) =>
        (prev ?? []).filter((row) => row.id !== id),
      );
      return { previousFeed };
    },
    onSuccess: () => {
      hapticSuccess();
      if (obs?.imagePath) void deleteUpload(obs.imagePath).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      // Drop the now-deleted row from the owner's member-profile feed too.
      if (obs) void queryClient.invalidateQueries({ queryKey: queryKeys.member(obs.userId) });
    },
    onError: (_err, _value, context) => {
      if (context?.previousFeed) queryClient.setQueryData(queryKeys.feed, context.previousFeed);
      hapticError();
    },
  });

  let body: ReactNode;
  if (q.isLoading) {
    body = (
      <View style={styles.body}>
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={52} radius={SurfaceRadius.md} />
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={56} radius={SurfaceRadius.md} />
        <Skeleton aspectRatio={4 / 3} radius={SurfaceRadius.md} />
      </View>
    );
  } else if (q.isError) {
    body = (
      <StateBlock
        tone="error"
        icon={ALERT}
        title={sv.errors.somethingWrong}
        message={sv.errors.somethingWrongHelp}
        action={{ label: sv.errors.tryAgain, onPress: () => void q.refetch(), loading: q.isFetching }}
      />
    );
  } else if (!obs) {
    body = <StateBlock icon={ALERT} title={sv.observation.notFound} />;
  } else if (!user || obs.userId !== user.id) {
    body = <StateBlock icon={ALERT} title={sv.observation.notYours} />;
  } else {
    const initial: ObservationFormValue = {
      speciesId: obs.speciesId,
      count: obs.count,
      observedAt: obs.observedAt,
      comment: obs.comment ?? '',
      imagePath: obs.imagePath,
      activity: obs.activity,
      // Don't re-alert the club on an edit.
      alertRequested: false,
      location:
        obs.locationId != null
          ? {
              kind: 'saved',
              id: obs.locationId,
              name: obs.locationName ?? '',
              latitude: obs.locationLatitude ?? undefined,
              longitude: obs.locationLongitude ?? undefined,
            }
          : obs.latitude != null && obs.longitude != null
            ? { kind: 'coords', latitude: obs.latitude, longitude: obs.longitude }
            : { kind: 'none' },
    };

    body = (
      <ObservationForm
        mode="edit"
        initial={initial}
        observationId={obs.id}
        onSubmit={(v) => {
          updateMutation.mutate(v);
          router.back();
        }}
        onDelete={() => {
          deleteMutation.mutate();
          router.back();
        }}
        submitting={updateMutation.isPending}
        deleting={deleteMutation.isPending}
      />
    );
  }

  return (
    <Screen inset="sub" keyboardShouldPersistTaps="handled">
      {body}
    </Screen>
  );
}

/** Apply a form value onto a cached feed/detail row for the optimistic update. */
function patchRow(row: FeedObservation, value: ObservationFormValue): FeedObservation {
  return {
    ...row,
    count: value.count,
    observedAt: value.observedAt,
    comment: value.comment.trim() || null,
    activity: value.activity,
    imagePath: value.imagePath,
    latitude: value.location.kind === 'coords' ? value.location.latitude : null,
    longitude: value.location.kind === 'coords' ? value.location.longitude : null,
    locationId: value.location.kind === 'saved' ? value.location.id : null,
    locationName: value.location.kind === 'saved' ? value.location.name : null,
  };
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
});
