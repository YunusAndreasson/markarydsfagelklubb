import { Stack } from 'expo-router';

// Signed-out stack. The sign-in screen carries its own chrome, so the native
// header stays hidden.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
