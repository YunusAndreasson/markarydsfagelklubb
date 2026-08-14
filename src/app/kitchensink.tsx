import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityPicker } from '@/components/activity-picker';
import { Button } from '@/components/button';
import { CountStepper } from '@/components/count-stepper';
import { DateTimePicker } from '@/components/date-time-picker';
import { ALERT, BLOCKED, FLAG, TRAY } from '@/components/icon';
import { ImageUpload } from '@/components/image-upload';
import { ListCard } from '@/components/list-card';
import { LocationPicker, type LocationValue } from '@/components/location-picker';
import { Map, type MapMarker } from '@/components/map';
import { ObservationMap } from '@/components/observation-map';
import { PickerSheet, SheetActionRow } from '@/components/picker-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { RarityBadge } from '@/components/rarity-badge';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SelectRow } from '@/components/select-row';
import { Skeleton, SkeletonCard } from '@/components/skeleton';
import { SpeciesPicker } from '@/components/species-picker';
import { StateBlock } from '@/components/state-block';
import { TextField } from '@/components/text-field';
import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { SurfaceRadius } from '@/constants/surface';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode, type ThemeMode } from '@/hooks/use-theme-mode';
import { confirm } from '@/lib/confirm';
import {
  hapticCommit,
  hapticError,
  hapticPress,
  hapticSelect,
  hapticSuccess,
  hapticTick,
  hapticToggle,
  hapticWarning,
} from '@/lib/haptics';
import { type RarityLevel } from '@/lib/rarity';
import { type Activity } from '@/lib/validation/observation';

// M2 kitchen-sink: eyeballs the design tokens and primitives in light + dark.
// Dev-only reference route (reachable at /kitchensink under the signed-in gate).
// Kept as a primitives showcase for development/QA but gated behind `__DEV__`, so
// it can never be reached in a production build. All copy is Swedish.

const TYPE_LADDER: NonNullable<ThemedTextProps['type']>[] = [
  'display',
  'title',
  'subtitle',
  'card',
  'heading',
  'eyebrow',
  'default',
  'smallBold',
  'small',
  'link',
  'linkPrimary',
  'code',
  'micro',
];

const MODES: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Ljust' },
  { mode: 'dark', label: 'Mörkt' },
];

// Two spots around Markaryd — exercises markers + fit-to-bounds (M8).
const KARTA_SPOTS: MapMarker[] = [
  { id: 'centrum', latitude: 56.46, longitude: 13.6, label: 'Markaryd centrum' },
  { id: 'horlinge', latitude: 56.49, longitude: 13.55, label: 'Hörlinge ängar' },
];

function ThemeModeToggle() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  return (
    <View style={[styles.segment, { backgroundColor: theme.muted, borderColor: theme.border }]}>
      {MODES.map(({ mode: m, label }) => {
        const active = m === mode;
        return (
          <PressableScale
            key={m}
            variant="button"
            haptic="select"
            onPress={() => setMode(m)}
            style={[styles.segmentItem, active && { backgroundColor: theme.card }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <ThemedText type="smallBold" themeColor={active ? 'foreground' : 'mutedForeground'}>
              {label}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function KitchenSink() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  // Confirm/action-sheet demo state.
  const [choice, setChoice] = useState<string | null>(null);
  const [selectRow, setSelectRow] = useState<string | null>('stationär');
  const [menuDemo, setMenuDemo] = useState(false);

  // M9 form-field state.
  const [speciesId, setSpeciesId] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const [observedAt, setObservedAt] = useState(() => new Date());
  const [location, setLocation] = useState<LocationValue>({ kind: 'none' });
  const [activity, setActivity] = useState<Activity | null>(null);

  // M10 image-upload state.
  const [obsImage, setObsImage] = useState<string | null>(null);

  // Dev-only showcase — never reachable in a production build.
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen keyboardAware>
      <SectionHeader
        title="Markaryds Fågelklubb"
        caption="Designsystem — tema, typografi och komponenter (M2)"
        level="card"
      />

      <View style={styles.section}>
        <SectionHeader title="Tema" />
        <ThemeModeToggle />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Typografi" />
        <View style={styles.ladder}>
          {TYPE_LADDER.map((t) => (
            <ThemedText key={t} type={t}>
              {t}
            </ThemedText>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Knappar" />
        <Button title="Primär" variant="primary" onPress={hapticPress} />
        <Button title="Sekundär" variant="secondary" onPress={hapticPress} />
        <Button title="Accent" variant="tint" onPress={hapticPress} />
        <Button title="Radera" variant="destructive" haptic="commit" onPress={hapticPress} />
        <Button title="Kompakt" variant="primary" size="compact" onPress={hapticPress} />
        <Button
          title={saving ? 'Sparar…' : 'Spara (laddar 1,2 s)'}
          variant="primary"
          loading={saving}
          onPress={() => {
            setSaving(true);
            setTimeout(() => setSaving(false), 1200);
          }}
        />
        <Button title="Inaktiverad" variant="primary" disabled />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Inmatning" caption="Fokus = grön kant, fel = röd kant + haptik" />
        <TextField
          label="Visningsnamn"
          placeholder="Ditt namn"
          value={name}
          onChangeText={setName}
          error={showError ? 'Visningsnamn krävs' : null}
        />
        <Button
          title={showError ? 'Rensa fel' : 'Visa fel'}
          variant="secondary"
          size="compact"
          onPress={() => setShowError((v) => !v)}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Listrader" />
        <ListCard title="Steglits" metadata="3 · Förbiflygande" onPress={hapticPress} />
        <ListCard
          title="Större hackspett"
          subtitle="Dendrocopos major"
          metadata="1 · Stationär"
          onPress={hapticPress}
        />
        <ListCard
          title="Sjöfågeltornet"
          density="compact"
          trailing={
            <ThemedText type="small" themeColor="mutedForeground">
              Sparad
            </ThemedText>
          }
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Valrader"
          caption="Enkelval i väljarblad — samma geometri som inställningsrader"
        />
        <SelectRow
          label="Stationär"
          selected={selectRow === 'stationär'}
          onPress={() => setSelectRow('stationär')}
        />
        <SelectRow
          label="Steglits"
          secondary="Carduelis carduelis"
          size="tall"
          leading={<RarityBadge level={3} />}
          selected={selectRow === 'steglits'}
          onPress={() => setSelectRow('steglits')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Raritet" caption="0 = raraste → 5 = vanligast · sm / lg / custom" />
        <View style={styles.rarityRow}>
          {([0, 1, 2, 3, 4, 5] as RarityLevel[]).map((level) => (
            <RarityBadge key={level} level={level} />
          ))}
        </View>
        <View style={styles.rarityRow}>
          <RarityBadge level={0} size="lg" />
          <RarityBadge
            custom={{ label: '–', background: theme.border, foreground: theme.mutedForeground }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Bekräfta"
          caption="confirm() — systemets egen dialog (UIAlertController / Material AlertDialog)"
        />
        <Button
          title="Bekräfta (vanlig)"
          variant="secondary"
          onPress={() =>
            void confirm({ title: 'Logga ut?', confirmLabel: 'Logga ut' }).then((ok) =>
              setChoice(ok ? 'bekräftad' : 'avbruten'),
            )
          }
        />
        <Button
          title="Bekräfta (destruktiv)"
          variant="secondary"
          onPress={() =>
            void confirm({
              title: 'Ta bort observationen?',
              message: 'Detta går inte att ångra.',
              confirmLabel: 'Ta bort',
              destructive: true,
            }).then((ok) => setChoice(ok ? 'bekräftad' : 'avbruten'))
          }
        />
        <ThemedText type="small" themeColor="mutedForeground">
          {choice ? `Senaste val: ${choice}` : 'Inget val gjort än.'}
        </ThemedText>
        <Button title="Åtgärdsark" variant="secondary" onPress={() => setMenuDemo(true)} />
        <PickerSheet visible={menuDemo} title="Åtgärder" onClose={() => setMenuDemo(false)}>
          <View style={styles.sheetBody}>
            <SheetActionRow icon={FLAG} label="Rapportera" onPress={() => setMenuDemo(false)} />
            <SheetActionRow
              icon={BLOCKED}
              label="Dölj fynd"
              destructive
              onPress={() => setMenuDemo(false)}
            />
          </View>
        </PickerSheet>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Tillstånd" />
        <SkeletonCard />
        <View style={styles.skeletonRow}>
          <Skeleton width={120} />
          <Skeleton width={64} />
        </View>
        <StateBlock
          icon={TRAY}
          title="Inga observationer än"
          message="Rapporterade fåglar dyker upp här."
        />
        <StateBlock
          icon={ALERT}
          tone="error"
          title="Kunde inte ladda"
          message="Kontrollera din anslutning och försök igen."
          action={{ label: 'Försök igen', onPress: hapticPress }}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Karta" caption="Tryck för att markera · dra nålen · förstora (M8)" />
        <Map
          markers={KARTA_SPOTS}
          markerDraggable
          onPick={(lat, lng) => setPicked(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)}
          height={220}
        />
        <ThemedText type="small" themeColor="mutedForeground">
          {picked ? `Vald punkt: ${picked}` : 'Ingen punkt vald än.'}
        </ThemedText>
        <ObservationMap latitude={56.46} longitude={13.6} label="Markaryd centrum" />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Formulärfält (M9)"
          caption="Art · antal · tid · plats · aktivitet — byggstenarna till rapportformuläret"
        />
        <SpeciesPicker value={speciesId} onChange={setSpeciesId} />
        <CountStepper value={count} onChange={setCount} />
        <DateTimePicker value={observedAt} onChange={setObservedAt} />
        <ActivityPicker value={activity} onChange={setActivity} />
        <LocationPicker value={location} onChange={setLocation} />
        <ThemedText type="small" themeColor="mutedForeground">
          {`art: ${speciesId ?? '–'} · antal: ${count} · aktivitet: ${activity ?? '–'} · plats: ${location.kind}`}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Bild (M10)"
          caption="Ta foto eller välj ur galleriet · komprimeras och laddas upp"
        />
        <ImageUpload value={obsImage} onChange={setObsImage} purpose="observation" shape="rectangle" />
        <ThemedText type="small" themeColor="mutedForeground">
          {obsImage ? `Sökväg: ${obsImage}` : 'Ingen bild uppladdad än.'}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Haptik"
          caption="Hela registret — iOS-generatorer / Android AndroidHaptics. Känn efter på enhet."
        />
        <Button title="Tick (ratchet)" variant="secondary" size="compact" onPress={hapticTick} />
        <Button title="Tryck (press)" variant="secondary" size="compact" onPress={hapticPress} />
        <Button title="Val (select)" variant="secondary" size="compact" onPress={hapticSelect} />
        <Button title="Växla på (toggle on)" variant="secondary" size="compact" onPress={() => hapticToggle(true)} />
        <Button title="Växla av (toggle off)" variant="secondary" size="compact" onPress={() => hapticToggle(false)} />
        <Button title="Bekräfta (commit)" variant="secondary" size="compact" onPress={hapticCommit} />
        <Button title="Lyckades (success)" variant="secondary" size="compact" onPress={hapticSuccess} />
        <Button title="Varning (warning)" variant="secondary" size="compact" onPress={hapticWarning} />
        <Button title="Fel (error)" variant="secondary" size="compact" onPress={hapticError} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  ladder: { gap: Spacing.one },
  segment: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.half,
    borderRadius: SurfaceRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SurfaceRadius.xs,
  },
  skeletonRow: { flexDirection: 'row', gap: Spacing.two },
  rarityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sheetBody: { gap: Spacing.two, paddingTop: Spacing.one },
});
