import { Stack } from 'expo-router';

// People detail (387:1613) keeps the bottom nav, so it stacks inside the People tab.
export default function PeopleLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none', gestureEnabled: false, fullScreenGestureEnabled: false }} />;
}
