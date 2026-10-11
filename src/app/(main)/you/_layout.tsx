import { Stack } from 'expo-router';

// Profile and its sub-screens keep the bottom nav, as drawn.
export default function YouLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      {/* No swipe back on Edit Character: dragging the height slider would leave the screen. It has a back button. */}
      <Stack.Screen name="character" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
