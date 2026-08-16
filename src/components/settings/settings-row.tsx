/**
 * The workhorse settings row: a single monochrome leading glyph, label (+ optional
 * sublabel), and a trailing column that holds a muted `value`, a chevron, a check,
 * or a `Switch`. Color is reserved for *state* — active switches/checks and
 * `action` rows lift the icon/label to `theme.tint`; `destructive` rows go red.
 *
 * Press feedback comes from `PressableScale` (variant="row"). Switch-only rows
 * stay non-pressable so the Switch owns the gesture (drag-to-toggle).
 *
 * Ported from the edenmind reference.
 */
import { type ReactNode } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { CHECK, CHEVRON, Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Opacity, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticToggle } from '@/lib/haptics';

export type SettingsRowProps = {
  icon?: IconName;
  label: string;
  sublabel?: string;
  /** Right-aligned muted value text (e.g. "På", "070-…"). */
  value?: string;
  /** A custom node rendered in the trailing column. */
  trailing?: ReactNode;
  accessory?: 'chevron' | 'switch' | 'check' | 'none';
  switchValue?: boolean;
  onSwitchChange?: (next: boolean) => void;
  /** For `accessory: 'check'` rows — renders the checkmark and marks the row selected. */
  selected?: boolean;
  onPress?: () => void;
  /** Tint the label with the destructive color (e.g. Delete). */
  destructive?: boolean;
  /** Tint the label with the brand accent — tappable "actions". */
  action?: boolean;
  disabled?: boolean;
};

export function SettingsRow({
  icon,
  label,
  sublabel,
  value,
  trailing,
  accessory = 'none',
  switchValue,
  onSwitchChange,
  selected = false,
  onPress,
  destructive = false,
  action = false,
  disabled = false,
}: SettingsRowProps) {
  const theme = useTheme();

  const isActiveSwitch = accessory === 'switch' && switchValue === true;
  const isActiveCheck = accessory === 'check' && selected;
  const iconColor = destructive
    ? theme.destructive
    : action
      ? theme.tint
      : isActiveSwitch || isActiveCheck
        ? theme.tint
        : theme.mutedForeground;
  const labelColor = destructive ? theme.destructive : action ? theme.tint : theme.foreground;

  const body = (
    <>
      {icon ? (
        <View style={styles.iconCell}>
          <Icon name={icon} size={IconSize.control} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.textCol}>
        <ThemedText type="default" style={{ color: labelColor }} numberOfLines={1}>
          {label}
        </ThemedText>
        {sublabel ? (
          <ThemedText type="small" themeColor="mutedForeground">
            {sublabel}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.rightCol}>
        {value ? (
          <ThemedText type="default" themeColor="mutedForeground" numberOfLines={1}>
            {value}
          </ThemedText>
        ) : null}
        {accessory === 'chevron' ? (
          <Icon name={CHEVRON} size={IconSize.control} color={theme.mutedForeground} />
        ) : null}
        {accessory === 'check' && selected ? (
          <Icon name={CHECK} size={IconSize.control} color={theme.tint} />
        ) : null}
        {accessory === 'switch' ? (
          <Switch
            value={switchValue}
            onValueChange={(next) => {
              // Direction-aware toggle feedback (Toggle_On/Off on Android,
              // Rigid/Soft on iOS) rather than a flat selection tick.
              hapticToggle(next);
              onSwitchChange?.(next);
            }}
            disabled={disabled}
            trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
            thumbColor={Platform.OS === 'android' ? theme.switchThumb : undefined}
            ios_backgroundColor={theme.backgroundSelected}
          />
        ) : null}
        {trailing}
      </View>
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        variant="row"
        // A check row *chooses* something and earns its tick; every other
        // pressable settings row just navigates, so it inherits the `row`
        // variant's silence.
        haptic={accessory === 'check' ? 'select' : undefined}
        pressedBackgroundColor={theme.backgroundSelected}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessory === 'check' ? 'radio' : 'button'}
        accessibilityLabel={[label, sublabel, value].filter(Boolean).join(', ')}
        accessibilityState={{ disabled, selected: accessory === 'check' ? selected : undefined }}
        // Same reason as `Button`: `row` is a scale variant, so its animated
        // style overwrote the `styles.dimmed` opacity and a disabled row read as
        // enabled. The static one still applies on the non-pressable branch below.
        dimmed={disabled}
        style={styles.row}
      >
        {body}
      </PressableScale>
    );
  }

  return <View style={[styles.row, disabled && styles.dimmed]}>{body}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 52,
  },
  // Fixed width so labels start on the same x whether or not a row has an icon.
  iconCell: { width: 22, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, gap: Spacing.half },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dimmed: { opacity: Opacity.disabled },
});
