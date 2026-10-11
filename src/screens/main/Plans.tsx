import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { NavFade } from '@/components/NavFade';
import { PlanLine } from '@/components/PlanLine';
import { Pressable } from '@/components/Pressable';
import { scrapColor } from '@/components/Scrap';
import { Segmented } from '@/components/Segmented';
import { useLiveScreen } from '@/data/live';
import { NOW, week } from '@/data/week';
import type { Plan } from '@/features/plans/types';
import { dateTile, daysBetween, timeRange, weekdayInitial, weekRange } from '@/lib/format';
import { dayLoadOn, plansOn, todayIso } from '@/lib/week';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

type View_ = 'agenda' | 'calendar';

/** Plans: the rest of the week as an agenda, or three days as a calendar. Simplified from Tory's references. */
export function Plans() {
  'use no memo'; // Reads the in-memory sample data, which changes without new props; see live.ts.
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>('calendar');
  // The agenda lists each day by time, or with the plans that take the most first.
  const [heaviest, setHeaviest] = useState(false);
  const days = daysBetween(todayIso, week.end);
  // Earlier this week, most recent first.
  const pastDays = daysBetween(week.start, todayIso).reverse();
  const open = (p: Plan) => router.push({ pathname: '/plans/[id]', params: { id: p.id } });
  const calendar = useCalendar(open);
  const add = () => router.push('/plans/new');

  // Once Add plan scrolls out of view, a round add button floats in at the bottom right.
  const headerBottom = useRef(0);
  const [floating, setFloating] = useState(false);
  const fab = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fab, { toValue: floating ? 1 : 0, friction: 7, tension: 140, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [floating, fab]);

  return (
    // The scroll starts below the status bar, so what sticks stays in view under it.
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(space[48] - insets.top, space[8]) }]}
        // The Agenda / Calendar toggle sticks at the top, with the day headings under it in Calendar.
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const out = e.nativeEvent.contentOffset.y > headerBottom.current;
          if (out !== floating) setFloating(out);
        }}>
        <View style={styles.header} onLayout={(e) => (headerBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[type.display, styles.ink]}>
              Plans
            </Text>
            <Text style={[type.sub, styles.muted]}>{weekRange(week.start, week.end)}</Text>
          </View>
          <Button label="Add plan" icon="plus" size="compact" style={styles.add} onPress={add} />
        </View>

        <View style={[styles.sticky, view === 'agenda' && styles.stickyAgenda]}>
          <Segmented
            options={[
              { key: 'agenda', label: 'Agenda' },
              { key: 'calendar', label: 'Calendar' },
            ]}
            value={view}
            onChange={setView}
          />
          {view === 'calendar' && calendar.header}
        </View>

        {view === 'agenda' && (
          <View style={styles.sortRow}>
            <Text accessibilityRole="header" style={[type.title, styles.ink]}>
              Upcoming events
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={heaviest ? 'Sort by time' : 'Sort by energy, heaviest first'}
              onPress={() => setHeaviest((v) => !v)}
              hitSlop={12}
              style={styles.sort}>
              <Icon name="sort" size={17} color={color.ink2} />
              <Text style={[type.label, styles.muted]}>Sort</Text>
            </Pressable>
          </View>
        )}
        {view === 'agenda' && <Agenda days={days} heaviest={heaviest} onOpen={open} />}
        {view === 'agenda' && (
          <>
            <Text accessibilityRole="header" style={[type.title, styles.ink, styles.pastHead]}>
              Past events
            </Text>
            <Agenda days={pastDays} heaviest={heaviest} past onOpen={open} />
          </>
        )}
        {view === 'calendar' && calendar.grid}
      </ScrollView>
      <NavFade color={color.ground} />
      <Animated.View
        pointerEvents={floating ? 'box-none' : 'none'}
        importantForAccessibility={floating ? 'auto' : 'no-hide-descendants'}
        // Just above the nav bar (64 tall, floating 20 up or on the home indicator).
        style={[styles.fab, { bottom: Math.max(insets.bottom, 20) + 64 + space[12], opacity: fab, transform: [{ scale: fab.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Add plan" onPress={add} style={styles.fabButton}>
          <Icon name="plus" color={color.selInk} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Plans a section per day: "WED 7" with its load, then its plans. Upcoming lists the rest of the week
 * (plans that haven't ended); `past` lists the ones that have, skipping days with none.
 */
function Agenda({ days, heaviest, past = false, onOpen }: { days: string[]; heaviest: boolean; past?: boolean; onOpen: (p: Plan) => void }) {
  const sections = days
    .map((date) => {
      const byTime = plansOn(date).filter((p) => (past ? p.end <= NOW : p.end > NOW));
      return { date, list: heaviest ? [...byTime].sort((a, b) => b.energyCost - a.energyCost) : byTime };
    })
    .filter((d) => !past || d.list.length > 0);

  if (past && sections.length === 0) return <Text style={[type.sub, styles.muted, styles.pastNone]}>Nothing earlier this week.</Text>;

  return (
    <>
      {sections.map(({ date, list }) => {
        const tile = dateTile(date);
        return (
          <View key={date}>
            <View style={styles.dayHead}>
              <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>{`${tile.weekday} ${tile.day}`}</Text>
              <Text style={[type.foot, styles.muted]}>
                Day load <Text style={[type.label, styles.ink]}>{`${dayLoadOn(date)}/${DAY_ROOM}`}</Text>
              </Text>
            </View>
            {list.length === 0 ? (
              <Text style={[type.sub, styles.muted]}>Nothing planned</Text>
            ) : (
              <View>
                {list.map((p, i) => (
                  <PlanLine key={p.id} plan={p} first={i === 0} onPress={() => onOpen(p)} />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const HOUR_H = 40;
const GUTTER = 44;
const minutes = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

const PAGE = 3;
const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Days the calendar swipes through, in pages of three that start on today: one page back, four ahead. */
function calendarDays() {
  return daysBetween(shift(todayIso, -PAGE), shift(todayIso, PAGE * 4 - 1));
}

/**
 * The calendar (after Figma 206:3859): three days wide on one time grid, swiping sideways a day at a
 * time like Google Calendar's 3-day view, opening on today. Its heading row (day, date, load) is a
 * separate piece so it can stick to the top while you scroll the hours; it follows the swipe.
 */
function useCalendar(onOpen: (p: Plan) => void) {
  const { width } = useWindowDimensions();
  // The app is a column of at most 430 (see app/_layout.tsx).
  const colW = Math.floor((Math.min(width, 430) - GUTTER) / 3);
  const days = calendarDays();
  const startAt = Math.max(0, days.indexOf(todayIso));
  const pageW = colW * PAGE;
  const head = useRef<ScrollView>(null);
  const body = useRef<ScrollView>(null);

  const all = days.flatMap(plansOn);
  const first = Math.min(7, ...all.map((p) => Math.floor(minutes(p.start) / 60)));
  const last = Math.max(21, ...all.map((p) => Math.ceil(minutes(p.end) / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const gridH = hours.length * HOUR_H;
  const nowY = ((minutes(NOW) - first * 60) / 60) * HOUR_H;

  // Open on today's page, both rows together. `contentOffset` places it on iOS and Android; the web
  // scrolls there once the columns have a width. A new grid (back from Agenda) opens on today again.
  const todayX = startAt * colW;
  const opened = useRef(false);
  const openOnToday = (contentW: number) => {
    if (opened.current || contentW < todayX + pageW) return;
    opened.current = true;
    page.current = startAt / PAGE;
    body.current?.scrollTo({ x: todayX, animated: false });
    head.current?.scrollTo({ x: todayX, animated: false });
  };
  const bodyRef = (view: ScrollView | null) => {
    if (view && view !== body.current) opened.current = false;
    body.current = view;
  };

  // Web paging: when a swipe settles, click into the next page of three (or back), or return if
  // the swipe was only a nudge. Native gets the same from snapToInterval + disableIntervalMomentum.
  const page = useRef(startAt / PAGE);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastPage = Math.ceil(days.length / PAGE) - 1;
  const onWebScroll = (x: number) => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const moved = x - page.current * pageW;
      const step = moved > pageW * 0.15 ? Math.max(1, Math.round(moved / pageW)) : moved < -pageW * 0.15 ? Math.min(-1, Math.round(moved / pageW)) : 0;
      page.current = Math.min(lastPage, Math.max(0, page.current + step));
      body.current?.scrollTo({ x: page.current * pageW, animated: true });
    }, 90);
  };

  const snap = {
    horizontal: true,
    showsHorizontalScrollIndicator: false,
    // Three days at a time, one page per swipe.
    snapToInterval: pageW,
    decelerationRate: 'fast' as const,
    disableIntervalMomentum: true,
  };

  const header = (
    <View style={styles.calHead}>
      <View style={styles.gutter} />
      <ScrollView ref={head} {...snap} scrollEnabled={false} contentOffset={{ x: todayX, y: 0 }} style={{ width: pageW }}>
        {days.map((date) => {
          const tile = dateTile(date);
          const isToday = date === todayIso;
          return (
            <View key={date} style={[styles.calDay, { width: colW }]}>
              <Text style={[type.foot, isToday ? styles.ink : styles.muted]}>{weekdayInitial(date)}</Text>
              <View style={[styles.dateDot, isToday && styles.dateDotOn]}>
                <Text style={[type.bodyStrong, isToday ? styles.selInk : styles.ink]}>{tile.day}</Text>
              </View>
              <Text style={[type.foot, styles.muted]}>{`${dayLoadOn(date)}/${DAY_ROOM}`}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const grid = (
    <View style={[styles.calBody, { height: gridH }]}>
      {hours.map((h) => (
        <View key={h} style={[styles.hourRow, { top: (h - first) * HOUR_H }]}>
          <Text style={[styles.hour, styles.muted]}>{hourLabel(h)}</Text>
          <View style={styles.hourLine} />
        </View>
      ))}
      <ScrollView
        ref={bodyRef}
        {...snap}
        contentOffset={{ x: todayX, y: 0 }}
        style={[styles.columns, { width: pageW }]}
        onContentSizeChange={(w) => openOnToday(w)}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          head.current?.scrollTo({ x, animated: false });
          if (Platform.OS === 'web' && opened.current) onWebScroll(x);
        }}>
        {days.map((date) => (
          <View key={date} style={[styles.calCol, { width: colW, height: gridH }]}>
            {plansOn(date).map((p) => {
              const top = ((minutes(p.start) - first * 60) / 60) * HOUR_H;
              const height = Math.max(((minutes(p.end) - minutes(p.start)) / 60) * HOUR_H - 2, 20);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.title}, ${timeRange(p.start, p.end)}`}
                  onPress={() => onOpen(p)}
                  style={[styles.event, height < 32 && styles.eventShort, { top, height, backgroundColor: scrapColor[p.kind] }]}>
                  <Text style={[type.label, styles.eventText]} numberOfLines={height >= 56 ? 2 : 1}>
                    {p.title}
                  </Text>
                  {height >= 52 && (
                    <Text style={[type.foot, styles.eventTime]} numberOfLines={1}>
                      {timeRange(p.start, p.end)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            {date === todayIso && nowY >= 0 && nowY <= gridH && (
              <View pointerEvents="none" style={[styles.now, { top: nowY }]}>
                <View style={styles.nowDot} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return { header, grid };
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: space.margin },
  fabButton: { width: 56, height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.selBg, boxShadow: shadow.lift },
  // An ink pill so the main action stands out, the height of an IconButton.
  add: { height: 44, paddingLeft: space[12], paddingRight: space[16], gap: space[8] },
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 200 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  selInk: { color: color.selInk },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heading: { gap: space[4] },
  // Full-bleed with the ground behind it, so the page passes under it when it sticks.
  sticky: { marginHorizontal: -space.margin, paddingHorizontal: space.margin, paddingTop: space[20], backgroundColor: color.ground },
  // The calendar's day headings bring their own bottom space and rule.
  stickyAgenda: { paddingBottom: space[12] },
  // Laid out like Your circle and its Sort on People.
  sortRow: { marginTop: space[20], marginBottom: -space[8], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pastHead: { marginTop: space[48], marginBottom: -space[8] },
  pastNone: { marginTop: space[28] },
  sort: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  dayHead: { paddingTop: space[28], paddingBottom: space[12], flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  // Full-bleed, with the ground behind it so the hours pass under it when it sticks.
  calHead: { marginTop: space[16], marginHorizontal: -space.margin, paddingTop: space[8], paddingBottom: space[8], flexDirection: 'row', backgroundColor: color.ground, borderBottomWidth: 1, borderBottomColor: color.rule },
  calDay: { alignItems: 'center', gap: 2 },
  dateDot: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  dateDotOn: { backgroundColor: color.selBg },
  calBody: { marginTop: space[12], marginHorizontal: -space.margin },
  gutter: { width: GUTTER },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  // Figma sets these at 11; the ramp's smallest is 13, too wide for the gutter.
  hour: { width: GUTTER, paddingRight: space[8], textAlign: 'right', fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 14, marginTop: -14 },
  hourLine: { flex: 1, height: 1, backgroundColor: color.rule },
  columns: { position: 'absolute', top: 0, bottom: 0, left: GUTTER },
  calCol: { borderLeftWidth: 1, borderLeftColor: color.rule },
  event: { position: 'absolute', left: 3, right: 3, paddingHorizontal: space[8], paddingVertical: 6, gap: 2, borderRadius: radius.sm, overflow: 'hidden' },
  // Half-hour blocks: just the title, centred, so it isn't clipped.
  eventShort: { paddingVertical: 0, justifyContent: 'center' },
  eventText: { color: color.selInk },
  eventTime: { color: color.selInk, opacity: 0.8 },
  now: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.ink },
  nowDot: { position: 'absolute', left: -4, top: -3.5, width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.ink },
});
