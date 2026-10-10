import '@/styles/tokens.css';
import '@/styles/global.css';

import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_900Black } from '@expo-google-fonts/dm-sans/900Black';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadLive, refreshLive } from '@/data/live';
import { color } from '@/styles/tokens';

SplashScreen.preventAutoHideAsync();

// Light only. Navigation chrome takes the paper ground.
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: color.ground, card: color.ground, text: color.ink, border: color.rule },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, DMSans_900Black });
  // Real data when signed in; the mock data otherwise.
  const [data, setData] = useState(false);

  useEffect(() => {
    loadLive().catch(() => false).finally(() => setData(true));
    // Coming back to the app refreshes its data.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refreshLive());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if ((loaded || error) && data) SplashScreen.hideAsync();
  }, [loaded, error, data]);

  if ((!loaded && !error) || !data) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        {/* 393 design width; centred in a 430 column on larger screens. */}
        <View style={styles.page}>
          <View style={styles.column}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.ground } }}>
              {/* Weigh a plan is a drawer: see-through so the tab beneath stays, and it animates itself. */}
              <Stack.Screen name="weigh" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
            </Stack>
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: color.ground },
  column: { flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden' },
});
