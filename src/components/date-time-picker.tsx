/**
 * Tid-väljaren — when the bird was seen. Wraps `@expo/ui`'s native picker behind
 * the app's `PickerField`, showing the friendly Swedish label ("Idag 14:30").
 *
 * Android has no inline datetime picker, so we chain two native dialogs: a date
 * dialog, then a time dialog, then combine. The future is disallowed: the date
 * dialog caps at today, and because the Android time dialog can't enforce a max,
 * the combined value is clamped to "now" in JS (validation also rejects future
 * times). iOS gets a single inline datetime picker in a small modal sheet.
 */
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateTimePicker as NativeDateTimePicker } from '@expo/ui/community/datetime-picker';

import { Button } from '@/components/button';
import { CLOCK, Icon } from '@/components/icon';
import { PickerField } from '@/components/picker-field';
import { ThemedView } from '@/components/themed-view';
import { SurfaceRadius } from '@/constants/surface';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { hapticSelect } from '@/lib/haptics';
import { sv } from '@/lib/i18n/sv';

const isIOS = Platform.OS === 'ios';

/** Glue a chosen day (Y/M/D) onto a chosen time (H/M), zeroing seconds. */
function combine(day: Date, time: Date): Date {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

/** Never allow the future (the Android time dialog can't enforce a max). */
function clampFuture(d: Date): Date {
  const now = new Date();
  return d.getTime() > now.getTime() ? now : d;
}

export function DateTimePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const theme = useTheme();
  const { colorScheme } = useThemeMode();
  const insets = useSafeAreaInsets();
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
          value={pendingDate}
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

      {/* iOS: single inline datetime picker in a bottom sheet. */}
      {isIOS ? (
        <Modal
          visible={iosOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIosOpen(false)}
          statusBarTranslucent
        >
          <View style={styles.iosRoot}>
            <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} />
            <ThemedView
              style={[styles.iosCard, { borderColor: theme.border, paddingBottom: insets.bottom + Spacing.three }]}
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
            </ThemedView>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  iosRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  iosCard: {
    borderTopLeftRadius: SurfaceRadius.lg,
    borderTopRightRadius: SurfaceRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
});
