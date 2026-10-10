import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { NavFade } from '@/components/NavFade';
import { PlanRow } from '@/components/PlanRow';
import { Pressable } from '@/components/Pressable';
import { scrapColor } from '@/components/Scrap';
import { useLiveScreen } from '@/data/live';
import { NOW, week } from '@/data/week';
import type { Plan } from '@/features/plans/types';
import { dateTile, daysBetween, timeRange, weekRange } from '@/lib/format';
import { dayLoadOn, plansOn, shelfDays, todayIso } from '@/lib/week';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

type View_ = 'agenda' | 'calendar';

/** Plans: the rest of the week as an agenda, or three days as a calendar. Simplified from Tory's references. */
export function Plans() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>('calendar');
  const days = daysBetween(todayIso, week.end);
  const open = (p: Plan) => router.push({ pathname: '/plans/[id]', params: { id: p.id } });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[type.display, styles.ink]}>
              Plans
            </Text>
            <Text style={[type.sub, styles.muted]}>{weekRange(week.start, week.end)}</Text>
          </View>
          <IconButton icon="plus" label="Weigh a plan" onPress={() => router.push('/weigh')} />
        </View>

        <View style={styles.toggle} accessibilityRole="tablist">
          <Segment label="Agenda" active={view === 'agenda'} onPress={() => setView('agenda')} />
          <Segment label="Calendar" active={view === 'calendar'} onPress={() => setView('calendar')} />
        </View>

        {view === 'agenda' ? <Agenda days={days} onOpen={open} /> : <Calendar onOpen={open} />}
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

/** The rest of the week as one list, as Plans first had it: date tile, title and time, energy. */
function Agenda({ days, onOpen }: { days: string[]; onOpen: (p: Plan) => void }) {
  const list = days.flatMap(plansOn).filter((p) => p.end > NOW);
  return (
    <View style={styles.agenda}>
      <View style={styles.listHead}>
        <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>
          Upcoming
        </Text>
        <Text style={[type.foot, styles.muted]}>Energy</Text>
      </View>
      {list.map((p, i) => (
        <PlanRow key={p.id} plan={p} last={i === list.length - 1} onPress={() => onOpen(p)} />
      ))}
    </View>
  );
}

const HOUR_H = 40;
const GUTTER = 44;
const minutes = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/**
 * Three days from today on one time grid (Figma 206:3859, without the characters, for room):
 * each day's date and load, solid scraps of colour for plans, and a line for now.
 */
function Calendar({ onOpen }: { onOpen: (p: Plan) => void }) {
  const days = shelfDays().filter((d) => d.date >= todayIso).slice(0, 3);
  const all = days.flatMap((d) => d.plans);
  const first = Math.min(7, ...all.map((p) => Math.floor(minutes(p.start) / 60)));
  const last = Math.max(21, ...all.map((p) => Math.ceil(minutes(p.end) / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const gridH = hours.length * HOUR_H;
  const nowY = ((minutes(NOW) - first * 60) / 60) * HOUR_H;

  return (
    <View style={styles.calendar}>
      <View style={styles.calHead}>
        <View style={styles.gutter} />
        {days.map((d) => {
          const tile = dateTile(d.date);
          return (
            <View key={d.date} style={styles.calDay}>
              <Text style={[type.foot, styles.muted]}>{d.label}</Text>
              <Text style={[type.bodyStrong, styles.ink]}>{tile.day}</Text>
              <Text style={[type.foot, styles.muted]}>{`${dayLoadOn(d.date)}/${DAY_ROOM}`}</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.calBody, { height: gridH }]}>
        {hours.map((h) => (
          <View key={h} style={[styles.hourRow, { top: (h - first) * HOUR_H }]}>
            <Text style={[styles.hour, styles.muted]}>{hourLabel(h)}</Text>
            <View style={styles.hourLine} />
          </View>
        ))}
        <View style={styles.columns}>
          {days.map((d) => (
            <View key={d.date} style={styles.calCol}>
              {d.plans.map((p) => {
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
              {d.selected && nowY >= 0 && nowY <= gridH && (
                <View pointerEvents="none" style={[styles.now, { top: nowY }]}>
                  <View style={styles.nowDot} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
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
  toggle: { marginTop: space[20], padding: space[4], flexDirection: 'row', borderRadius: radius.full, backgroundColor: color.fill },
  segment: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  segmentOn: { backgroundColor: color.selBg },
  agenda: { paddingTop: space[28], gap: space[8] },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendar: { marginTop: space[16], marginHorizontal: -space.margin },
  calHead: { flexDirection: 'row', paddingTop: space[8], paddingBottom: space[12] },
  calDay: { flex: 1, alignItems: 'center' },
  calBody: { borderTopWidth: 1, borderTopColor: color.rule },
  gutter: { width: GUTTER },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  // Figma sets these at 11; the ramp's smallest is 13, too wide for the gutter.
  hour: { width: GUTTER, paddingRight: space[8], textAlign: 'right', fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 14, marginTop: -14 },
  hourLine: { flex: 1, height: 1, backgroundColor: color.rule },
  columns: { position: 'absolute', top: 0, bottom: 0, left: GUTTER, right: 0, flexDirection: 'row' },
  calCol: { flex: 1, borderLeftWidth: 1, borderLeftColor: color.rule },
  event: { position: 'absolute', left: 3, right: 3, paddingHorizontal: space[8], paddingVertical: 6, gap: 2, borderRadius: radius.sm, overflow: 'hidden' },
  // Half-hour blocks: just the title, centred, so it isn't clipped.
  eventShort: { paddingVertical: 0, justifyContent: 'center' },
  eventText: { color: color.selInk },
  eventTime: { color: color.selInk, opacity: 0.8 },
  now: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.ink },
  nowDot: { position: 'absolute', left: -4, top: -3.5, width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.ink },
});
