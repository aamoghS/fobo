import '@/styles/tokens.css';
import '@/styles/global.css';

import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_900Black } from '@expo-google-fonts/dm-sans/900Black';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { color } from '@/styles/tokens';

SplashScreen.preventAutoHideAsync();

// Light only. Navigation chrome takes the paper ground.
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: color.ground, card: color.ground, text: color.ink, border: color.rule },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({ DMSans_500Medium, DMSans_700Bold, DMSans_900Black });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        {/* 393 design width; centred in a 430 column on larger screens. */}
        <View style={styles.page}>
          <View style={styles.column}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.ground } }} />
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
