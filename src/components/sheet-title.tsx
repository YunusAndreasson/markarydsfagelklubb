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
import { Platform } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function SheetTitle({ title }: { title: string | null | undefined }) {
  // iOS shows it in the native sheet header.
  if (Platform.OS === 'ios' || !title) return null;

  return (
    <ThemedText type="heading" numberOfLines={2} accessibilityRole="header">
      {title}
    </ThemedText>
  );
}
