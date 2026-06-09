/**
 * The shared observation form (M12) — the native port of the web
 * `observation-form.tsx`. One component drives both **create** (the Larm
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
import { useIsFocused } from 'expo-router';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, findNodeHandle, ScrollView, StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/components/activity-picker';
import { Button } from '@/components/button';
import { CountStepper } from '@/components/count-stepper';
import { DateTimePicker } from '@/components/date-time-picker';
import { ImageUpload } from '@/components/image-upload';
import { LocationPicker, type LocationValue } from '@/components/location-picker';
import { SpeciesPicker } from '@/components/species-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
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

/** Imperative handle so a nav-bar action can drive the form's own validate +
 *  submit (the inline submit button is hidden when `submitInHeader`). */
export type ObservationFormHandle = { submit: () => void };

export type ObservationFormProps = {
  initial?: ObservationFormValue;
  mode: 'create' | 'edit';
  onSubmit: (value: ObservationFormValue) => void;
  onDelete?: () => void;
  submitting?: boolean;
  deleting?: boolean;
  /** The observation id (edit) — used as the image `draftId` so a replaced photo
   *  overwrites `…/observations/{id}.jpg` in place. */
  observationId?: string;
  /** The enclosing `Screen`'s ScrollView — lets an invalid submit scroll the
   *  first errored field into view (it may be off-screen on this tall form).
   *  Structurally typed so any ref object (Mutable/RefObject) is accepted. */
  scrollRef?: { current: ScrollView | null };
  /** When the route hosts the primary submit in the nav header, hide the inline
   *  submit button (the destructive delete stays inline). */
  submitInHeader?: boolean;
};

export const ObservationForm = forwardRef<ObservationFormHandle, ObservationFormProps>(
  function ObservationForm(
    { initial, mode, onSubmit, onDelete, submitting, deleting, observationId, scrollRef, submitInHeader },
    ref,
  ) {
  const [value, setValue] = useState<ObservationFormValue>(initial ?? emptyObservation());
  const [showErrors, setShowErrors] = useState(false);
  const busy = !!submitting || !!deleting;

  // Larma is a long-lived tab — it stays mounted, so the `observedAt` captured
  // by `emptyObservation()` at first mount drifts stale (it would otherwise read
  // "now" only on the very first open, or right after a submit). The user
  // reaching this screen is reporting a bird they're seeing *now*, so snap the
  // time to the present every time the create form regains focus. Edit mode is
  // left alone — it shows the observation's real recorded time. A manual time
  // change made during the same visit is preserved (focus hasn't changed).
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused && mode === 'create') {
      setValue((v) => ({ ...v, observedAt: new Date() }));
    }
  }, [isFocused, mode]);

  // Wrappers around the three fields that can fail validation, so an invalid
  // submit can scroll the first one into view.
  const speciesRef = useRef<View>(null);
  const locationRef = useRef<View>(null);
  const activityRef = useRef<View>(null);

  function update<K extends keyof ObservationFormValue>(key: K, next: ObservationFormValue[K]) {
    setValue((v) => ({ ...v, [key]: next }));
  }

  const speciesError = showErrors && !value.speciesId ? sv.observation.errors.speciesMissing : null;
  const locationInvalid = showErrors && value.location.kind === 'none';
  const activityError =
    showErrors && value.activity === null ? sv.observation.errors.activityMissing : null;

  // Bring the first invalid field into view. The PickerFields buzz red on their
  // own; on a form this tall the offending field is often off-screen (especially
  // when submitting from the nav header), so a buzz alone leaves the user hunting.
  function scrollToFirstError() {
    const target = !value.speciesId
      ? speciesRef.current
      : value.location.kind === 'none'
        ? locationRef.current
        : value.activity === null
          ? activityRef.current
          : null;
    const scroller = scrollRef?.current;
    if (!target || !scroller) return;
    const scrollNode = findNodeHandle(scroller);
    if (scrollNode == null) return;
    target.measureLayout(
      scrollNode,
      (_x, y) => scroller.scrollTo({ y: Math.max(0, y - Spacing.three), animated: true }),
      () => {},
    );
  }

  function handleSubmit() {
    if (!value.speciesId || value.location.kind === 'none' || value.activity === null) {
      // The invalid PickerFields flip red and each buzz once (PickerField owns the
      // error haptic), then we scroll the first one into view. A summary toast
      // names what's missing so the user isn't left with just a vibration when the
      // red field (often Plats — set by tapping the map) is off-screen.
      setShowErrors(true);
      const missing = [
        !value.speciesId ? sv.observation.speciesLabel : null,
        value.location.kind === 'none' ? sv.observation.locationLabel : null,
        value.activity === null ? sv.observation.activityLabel : null,
      ].filter(Boolean) as string[];
      showToast(sv.observation.errors.fillRequired(missing), 'error');
      requestAnimationFrame(scrollToFirstError);
      return;
    }
    onSubmit(value);
  }

  // A stable submit() that always runs the latest handleSubmit (which closes over
  // the current value + callbacks) — driven by the nav-header action.
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  useImperativeHandle(ref, () => ({ submit: () => submitRef.current() }), []);

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
      <View ref={speciesRef}>
        <SpeciesPicker
          value={value.speciesId}
          onChange={(id) => update('speciesId', id)}
          invalid={!!speciesError}
          error={speciesError}
        />
      </View>

      <CountStepper value={value.count} onChange={(n) => update('count', n)} />

      <DateTimePicker value={value.observedAt} onChange={(d) => update('observedAt', d)} />

      <View ref={locationRef}>
        <LocationPicker
          value={value.location}
          onChange={(loc) => update('location', loc)}
          invalid={locationInvalid}
          error={locationInvalid ? sv.observation.errors.locationMissing : null}
        />
      </View>

      <View ref={activityRef}>
        <ActivityPicker
          value={value.activity}
          onChange={(a) => update('activity', a)}
          invalid={!!activityError}
          error={activityError}
        />
      </View>

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

      {/* The primary submit lives in the nav header when `submitInHeader`; the
          inline button is the fallback (and keeps the form usable on its own). */}
      {!submitInHeader ? (
        <Button
          title={mode === 'create' ? sv.observation.submitNew : sv.observation.submitEdit}
          onPress={handleSubmit}
          loading={submitting}
          disabled={deleting}
          haptic="commit"
        />
      ) : null}

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
});

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  comment: { minHeight: 120, textAlignVertical: 'top' },
  imageField: { gap: Spacing.one },
});
