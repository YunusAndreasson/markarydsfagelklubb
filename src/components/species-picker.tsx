/**
 * Art-väljaren — the report-form FIELD. Tapping it opens the native `picker/species`
 * sheet (`presentation: 'formSheet'`) and awaits the chosen species `id` via the
 * picker bridge. Reads the (cached) species list only to show the selected name;
 * the unlisted row shows as "Olistad fågelart" while its DB name stays "Olistad art".
 */
import { router } from 'expo-router';

import { useQuery } from '@tanstack/react-query';

import { PickerField } from '@/components/picker-field';
import { sv } from '@/lib/i18n/sv';
import { requestPick } from '@/lib/picker-bridge';
import { speciesQueryOptions } from '@/lib/query/species';

export function SpeciesPicker({
  value,
  onChange,
  invalid,
  error,
  disabled,
}: {
  value: number | null;
  onChange: (id: number) => void;
  invalid?: boolean;
  error?: string | null;
  /** Inert while the hosting form is saving — see `PickerField`. */
  disabled?: boolean;
}) {
  const speciesQuery = useQuery(speciesQueryOptions());
  const all = speciesQuery.data;
  const unlistedId = all?.find((s) => s.swedishName === sv.observation.speciesUnlisted)?.id;
  const selectedLabel =
    value != null
      ? value === unlistedId
        ? sv.observation.speciesUnlistedLabel
        : (all?.find((s) => s.id === value)?.swedishName ?? null)
      : null;

  async function open() {
    const picked = await requestPick<number>(() =>
      router.push({
        pathname: '/picker/species',
        params: value != null ? { current: String(value) } : {},
      }),
    );
    if (picked != null) onChange(picked);
  }

  return (
    <PickerField
      label={sv.observation.speciesLabel}
      value={selectedLabel}
      placeholder={sv.observation.speciesPlaceholder}
      invalid={invalid}
      error={error}
      disabled={disabled}
      onPress={() => void open()}
    />
  );
}
