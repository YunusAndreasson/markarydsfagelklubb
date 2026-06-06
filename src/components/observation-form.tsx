/**
 * The shared observation form (M12) — the native port of the web
 * `observation-form.tsx`. One component drives both **create** (the Rapportera
 * tab) and **edit** (the owner-only modal): it composes the M9 field pickers
 * (species/count/time/location/activity), a multiline comment, and the M10
 * `ImageUpload`, then hands a validated `ObservationFormValue` back to the route,
 * which owns the mutation + navigation.
 *
 * Inset-agnostic on purpose: the route wraps it in the right `Screen` (tab grammar
 * for create, `sub` for the edit modal). Required-field errors render inline — red
 * border + a one-shot `hapticError`, both built into `PickerField` — matching the
 * app's own Profile form (M7), not the web's scroll-to-error.
 */
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/components/activity-picker';
import { Button } from '@/components/button';
import { CountStepper } from '@/components/count-stepper';
import { DateTimePicker } from '@/components/date-time-picker';
import { ImageUpload } from '@/components/image-upload';
import { LocationPicker, type LocationValue } from '@/components/location-picker';
import { SpeciesPicker } from '@/components/species-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { hapticWarning } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';
import { type Activity, type CreateObservationInput } from '@/lib/validation/observation';

export type ObservationFormValue = {
  speciesId: number | null;
  count: number;
  observedAt: Date;
  location: LocationValue;
  comment: string;
  imagePath: string | null;
  activity: Activity | null;
  alertRequested: boolean;
};

/** A blank create-form value. Reporting always alerts the club (web parity — the
 *  per-report toggle was removed), so `alertRequested` starts true. */
export function emptyObservation(): ObservationFormValue {
  return {
    speciesId: null,
    count: 1,
    observedAt: new Date(),
    location: { kind: 'none' },
    comment: '',
    imagePath: null,
    activity: null,
    alertRequested: true,
  };
}

/** Map a (validated) form value to the create/update mutation input. Throws if the
 *  required species/activity are missing — `handleSubmit` guarantees they aren't. */
export function formToInput(value: ObservationFormValue): CreateObservationInput {
  if (!value.speciesId) throw new Error('speciesId saknas');
  if (!value.activity) throw new Error('aktivitet saknas');
  return {
    speciesId: value.speciesId,
    count: value.count,
    observedAt: value.observedAt,
    comment: value.comment.trim() || null,
    locationId: value.location.kind === 'saved' ? value.location.id : null,
    latitude: value.location.kind === 'coords' ? value.location.latitude : null,
    longitude: value.location.kind === 'coords' ? value.location.longitude : null,
    imagePath: value.imagePath,
    activity: value.activity,
    alertRequested: value.alertRequested,
  };
}

export function ObservationForm({
  initial,
  mode,
  onSubmit,
  onDelete,
  submitting,
  deleting,
  observationId,
}: {
  initial?: ObservationFormValue;
  mode: 'create' | 'edit';
  onSubmit: (value: ObservationFormValue) => void;
  onDelete?: () => void;
  submitting?: boolean;
  deleting?: boolean;
  /** The observation id (edit) — used as the image `draftId` so a replaced photo
   *  overwrites `…/observations/{id}.jpg` in place. */
  observationId?: string;
}) {
  const [value, setValue] = useState<ObservationFormValue>(initial ?? emptyObservation());
  const [showErrors, setShowErrors] = useState(false);
  const busy = !!submitting || !!deleting;

  function update<K extends keyof ObservationFormValue>(key: K, next: ObservationFormValue[K]) {
    setValue((v) => ({ ...v, [key]: next }));
  }

  const speciesError = showErrors && !value.speciesId ? sv.observation.errors.speciesMissing : null;
  const locationInvalid = showErrors && value.location.kind === 'none';
  const activityError =
    showErrors && value.activity === null ? sv.observation.errors.activityMissing : null;

  function handleSubmit() {
    if (!value.speciesId || value.location.kind === 'none' || value.activity === null) {
      // The invalid PickerFields flip red and each buzz once (PickerField owns the
      // error haptic). No scroll-to-error — inline, like the Profile form (M7).
      setShowErrors(true);
      return;
    }
    onSubmit(value);
  }

  function confirmDelete() {
    // A destructive confirmation is appearing — let it be felt (HIG warning).
    hapticWarning();
    Alert.alert(sv.observation.deleteTitle, sv.observation.deleteConfirm, [
      { text: sv.common.cancel, style: 'cancel' },
      { text: sv.observation.deleteButton, style: 'destructive', onPress: () => onDelete?.() },
    ]);
  }

  return (
    <View style={styles.form}>
      <SpeciesPicker
        value={value.speciesId}
        onChange={(id) => update('speciesId', id)}
        invalid={!!speciesError}
        error={speciesError}
      />

      <CountStepper value={value.count} onChange={(n) => update('count', n)} />

      <DateTimePicker value={value.observedAt} onChange={(d) => update('observedAt', d)} />

      <LocationPicker
        value={value.location}
        onChange={(loc) => update('location', loc)}
        invalid={locationInvalid}
      />

      <ActivityPicker
        value={value.activity}
        onChange={(a) => update('activity', a)}
        invalid={!!activityError}
        error={activityError}
      />

      <TextField
        label={sv.observation.commentLabel}
        value={value.comment}
        onChangeText={(t) => update('comment', t)}
        placeholder={sv.observation.commentPlaceholder}
        multiline
        numberOfLines={6}
        maxLength={2000}
        autoCapitalize="sentences"
        editable={!busy}
        style={styles.comment}
      />

      <View style={styles.imageField}>
        <ThemedText type="smallBold" themeColor="mutedForeground">
          {sv.observation.imageLabel}
        </ThemedText>
        <ImageUpload
          value={value.imagePath}
          onChange={(path) => update('imagePath', path)}
          purpose="observation"
          shape="rectangle"
          draftId={observationId}
          disabled={busy}
        />
      </View>

      <Button
        title={mode === 'create' ? sv.observation.submitNew : sv.observation.submitEdit}
        onPress={handleSubmit}
        loading={submitting}
        disabled={deleting}
        haptic="commit"
      />

      {mode === 'edit' && onDelete ? (
        <Button
          title={sv.observation.deleteButton}
          variant="destructive"
          onPress={confirmDelete}
          loading={deleting}
          disabled={submitting}
          haptic="commit"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  comment: { minHeight: 120, textAlignVertical: 'top' },
  imageField: { gap: Spacing.one },
});
