import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { Medal } from '@/components/Medal';
import { useLiveScreen } from '@/data/live';
import { achievements, allAchievements } from '@/data/profile';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Every achievement, from Profile's "See all": what you've unlocked, then what's still to earn. */
export function Achievements() {
  const router = useRouter();
  useLiveScreen();
  const insets = useSafeAreaInsets();
  const earned = new Set(achievements.map((a) => a.id));
  const got = allAchievements.filter((a) => earned.has(a.id));
  const left = allAchievements.filter((a) => !earned.has(a.id));

  const section = (title: string, list: typeof allAchievements, locked: boolean) =>
    list.length > 0 && (
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>
          {title}
        </Text>
        <View style={styles.card}>
          {list.map((a, i) => (
            <View
              key={a.id}
              accessible
              accessibilityLabel={`${a.title}, ${locked ? 'locked' : 'unlocked'}. ${a.how}`}
              style={[styles.row, i < list.length - 1 && styles.rule]}>
              <Medal badge={a.badge} icon={a.icon} size={56} locked={locked} />
              <View style={styles.rowText}>
                <Text style={[type.bodyStrong, locked ? styles.muted : styles.ink]}>{a.title}</Text>
                <Text style={[type.foot, styles.muted]}>{a.how}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>
      <View style={styles.back}>
        <IconButton icon="back" label="Back" iconSize={24} onPress={() => router.back()} />
      </View>
      <Text accessibilityRole="header" style={[type.display, styles.ink]}>
        Achievements
      </Text>
      <Text style={[type.sub, styles.muted]}>{`${got.length} of ${allAchievements.length} unlocked`}</Text>
      {section('Unlocked', got, false)}
      {section('To unlock', left, true)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 120, gap: space[4] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  back: { marginLeft: -10, marginBottom: space[12], alignSelf: 'flex-start' },
  section: { marginTop: space[28], gap: space[12] },
  card: { paddingHorizontal: space[16], borderRadius: radius.panel, backgroundColor: color.fill },
  row: { paddingVertical: space[12], gap: space[16], flexDirection: 'row', alignItems: 'center' },
  rule: { borderBottomWidth: 1, borderBottomColor: color.divider },
  rowText: { flex: 1, gap: 2 },
});
