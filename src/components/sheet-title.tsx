/**
 * The in-sheet title for `formSheet` routes.
 *
 * Sheet routes set their name via `<Stack.Screen options={{ title }} />`, which
 * renders in the native sheet header — **on iOS only**. Android formSheets have
 * no header at all (see `search-field.tsx` for the same trap), so on
 * Android that title simply never appears.
 *
 * That is survivable on a picker, where the field you just tapped tells you what
 * you are choosing. It is NOT survivable on the lokal peek: you tap one of ~60
 * near-identical map pins and the sheet has to tell you which one you got.
 *
 * So this renders the title in the sheet CONTENT on Android and nothing on iOS,
 * where the native header already shows it. Pair the two:
 *
 *     <Stack.Screen options={{ title: name }} />   // iOS
 *     <SheetTitle title={name} />                  // Android
 */
import { router } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { HeaderButton } from '@/components/header-button';
import { CLOSE } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { sv } from '@/lib/i18n/sv';

export function SheetTitle({ title }: { title: string | null | undefined }) {
  // iOS shows it in the native sheet header.
  if (Platform.OS === 'ios' || !title) return null;

  return (
    <View style={styles.row}>
      <ThemedText type="heading" numberOfLines={2} accessibilityRole="header" style={styles.title}>
        {title}
      </ThemedText>
      <HeaderButton icon={CLOSE} title={sv.common.close} onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  title: { flex: 1 },
});
