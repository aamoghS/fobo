import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { signOut, useLiveScreen } from '@/data/live';
import { profile, settingsRows } from '@/data/profile';
import { API_URL } from '@/lib/api';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Settings (443:3555). The rows have no screens behind them yet. */
export function Settings() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 42) }]}>
      <Text accessibilityRole="header" style={[type.display, styles.ink]}>
        Settings
      </Text>
      <View style={styles.rows}>
        {settingsRows.map((label) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={label === 'Privacy Policy' ? () => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`) : undefined}
            style={styles.row}>
            <Text style={[type.bodyStrong, styles.ink]}>{label}</Text>
            <Icon name="chevron" />
          </Pressable>
        ))}
      </View>
      <View style={styles.account}>
        <Text style={[type.subStrong, styles.ink, styles.center]}>Logged in as</Text>
        <Text style={[type.foot, styles.ink, styles.center]}>{profile.email}</Text>
        {/* Figma draws this in Google blue (#1a73e8); it stays ink, since colour isn't for chrome. */}
        <Button label="Log out" size="compact" style={styles.logout} onPress={() => {
            signOut();
            router.replace('/welcome');
          }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: 21, paddingBottom: 120 },
  ink: { color: color.ink },
  center: { textAlign: 'center' },
  rows: { marginTop: 20, gap: 21 },
  row: {
    height: 61,
    paddingLeft: 21,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    backgroundColor: color.fill,
  },
  account: { marginTop: 74, alignSelf: 'center', width: 283, gap: 8 },
  logout: { height: 44, marginTop: 0 },
});
