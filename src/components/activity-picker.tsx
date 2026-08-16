/**
 * Aktivitet-väljaren — the report-form FIELD. Tapping it opens the native
 * `picker/activity` sheet (`presentation: 'formSheet'`) and awaits the chosen
 * value via the picker bridge. Required (no silent default), mirroring the web.
 */
import { router } from 'expo-router';

import { PickerField } from '@/components/picker-field';
import { activityLabel, sv } from '@/lib/i18n/sv';
import { requestPick } from '@/lib/picker-bridge';
import { type Activity } from '@/lib/validation/observation';

export function ActivityPicker({
  value,
  onChange,
  invalid,
  error,
  disabled,
}: {
  value: Activity | null;
  onChange: (a: Activity) => void;
  invalid?: boolean;
  error?: string | null;
  /** Inert while the hosting form is saving — see `PickerField`. */
  disabled?: boolean;
}) {
  async function open() {
    const picked = await requestPick<Activity>(() =>
      router.push({
        pathname: '/picker/activity',
        params: value ? { current: value } : {},
      }),
    );
    if (picked != null) onChange(picked);
  }

  return (
    <PickerField
      label={sv.observation.activityLabel}
      value={value ? activityLabel(value) : null}
      placeholder={sv.observation.activityPlaceholder}
      invalid={invalid}
      error={error}
      disabled={disabled}
      onPress={() => void open()}
    />
  );
}
