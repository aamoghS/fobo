import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EnergyDrops } from '@/components/EnergyDrops';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MiniScrap } from '@/components/MiniScrap';
import { NavFade } from '@/components/NavFade';
import { Pressable } from '@/components/Pressable';
import { scrapColor } from '@/components/Scrap';
import { WeekShelf } from '@/components/WeekShelf';
import { useLiveScreen } from '@/data/live';
import { NOW, week } from '@/data/week';
import { dayLoad } from '@/features/capacity/day-load';
import type { Plan } from '@/features/plans/types';
import { energyDrops } from '@/lib/energy';
import { daysBetween, timeRange, weekRange, dateTile } from '@/lib/format';
import { plansOn, shelfDays, todayIso } from '@/lib/week';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

type View_ = 'agenda' | 'calendar';

/** Plans: the rest of the week as an agenda, or three days as a calendar. Simplified from Tory's references. */
export function Plans() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<View_>('agenda');
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
      {view === 'calendar' && (
        <View style={styles.floating}>
          <Button label="Weigh a plan" onPress={() => router.push('/weigh')} />
        </View>
      )}
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

const load = (date: string) => Math.round(dayLoad(plansOn(date)));

/** A day heading: "WED 7" with its load out of DAY_ROOM. */
function DayHead({ date }: { date: string }) {
  const tile = dateTile(date);
  return (
    <View style={styles.dayHead}>
      <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>{`${tile.weekday} ${tile.day}`}</Text>
      <Text style={[type.foot, styles.muted]}>{`Day load ${load(date)}/${DAY_ROOM}`}</Text>
    </View>
  );
}

function Agenda({ days, onOpen }: { days: string[]; onOpen: (p: Plan) => void }) {
  return (
    <>
      {days.map((date) => {
        const list = plansOn(date);
        return (
          <View key={date}>
            <DayHead date={date} />
            {list.length === 0 ? (
              <Text style={[type.sub, styles.muted, styles.empty]}>Nothing planned</Text>
            ) : (
              <View style={styles.card}>
                {list.map((p, i) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.title}, ${timeRange(p.start, p.end)}`}
                    onPress={() => onOpen(p)}
                    style={[styles.row, i > 0 && styles.rowRule]}>
                    <MiniScrap kind={p.kind} id={p.id} />
                    <View style={styles.rowText}>
                      <Text style={[type.bodyStrong, styles.ink]} numberOfLines={1}>{p.title}</Text>
                      <Text style={[type.sub, styles.muted]}>{timeRange(p.start, p.end)}</Text>
                    </View>
                    {p.kind !== 'rest' && <EnergyDrops count={energyDrops(p.energyCost)} />}
                    <Icon name="chevron" size={18} color={color.ink2} />
                  </Pressable>
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
/** The shelf is drawn at full size and scaled down over the columns. */
const SHELF_SCALE = 0.56;
const minutes = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/**
 * The whole week on one time grid (Figma 206:4023): the shelf's characters over their day columns,
 * each day's date and load, solid scraps of colour for plans, and a line for now.
 */
function Calendar({ onOpen }: { onOpen: (p: Plan) => void }) {
  const days = shelfDays();
  const all = days.flatMap((d) => d.plans);
  const first = Math.min(7, ...all.map((p) => Math.floor(minutes(p.start) / 60)));
  const last = Math.max(21, ...all.map((p) => Math.ceil(minutes(p.end) / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);
  const gridH = hours.length * HOUR_H;
  const nowY = ((minutes(NOW) - first * 60) / 60) * HOUR_H;

  return (
    <View style={styles.calendar}>
      {/* Shelf, scaled to sit over the columns. */}
      <View style={styles.shelfBox} pointerEvents="none">
        <View style={styles.shelfScaled}>
          <WeekShelf days={days} labels={false} />
        </View>
      </View>
      <View style={styles.calHead}>
        <View style={styles.gutter} />
        {days.map((d) => {
          const tile = dateTile(d.date);
          return (
            <View key={d.date} style={styles.calDay}>
              <Text style={[type.foot, styles.muted]}>{d.label}</Text>
              <Text style={[type.bodyStrong, styles.ink]}>{tile.day}</Text>
              <Text style={[type.foot, styles.muted]}>{`${load(d.date)}/${DAY_ROOM}`}</Text>
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
                    style={[styles.event, { top, height, backgroundColor: scrapColor[p.kind] }]}>
                    <Text style={styles.eventText} numberOfLines={Math.max(1, Math.floor((height - 4) / 13))}>
                      {p.title}
                    </Text>
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
  dayHead: { paddingTop: space[28], paddingBottom: space[12], flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  empty: { paddingBottom: space[4] },
  card: { borderRadius: radius.row, backgroundColor: color.paper, boxShadow: shadow.soft, overflow: 'hidden' },
  row: { minHeight: 72, paddingHorizontal: space[16], gap: space[12], flexDirection: 'row', alignItems: 'center' },
  rowRule: { borderTopWidth: 1, borderTopColor: color.rule },
  rowText: { flex: 1, gap: 2 },
  calendar: { marginTop: space[16], marginHorizontal: -space.margin },
  shelfBox: { height: 100, overflow: 'hidden' },
  shelfScaled: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    bottom: 0,
    height: 158,
    transformOrigin: 'bottom left',
    transform: [{ scale: SHELF_SCALE }],
    // Scaled from a width wider than the columns, so the seven stacks land on them.
    width: (393 - GUTTER) / SHELF_SCALE,
  },
  calHead: { flexDirection: 'row', paddingBottom: space[8] },
  calDay: { flex: 1, alignItems: 'center' },
  calBody: { borderTopWidth: 1, borderTopColor: color.rule },
  gutter: { width: GUTTER },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  // Figma sets these at 11; the ramp's smallest is 13, too wide for the gutter.
  hour: { width: GUTTER, paddingRight: space[8], textAlign: 'right', fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 14, marginTop: -14 },
  hourLine: { flex: 1, height: 1, backgroundColor: color.rule },
  columns: { position: 'absolute', top: 0, bottom: 0, left: GUTTER, right: 0, flexDirection: 'row' },
  calCol: { flex: 1, borderLeftWidth: 1, borderLeftColor: color.rule },
  event: { position: 'absolute', left: 2, right: 2, paddingHorizontal: space[4], paddingVertical: 2, borderRadius: radius.sm, overflow: 'hidden' },
  eventText: { color: color.selInk, fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 13 },
  now: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.ink },
  nowDot: { position: 'absolute', left: -4, top: -3.5, width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.ink },
  floating: { position: 'absolute', right: space.margin, bottom: 100 },
});
