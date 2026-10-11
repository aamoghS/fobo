import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { NavFade } from '@/components/NavFade';
import { PlanLine } from '@/components/PlanLine';
import { Pressable } from '@/components/Pressable';
import { scrapColor } from '@/components/Scrap';
import { useLiveScreen } from '@/data/live';
import { NOW, week } from '@/data/week';
import type { Plan } from '@/features/plans/types';
import { dateTile, daysBetween, timeRange, weekdayInitial, weekRange } from '@/lib/format';
import { dayLoadOn, plansOn, todayIso } from '@/lib/week';
import { color, radius, space } from '@/styles/tokens';
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
  const days = daysBetween(todayIso, week.end);
  const open = (p: Plan) => router.push({ pathname: '/plans/[id]', params: { id: p.id } });
  const calendar = useCalendar(open);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}
        stickyHeaderIndices={[1]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[type.display, styles.ink]}>
              Plans
            </Text>
            <Text style={[type.sub, styles.muted]}>{weekRange(week.start, week.end)}</Text>
          </View>
          <IconButton icon="plus" label="Weigh a plan" onPress={() => router.push('/weigh')} />
        </View>

        {/* Sticks to the top in both views; in calendar view the day headings stick with it. */}
        <View style={styles.sticky}>
          <View style={styles.toggle} accessibilityRole="tablist">
            <Segment label="Agenda" active={view === 'agenda'} onPress={() => setView('agenda')} />
            <Segment label="Calendar" active={view === 'calendar'} onPress={() => setView('calendar')} />
          </View>
          {view === 'calendar' && calendar.header}
        </View>

        {view === 'agenda' ? <Agenda days={days} onOpen={open} /> : calendar.grid}
      </ScrollView>
      <NavFade color={color.ground} />
    </View>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.segment, active && styles.segmentOn]}>
      <Text style={[type.subStrong, active ? styles.selInk : styles.ink]}>{label}</Text>
    </Pressable>
  );
}

/** The rest of the week, a section per day: "WED 7" with its load, then a card of plans. */
function Agenda({ days, onOpen }: { days: string[]; onOpen: (p: Plan) => void }) {
  return (
    <>
      {days.map((date) => {
        const list = plansOn(date);
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

  // Open on today, both rows together.
  useEffect(() => {
    const x = startAt * colW;
    requestAnimationFrame(() => {
      body.current?.scrollTo({ x, animated: false });
      head.current?.scrollTo({ x, animated: false });
    });
  }, [startAt, colW]);

  const snap = {
    horizontal: true,
    showsHorizontalScrollIndicator: false,
    // Three days at a time.
    snapToInterval: pageW,
    decelerationRate: 'fast' as const,
    disableIntervalMomentum: true,
  };

  const header = (
    <View style={styles.calHead}>
      <View style={styles.gutter} />
      <ScrollView ref={head} {...snap} scrollEnabled={false} style={styles.strip}>
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
        ref={body}
        {...snap}
        style={styles.columns}
        scrollEventThrottle={16}
        onScroll={(e) => head.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false })}>
        {days.map((date) => (
          <View key={date} style={[styles.calCol, days.indexOf(date) % PAGE === 0 && styles.snap, { width: colW, height: gridH }]}>
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
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 200 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  selInk: { color: color.selInk },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heading: { gap: space[4] },
  // Same segmented toggle as Weigh a plan.
  sticky: { paddingTop: space[12], paddingBottom: space[4], backgroundColor: color.ground },
  toggle: { padding: space[4], flexDirection: 'row', borderRadius: radius.full, backgroundColor: color.fill },
  segment: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  segmentOn: { backgroundColor: color.selBg },
  dayHead: { paddingTop: space[28], paddingBottom: space[12], flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  // Full-bleed, with the ground behind it so the hours pass under it when it sticks.
  calHead: { marginTop: space[12], marginBottom: -space[4], marginHorizontal: -space.margin, paddingTop: space[8], paddingBottom: space[8], flexDirection: 'row', backgroundColor: color.ground, borderBottomWidth: 1, borderBottomColor: color.rule },
  strip: { flex: 1 },
  calDay: { alignItems: 'center', gap: 2 },
  dateDot: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  dateDotOn: { backgroundColor: color.selBg },
  // Web: snap to the first day of each page of three (native uses snapToInterval).
  snap: { scrollSnapAlign: 'start' } as object,
  calBody: { marginTop: space[12], marginHorizontal: -space.margin },
  gutter: { width: GUTTER },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  // Figma sets these at 11; the ramp's smallest is 13, too wide for the gutter.
  hour: { width: GUTTER, paddingRight: space[8], textAlign: 'right', fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 14, marginTop: -14 },
  hourLine: { flex: 1, height: 1, backgroundColor: color.rule },
  columns: { position: 'absolute', top: 0, bottom: 0, left: GUTTER, right: 0, scrollSnapType: 'x mandatory' } as object,
  calCol: { borderLeftWidth: 1, borderLeftColor: color.rule },
  event: { position: 'absolute', left: 3, right: 3, paddingHorizontal: space[8], paddingVertical: 6, gap: 2, borderRadius: radius.sm, overflow: 'hidden' },
  // Half-hour blocks: just the title, centred, so it isn't clipped.
  eventShort: { paddingVertical: 0, justifyContent: 'center' },
  eventText: { color: color.selInk },
  eventTime: { color: color.selInk, opacity: 0.8 },
  now: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.ink },
  nowDot: { position: 'absolute', left: -4, top: -3.5, width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.ink },
});
