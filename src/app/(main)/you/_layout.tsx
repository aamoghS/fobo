import { Stack } from 'expo-router';

// Profile and its sub-screens keep the bottom nav, as drawn.
export default function YouLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
