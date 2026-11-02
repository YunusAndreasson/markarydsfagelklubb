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
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import {
  StyleSheet,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
  type ViewInstance,
} from 'react-native';

import { ActivityPicker } from '@/components/activity-picker';
import { Button } from '@/components/button';
import { CountStepper } from '@/components/count-stepper';
import { DateTimePicker } from '@/components/date-time-picker';
import { FieldLabel } from '@/components/field-label';
import { BELL, Icon } from '@/components/icon';
import { ImageUpload } from '@/components/image-upload';
import { LocationPicker, type LocationValue } from '@/components/location-picker';
import { SpeciesPicker } from '@/components/species-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { sharedStyles } from '@/constants/shared-styles';
import { IconSize, Spacing } from '@/constants/theme';
import { useKeepAboveKeyboard } from '@/hooks/use-keep-above-keyboard';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
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
  ref?: Ref<ObservationFormHandle>;
  initial?: ObservationFormValue;
  mode: 'create' | 'edit';
  onSubmit: (value: ObservationFormValue) => void;
  onDelete?: () => void;
  submitting?: boolean;
  deleting?: boolean;
  /** The enclosing `Screen`'s ScrollView — lets an invalid submit scroll the
   *  first errored field into view (it may be off-screen on this tall form).
   *  Structurally typed so any ref object (Mutable/RefObject) is accepted. */
  scrollRef?: { current: ScrollViewInstance | null };
  /** When the route hosts the primary submit in the nav header, hide the inline
   *  submit button (the destructive delete stays inline). */
  submitInHeader?: boolean;
  /** Fires whenever the form's "has unsaved input" state flips. The route uses it
   *  to guard an accidental dismiss (swipe/Avbryt) — the Mail/Calendar "Discard
   *  changes?" convention (Norman: forgiveness). */
  onDirtyChange?: (dirty: boolean) => void;
  onImageBusyChange?: (busy: boolean) => void;
};

/** Do two location values point at the same place? Used by the dirty check. */
function sameLocation(a: LocationValue, b: LocationValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'saved' && b.kind === 'saved') return a.id === b.id;
  if (a.kind === 'coords' && b.kind === 'coords')
    return a.latitude === b.latitude && a.longitude === b.longitude;
  return true; // both 'none'
}

/**
 * Has the user entered anything worth guarding on dismiss? Any field that
 * differs from the mount-time snapshot — the blank defaults in **create**, the
 * loaded record in **edit**. A changed time counts too: it is set only by an
 * explicit picker choice, so it is always user intent.
 */
function computeDirty(value: ObservationFormValue, initial: ObservationFormValue): boolean {
  return (
    value.speciesId !== initial.speciesId ||
    value.count !== initial.count ||
    value.observedAt.getTime() !== initial.observedAt.getTime() ||
    !sameLocation(value.location, initial.location) ||
    value.comment.trim() !== initial.comment.trim() ||
    value.imagePath !== initial.imagePath ||
    value.activity !== initial.activity
  );
}

export function ObservationForm({
  ref,
  initial,
  mode,
  onSubmit,
  onDelete,
  submitting,
  deleting,
  scrollRef,
  submitInHeader,
  onDirtyChange,
  onImageBusyChange,
}: ObservationFormProps) {
  const theme = useTheme();
  // The mount-time snapshot the dirty check compares against. Both hosting
  // routes are modals that unmount on dismiss, so a fresh mount (with a fresh
  // "now" in create mode) happens on every open — no reset-on-focus needed.
  // (An earlier snap-observedAt-to-now-on-focus effect is deliberately gone: the
  // pickers are pushed routes now, so returning from one refocuses this form and
  // the snap silently overwrote a manually chosen time.)
  const [initialValue] = useState<ObservationFormValue>(() => initial ?? emptyObservation());
  const [value, setValue] = useState<ObservationFormValue>(initialValue);
  const [commentOpen, setCommentOpen] = useState(() => !!initialValue.comment);
  const [showErrors, setShowErrors] = useState(false);
  const busy = !!submitting || !!deleting;
  const [imageBusy, setImageBusy] = useState(false);
  const imageBusyRef = useRef(false);

  function changeImageBusy(next: boolean) {
    // Guard the imperative submit immediately, before the header re-renders.
    imageBusyRef.current = next;
    setImageBusy(next);
    onImageBusyChange?.(next);
  }

  // Surface "has unsaved input" to the route so it can guard an accidental
  // dismiss. `onDirtyChange` from `useState`'s setter is stable, so this only
  // fires when the boolean actually flips.
  const dirty = computeDirty(value, initialValue);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Wrappers around the three fields that can fail validation, so an invalid
  // submit can scroll the first one into view.
  const speciesRef = useRef<ViewInstance>(null);
  const locationRef = useRef<ViewInstance>(null);
  const activityRef = useRef<ViewInstance>(null);
  const commentRef = useRef<TextInputInstance>(null);
  useKeepAboveKeyboard(commentRef, scrollRef);

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
    // Measure against the ScrollView's host view directly — the modern
    // `measureLayout(HostInstance)` form; `findNodeHandle` is deprecated.
    const scrollHost = scroller.getNativeScrollRef();
    if (!scrollHost) return;
    target.measureLayout(
      scrollHost,
      (_x, y) => scroller.scrollTo({ y: Math.max(0, y - Spacing.three), animated: true }),
      () => {},
    );
  }

  function handleSubmit() {
    if (busy || imageBusyRef.current) return;
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

  // Driven by the nav-header action. No dependency array on purpose: the handle
  // is re-created each render, so `submit` always closes over the latest form
  // value — no mutable-ref-during-render hack needed.
  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  async function confirmDelete() {
    if (busy || imageBusyRef.current) return;
    // `confirm()` fires the warning haptic itself as the dialog presents.
    const ok = await confirm({
      title: sv.observation.deleteTitle,
      message: sv.observation.deleteConfirm,
      confirmLabel: sv.observation.deleteButton,
      destructive: true,
    });
    if (ok) onDelete?.();
  }

  return (
    <View style={styles.form}>
      {/* Every field goes inert while a save is in flight. The comment/photo
          already did; the five pickers did not, and they are PUSHED routes — so
          tapping one mid-save opened a sheet that the route's own
          `onSuccess: router.back()` then dismissed, leaving a committed report on
          a still-open composer whose Larma button invited a duplicate. */}
      <View ref={speciesRef}>
        <SpeciesPicker
          value={value.speciesId}
          onChange={(id) => update('speciesId', id)}
          invalid={!!speciesError}
          error={speciesError}
          disabled={busy}
        />
      </View>

      <CountStepper value={value.count} onChange={(n) => update('count', n)} disabled={busy} />

      <DateTimePicker
        value={value.observedAt}
        onChange={(d) => update('observedAt', d)}
        disabled={busy}
      />

      <View ref={locationRef}>
        <LocationPicker
          value={value.location}
          onChange={(loc) => update('location', loc)}
          invalid={locationInvalid}
          error={locationInvalid ? sv.observation.errors.locationMissing : null}
          disabled={busy}
        />
      </View>

      <View ref={activityRef}>
        <ActivityPicker
          value={value.activity}
          onChange={(a) => update('activity', a)}
          invalid={!!activityError}
          error={activityError}
          disabled={busy}
        />
      </View>

      {commentOpen ? (
        <TextField
          ref={commentRef}
          label={sv.observation.commentLabel}
          optional
          value={value.comment}
          onChangeText={(t) => update('comment', t)}
          placeholder={sv.observation.commentPlaceholder}
          multiline
          autoFocus={!initialValue.comment}
          numberOfLines={6}
          maxLength={2000}
          autoCapitalize="sentences"
          editable={!busy}
          style={styles.comment}
        />
      ) : (
        <Button
          title={sv.observation.addComment}
          variant="secondary"
          onPress={() => setCommentOpen(true)}
          disabled={busy}
          haptic={false}
          style={styles.addComment}
        />
      )}

      <View style={styles.imageField}>
        {value.imagePath ? <FieldLabel label={sv.observation.imageLabel} optional /> : null}
        <ImageUpload
          value={value.imagePath}
          onChange={(path) => update('imagePath', path)}
          onBusyChange={changeImageBusy}
          purpose="observation"
          shape="rectangle"
          compactEmpty
          // The saved photo (edit) must survive until Spara commits: "Ta bort"
          // only clears the field, and a replace uploads to a fresh draft path.
          // The route's save flow deletes the old object once the update lands —
          // so discarding the edit never destroys (or silently swaps) the photo.
          preservePath={mode === 'edit' ? (initialValue.imagePath ?? null) : null}
          disabled={busy}
        />
      </View>

      {/* Every report fans out a push to the whole club (`alertRequested` is
          always true on create — the per-report toggle was removed for web
          parity), and nothing on screen said so: "Larma" alone doesn't tell you
          it rings other people's phones. This caption is the disclosure that
          was written for exactly this spot but never rendered. Create only —
          an edit deliberately doesn't re-alert. */}
      {mode === 'create' ? (
        <View style={styles.alertNote}>
          <Icon name={BELL} size={IconSize.meta} color={theme.mutedForeground} />
          <ThemedText type="small" themeColor="mutedForeground" style={sharedStyles.flex}>
            {sv.observation.alertCaption}
          </ThemedText>
        </View>
      ) : null}

      {/* The primary submit lives in the nav header when `submitInHeader`; the
          inline button is the fallback (and keeps the form usable on its own). */}
      {!submitInHeader ? (
        <Button
          title={mode === 'create' ? sv.observation.submitNew : sv.observation.submitEdit}
          onPress={handleSubmit}
          loading={submitting}
          disabled={deleting || imageBusy}
          haptic="commit"
        />
      ) : null}

      {mode === 'edit' && onDelete ? (
        <Button
          title={sv.observation.deleteButton}
          variant="destructive"
          onPress={() => void confirmDelete()}
          loading={deleting}
          disabled={submitting || imageBusy}
          haptic="commit"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  // Fixed height: long text scrolls inside the box. If the box grew while typing,
  // new lines would drop behind the keyboard, since nothing re-scrolls the form.
  comment: { height: 140, textAlignVertical: 'top' },
  addComment: { alignItems: 'flex-start', paddingHorizontal: Spacing.three },
  imageField: { gap: Spacing.one },
  // `flex-start` so the bell sits on the caption's FIRST line when it wraps.
  alertNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
});
