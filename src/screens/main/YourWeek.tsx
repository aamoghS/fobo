import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { WeekShelf } from '@/components/WeekShelf';
import { useLiveScreen } from '@/data/live';
import { week } from '@/data/week';
import { hours, weekdayLong, weekRange } from '@/lib/format';
import { plansLeftToday, shelfDays, todayIso } from '@/lib/week';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Your week (439:2323). */
export function YourWeek() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const left = plansLeftToday();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            Your week
          </Text>
          <Text style={[type.sub, styles.muted]}>{weekRange(week.start, week.end)}</Text>
        </View>
        <IconButton icon="calendar" label="Calendar" />
      </View>

      <View style={styles.overview}>
        <WeekShelf days={shelfDays()} />

        <View style={styles.summary}>
          <View style={styles.remaining}>
            <Text style={[type.sub, styles.muted]}>{weekdayLong(todayIso)}</Text>
            <Text style={[type.title, styles.ink]} numberOfLines={1}>{`${left} ${left === 1 ? 'plan' : 'plans'} left`}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.personal}>
            <Text style={[type.sub, styles.muted]}>Time for you</Text>
            <Text style={[type.title, styles.ink]}>{hours(week.personalHours)}</Text>
          </View>
        </View>

        {/* Figma reads "Weight a plan"; DESIGN.md §5 flags it as a typo. */}
        <Button label="Weigh a plan" trailingArrow style={styles.weigh} onPress={() => router.push('/weigh')} />
      </View>

      <View style={styles.upNext}>
        <Text accessibilityRole="header" style={[type.title, styles.ink]}>
          Up next
        </Text>
        <View style={styles.divider2} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${week.upNext.title}, ${week.upNext.when}`}
          onPress={() => router.navigate('/plans')}
          style={styles.nextRow}>
          <View style={styles.avatar}>
            <PaperSpirit mood="work" size={46} />
          </View>
          <View style={styles.nextText}>
            <View style={styles.nextLines}>
              <Text style={[type.bodyStrong, styles.ink]}>{week.upNext.title}</Text>
              <Text style={[type.sub, styles.muted]}>{week.upNext.when}</Text>
            </View>
            <Icon name="chevron" size={19} color={color.ink2} />
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Design system (1:6): 20 side margin, 8 / 16 / 28 rhythm, r-row cards with the soft shadow.
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heading: { flex: 1, gap: space[4] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  overview: {
    marginTop: space[28],
    paddingTop: space[28],
    paddingBottom: space[16],
    paddingHorizontal: space[16],
    borderRadius: radius.row,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
  },
  summary: {
    paddingTop: space[16],
    paddingBottom: space[20],
    gap: space[20],
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  remaining: { minWidth: 150, gap: space[4] },
  divider: { width: 1, backgroundColor: color.rule },
  personal: { flex: 1, gap: space[4] },
  weigh: { alignSelf: 'stretch' },
  upNext: { paddingTop: space[28], gap: space[16] },
  divider2: { height: 1, backgroundColor: color.rule },
  nextRow: { minHeight: 56, gap: space[16], flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: color.tintSky,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nextText: {
    flex: 1,
    paddingVertical: space[16],
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  nextLines: { flex: 1 },
});
