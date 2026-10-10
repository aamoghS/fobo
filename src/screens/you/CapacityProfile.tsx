import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { capacity } from '@/data/profile';
import { useCharacter } from '@/features/profile/character';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { CharacterArt } from './CharacterArt';

/** Capacity Profile (443:3680). Rows reopen the onboarding question that set them. */
export function CapacityProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const character = useCharacter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
      <View style={styles.back}>
        <IconButton icon="back" label="Back" iconSize={24} onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <CharacterArt character={character} size={155} />
        <Text accessibilityRole="header" style={[type.title, styles.ink, styles.center]}>
          Your Capacity Profile
        </Text>
        <Text style={[type.subStrong, styles.muted, styles.center]}>Here’s what you told us. Tap to change.</Text>
      </View>

      <View style={styles.card}>
        {capacity.map((row, i) => (
          <Pressable
            key={row.label}
            accessibilityRole="button"
            accessibilityLabel={`${row.label}: ${row.value}`}
            disabled={!row.step}
            onPress={() => row.step && router.push({ pathname: '/onboarding/[step]', params: { step: row.step, edit: '1' } })}
            style={[styles.row, i < capacity.length - 1 && styles.rule]}>
            <View style={styles.rowText}>
              <Text style={[type.foot, styles.muted]}>{row.label}</Text>
              <Text style={[type.bodyStrong, styles.ink]}>{row.value}</Text>
            </View>
            <Icon name="chevron" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: 32, paddingBottom: 120 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  center: { textAlign: 'center' },
  back: { position: 'absolute', left: 16, top: 21, zIndex: 1 },
  header: { alignItems: 'center', gap: 11 },
  card: {
    marginTop: 23,
    paddingTop: 19,
    paddingBottom: 17,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: color.fill,
  },
  row: { paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.ink3, paddingBottom: 16, marginBottom: 8 },
  rowText: { flex: 1, gap: 6 },
});
