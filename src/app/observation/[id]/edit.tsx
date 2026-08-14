import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HeaderButton } from '@/components/header-button';
import { HeaderDismissButton } from '@/components/header-dismiss-button';
import { ALERT } from '@/components/icon';
import {
  ObservationForm,
  formToInput,
  type ObservationFormHandle,
  type ObservationFormValue,
} from '@/components/observation-form';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ErrorBlock, StateBlock } from '@/components/state-block';
import { showToast } from '@/components/toast';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useDiscardGuard } from '@/hooks/use-discard-guard';
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
import { beginOptimistic, rollback } from '@/lib/query/optimistic';
import { type Species } from '@/lib/query/species';
import { deleteUpload } from '@/lib/query/storage';

// Observation edit (owner-only) — a modal over the tabs. Repopulates the shared
// `ObservationForm`, then updates/deletes via the M3 mutations. Both flows patch
// the feed + detail caches optimistically, but only dismiss after the write has
// committed so a failure leaves the form and its retry path intact.
export default function ObservationEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const q = useQuery(observationQueryOptions(id));
  const obs = q.data;
  const formRef = useRef<ObservationFormHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Guard an accidental dismiss of unsaved edits (swipe/Avbryt) — the iOS
  // "Discard changes?" convention (Norman: forgiveness). Swipe is disabled while
  // dirty so the guarded Avbryt is the only exit.
  const [dirty, setDirty] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (value: ObservationFormValue) => updateObservation({ id, ...formToInput(value) }),
    onMutate: async (value) => {
      const snapshots = await beginOptimistic([queryKeys.feed, queryKeys.observation(id)]);
      queryClient.setQueryData<FeedObservation[]>(queryKeys.feed, (prev) =>
        (prev ?? []).map((row) => (row.id === id ? patchRow(row, value) : row)),
      );
      queryClient.setQueryData<FeedObservation | null>(queryKeys.observation(id), (prev) =>
        prev ? patchRow(prev, value) : prev,
      );
      return snapshots;
    },
    onSuccess: (_data, value) => {
      hapticSuccess();
      showToast(sv.observation.updated, 'success');
      // A replaced/removed photo uploads to (or clears to) a NEW path — the old
      // object is deleted only now, once the update has committed. Deleting any
      // earlier (the form's `preservePath` guard) would let a discarded edit
      // destroy a photo the row still references.
      if (value.imagePath !== obs?.imagePath && obs?.imagePath) {
        void deleteUpload(obs.imagePath).catch(() => {});
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      void queryClient.invalidateQueries({ queryKey: queryKeys.observation(id) });
      // The owner's member-profile feed also embeds this row.
      if (obs) void queryClient.invalidateQueries({ queryKey: queryKeys.member(obs.userId) });
    },
    onError: (_err, _value, snapshots) => {
      rollback(snapshots);
      hapticError();
      showToast(sv.observation.saveFailed, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteObservation(id),
    onMutate: async () => {
      const snapshots = await beginOptimistic([queryKeys.feed]);
      queryClient.setQueryData<FeedObservation[]>(queryKeys.feed, (prev) =>
        (prev ?? []).filter((row) => row.id !== id),
      );
      return snapshots;
    },
    onSuccess: () => {
      hapticSuccess();
      showToast(sv.observation.deleted, 'success');
      if (obs?.imagePath) void deleteUpload(obs.imagePath).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      // Drop the now-deleted row's detail cache so it can't be re-shown (or
      // persisted to disk) as a stale, still-"editable" record. The user has
      // already been popped back to the feed by `onDelete`, so this can't flash a
      // "not found" state under them.
      queryClient.removeQueries({ queryKey: queryKeys.observation(id) });
      // Drop the now-deleted row from the owner's member-profile feed too.
      if (obs) void queryClient.invalidateQueries({ queryKey: queryKeys.member(obs.userId) });
    },
    onError: (_err, _value, snapshots) => {
      rollback(snapshots);
      hapticError();
      showToast(sv.observation.saveFailed, 'error');
    },
  });

  const busy = updateMutation.isPending || deleteMutation.isPending;
  // Keep the modal mounted until its write settles. This preserves both the
  // mutation continuation and the form needed to retry a failure.
  const { dismiss, gestureEnabled } = useDiscardGuard({ mode: 'edit', dirty, busy });

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
    body = <ErrorBlock error={q.error} onRetry={() => void q.refetch()} retrying={q.isFetching} />;
  } else if (!obs) {
    body = (
      <StateBlock
        icon={ALERT}
        title={sv.observation.notFound}
        // Dismiss the modal — the dead end shouldn't need the header chevron.
        action={{ label: sv.common.close, onPress: () => router.back() }}
      />
    );
  } else if (!user || obs.userId !== user.id) {
    body = (
      <StateBlock
        icon={ALERT}
        title={sv.observation.notYours}
        action={{ label: sv.common.close, onPress: () => router.back() }}
      />
    );
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
        ref={formRef}
        mode="edit"
        initial={initial}
        scrollRef={scrollRef}
        submitInHeader
        onDirtyChange={setDirty}
        onSubmit={(v) => {
          updateMutation.mutate(v, { onSuccess: () => router.back() });
        }}
        onDelete={() => {
          deleteMutation.mutate(undefined, {
            onSuccess: () => {
              // The observation no longer exists. Pop both the edit modal and
              // its now-dead detail screen, returning to feed/member profile.
              if (router.canDismiss()) router.dismiss(2);
              else router.back();
            },
          });
        }}
        submitting={updateMutation.isPending}
        deleting={deleteMutation.isPending}
      />
    );
  }

  const canEdit = !!obs && !!user && obs.userId === user.id;

  return (
    <>
      {/* Dismiss always present (text "Avbryt" on iOS, ✕ on Android) — even the
          not-found / not-yours states need a visible way out, not just a swipe.
          Spara only when the row is actually editable. */}
      <Stack.Screen
        options={{
          // Block the native swipe-to-dismiss while there are unsaved edits so the
          // guarded Avbryt below is the only way out.
          gestureEnabled,
          headerLeft: () => <HeaderDismissButton onPress={dismiss} disabled={busy} />,
          headerRight: canEdit
            ? () => (
                <HeaderButton
                  title={sv.observation.submitEdit}
                  onPress={() => formRef.current?.submit()}
                  loading={updateMutation.isPending}
                  disabled={deleteMutation.isPending}
                />
              )
            : undefined,
        }}
      />
      <Screen ref={scrollRef} inset="sub" bottomInset keyboardAware keyboardShouldPersistTaps="handled">
        {body}
      </Screen>
    </>
  );
}

/** Apply a form value onto a cached feed/detail row for the optimistic update. */
function patchRow(row: FeedObservation, value: ObservationFormValue): FeedObservation {
  // A changed art resolves its display fields from the warm species cache, so
  // the optimistic row doesn't flash the OLD species name/rarity until the
  // refetch lands. On a (rare) cache miss the old fields stand until then.
  const species =
    value.speciesId != null && value.speciesId !== row.speciesId
      ? queryClient
          .getQueryData<Species[]>(queryKeys.species)
          ?.find((s) => s.id === value.speciesId)
      : null;
  return {
    ...row,
    ...(species
      ? {
          speciesId: species.id,
          speciesSwedishName: species.swedishName,
          speciesScientificName: species.scientificName,
          speciesRarity: species.rarity,
        }
      : null),
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
