/**
 * Plats-väljaren — the report-form FIELD. Tapping it opens the native
 * `picker/location` sheet (`presentation: 'formSheet'`) and awaits the chosen
 * `LocationValue` via the picker bridge. The field shows the named lokal, "På
 * karta" for a raw point, or the placeholder. Location is required — no "clear".
 */
import { router } from 'expo-router';

import { Icon, LOCATION } from '@/components/icon';
import { PickerField } from '@/components/picker-field';
import { IconSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sv } from '@/lib/i18n/sv';
import { requestPick } from '@/lib/picker-bridge';

export type LocationValue =
  | { kind: 'none' }
  | { kind: 'saved'; id: number; name: string; latitude?: number; longitude?: number }
  | { kind: 'coords'; latitude: number; longitude: number; accuracy?: number };

export function LocationPicker({
  value,
  onChange,
  invalid,
  error,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  invalid?: boolean;
  /** Validation message shown (destructive) under the field when required-but-empty. */
  error?: string | null;
}) {
  const theme = useTheme();

  const summary =
    value.kind === 'saved'
      ? value.name
      : value.kind === 'coords'
        ? sv.feed.locationOnMap
        : null;

  async function open() {
    const picked = await requestPick<LocationValue>(() =>
      router.push({
        pathname: '/picker/location',
        params: value.kind === 'saved' ? { currentId: String(value.id) } : {},
      }),
    );
    if (picked != null) onChange(picked);
  }

  return (
    <PickerField
      label={sv.observation.locationLabel}
      value={summary}
      placeholder={sv.observation.locationPlaceholder}
      invalid={invalid}
      error={error}
      onPress={() => void open()}
      leading={<Icon name={LOCATION} size={IconSize.control} color={theme.mutedForeground} />}
    />
  );
}
