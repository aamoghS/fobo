import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { PlanLine } from '@/components/PlanLine';
import { WeekShelf } from '@/components/WeekShelf';
import { useLiveScreen } from '@/data/live';
import { week } from '@/data/week';
import { dayShort, hours, weekdayLong, weekRange } from '@/lib/format';
import { dayLoadOn, plansLeftToday, plansOn, shelfDays, todayIso } from '@/lib/week';
import { DAY_ROOM } from '../../../packages/core/src';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Your week (439:2323). */
export function YourWeek() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const left = plansLeftToday();
  const [selected, setSelected] = useState(todayIso);
  const dayPlans = plansOn(selected);
  // The list fades in again for each day you pick.
  const fade = useRef(new Animated.Value(1)).current;
  const pick = (date: string) => {
    if (date === selected) return;
    setSelected(date);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

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
        <WeekShelf days={shelfDays(selected)} onSelectDay={pick} />

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
        <View style={styles.listHead}>
          <Text accessibilityRole="header" style={[type.title, styles.ink]}>
            {selected === todayIso ? 'Today' : 'Upcoming'}
          </Text>
          <Text style={[type.sub, styles.muted]}>{`${dayShort(selected)} · ${dayLoadOn(selected)}/${DAY_ROOM}`}</Text>
        </View>
        {dayPlans.length === 0 ? (
          <Text style={[type.sub, styles.muted, styles.empty]}>Nothing planned</Text>
        ) : (
          <Animated.View style={[{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>
            {dayPlans.map((p, i) => (
              <PlanLine key={p.id} plan={p} first={i === 0} onPress={() => router.push({ pathname: '/plans/[id]', params: { id: p.id } })} />
            ))}
          </Animated.View>
        )}
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
  upNext: { paddingTop: space[28], gap: space[12] },
  listHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  empty: { paddingTop: space[4] },
});
