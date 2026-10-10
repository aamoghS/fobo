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
import { color, radius, shadow } from '@/styles/tokens';
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
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 58) }]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[type.heroScreen, styles.strong]}>
            Your week
          </Text>
          <Text style={[type.body, styles.muted]}>{weekRange(week.start, week.end)}</Text>
        </View>
        <IconButton icon="calendar" label="Calendar" size={47} iconSize={24} />
      </View>

      <View style={styles.overview}>
        <WeekShelf days={shelfDays()} />

        <View style={styles.summary}>
          <View style={styles.remaining}>
            <Text style={[type.sub, styles.muted]}>{weekdayLong(todayIso)}</Text>
            <Text style={[type.stat, styles.strong]} numberOfLines={1}>{`${left} ${left === 1 ? 'plan' : 'plans'} left`}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.personal}>
            <Text style={[type.sub, styles.muted]}>Time for you</Text>
            <Text style={[type.stat, styles.strong]}>{hours(week.personalHours)}</Text>
          </View>
        </View>

        {/* Figma reads "Weight a plan"; DESIGN.md §5 flags it as a typo. */}
        <Button label="Weigh a plan" trailingArrow style={styles.weigh} />
      </View>

      <View style={styles.upNext}>
        <Text accessibilityRole="header" style={[type.title, styles.strong]}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.groundAlt },
  content: { paddingHorizontal: 15, paddingBottom: 120 },
  header: {
    height: 96,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heading: { flex: 1, paddingTop: 3 },
  strong: { color: color.inkStrong },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  overview: {
    paddingTop: 34,
    paddingBottom: 15,
    paddingHorizontal: 18,
    borderRadius: radius.row,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
  },
  summary: {
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 2,
    gap: 26,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  remaining: { minWidth: 150, gap: 1 },
  divider: { width: 1, height: 43, backgroundColor: color.divider },
  personal: { flex: 1, gap: 1 },
  weigh: { alignSelf: 'stretch' },
  upNext: { paddingTop: 27, paddingHorizontal: 6, gap: 16 },
  divider2: { height: 1, backgroundColor: color.divider },
  nextRow: { minHeight: 56, gap: 20, flexDirection: 'row', alignItems: 'center' },
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
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  nextLines: { flex: 1 },
});
