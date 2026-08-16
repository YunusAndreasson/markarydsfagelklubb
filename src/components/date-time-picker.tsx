/**
 * Tid-väljaren — when the bird was seen. Wraps `@expo/ui`'s native picker behind
 * the app's `PickerField`, showing the friendly Swedish label ("Idag 14:30").
 *
 * Android has no inline datetime picker, so we chain two native dialogs: a date
 * dialog, then a time dialog, then combine. The future is disallowed: the date
 * dialog caps at today, and because the Android time dialog can't enforce a max,
 * the combined value is clamped to "now" in JS (validation also rejects future
 * times). iOS gets a single inline datetime picker in the shared `PickerSheet`.
 */
import { useState } from 'react';
import { Platform } from 'react-native';

import { DateTimePicker as NativeDateTimePicker } from '@expo/ui/community/datetime-picker';

import { Button } from '@/components/button';
import { CLOCK, Icon } from '@/components/icon';
import { PickerField } from '@/components/picker-field';
import { PickerSheet } from '@/components/picker-sheet';
import { IconSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

const isIOS = Platform.OS === 'ios';

/**
 * The calendar day the Android date dialog returned.
 *
 * `@expo/ui` hands the picked day back as UTC midnight. Read with the local
 * getters that instant is 02:00 on the right day in Sweden — but in any
 * UTC-negative zone it is the day BEFORE, so a birder reporting from abroad would
 * silently file the observation one day early.
 *
 * A zeroed instant is unambiguous on the side it was zeroed on, so read the
 * fields from there: UTC when the dialog zeroed UTC (today's behaviour), local
 * otherwise (so a future library version returning local midnight still works).
 * Only ever called on the dialog's return value — never on the current value,
 * whose midnight is genuinely meaningful.
 */
function pickedDay(returned: Date): { year: number; month: number; date: number } {
  const zeroedInUtc = returned.getUTCHours() === 0 && returned.getUTCMinutes() === 0;
  return zeroedInUtc
    ? {
        year: returned.getUTCFullYear(),
        month: returned.getUTCMonth(),
        date: returned.getUTCDate(),
      }
    : { year: returned.getFullYear(), month: returned.getMonth(), date: returned.getDate() };
}

/** Glue the chosen day (Y/M/D) onto the chosen time (H/M), zeroing seconds. */
function combine(day: Date, time: Date): Date {
  const { year, month, date } = pickedDay(day);
  return new Date(year, month, date, time.getHours(), time.getMinutes(), 0, 0);
}

/** Never allow the future (the Android time dialog can't enforce a max). */
function clampFuture(d: Date): Date {
  const now = new Date();
  return d.getTime() > now.getTime() ? now : d;
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
}: {
  value: Date;
  onChange: (d: Date) => void;
  /** Inert while the hosting form is saving — see `PickerField`. */
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const [stage, setStage] = useState<'idle' | 'date' | 'time'>('idle');
  const [pendingDate, setPendingDate] = useState<Date>(value);
  const [iosOpen, setIosOpen] = useState(false);

  function openPicker() {
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    setPendingDate(value);
    setStage('date');
  }

  return (
    <>
      <PickerField
        label={sv.observation.timeLabel}
        value={sv.observation.timeFriendly(value)}
        placeholder={sv.observation.timeLabel}
        disabled={disabled}
        onPress={openPicker}
        leading={<Icon name={CLOCK} size={IconSize.control} color={theme.mutedForeground} />}
      />

      {/* Android: chained date → time dialogs (each opens on mount). */}
      {!isIOS && stage === 'date' ? (
        <NativeDateTimePicker
          value={value}
          mode="date"
          presentation="dialog"
          maximumDate={new Date()}
          accentColor={theme.tint}
          onValueChange={(_event, d) => {
            setPendingDate(d);
            setStage('time');
          }}
          onDismiss={() => setStage('idle')}
        />
      ) : null}
      {!isIOS && stage === 'time' ? (
        <NativeDateTimePicker
          // Seeded from `value` — the time already on the report — NOT from
          // `pendingDate`. `pendingDate` is the date dialog's UTC-midnight
          // return, so seeding from it opened the clock at 02:00 (UTC midnight
          // rendered in CEST) and, since the dialog commits whatever it is
          // showing, merely changing the DATE silently rewrote the observation's
          // time to 02:00. The day comes from `pendingDate` via `combine`; only
          // the hands come from here.
          value={value}
          mode="time"
          presentation="dialog"
          accentColor={theme.tint}
          onValueChange={(_event, t) => {
            // The time dialog confirmed — a value committed; buzz like the other
            // pickers. (iOS commits via the "Klar" Button, which already buzzes.)
            hapticSelect();
            onChange(clampFuture(combine(pendingDate, t)));
            setStage('idle');
          }}
          onDismiss={() => setStage('idle')}
        />
      ) : null}

      {/* iOS: single inline datetime picker in the shared PickerSheet — one
          sheet chrome (scrim, card, insets, close) for the whole picker family. */}
      {isIOS ? (
        <PickerSheet
          visible={iosOpen}
          title={sv.observation.timeLabel}
          onClose={() => setIosOpen(false)}
        >
          <NativeDateTimePicker
            value={value}
            mode="datetime"
            display="inline"
            maximumDate={new Date()}
            accentColor={theme.tint}
            themeVariant={colorScheme}
            onValueChange={(_event, d) => onChange(clampFuture(d))}
          />
          <Button title={sv.common.done} variant="primary" onPress={() => setIosOpen(false)} />
        </PickerSheet>
      ) : null}
    </>
  );
}
