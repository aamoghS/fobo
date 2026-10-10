import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnergyDrops } from '@/components/EnergyDrops';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MiniScrap } from '@/components/MiniScrap';
import { NavFade } from '@/components/NavFade';
import { Pressable } from '@/components/Pressable';
import { scrapColor } from '@/components/Scrap';
import { useLiveScreen } from '@/data/live';
import { week } from '@/data/week';
import { dayLoad } from '@/features/capacity/day-load';
import type { Plan } from '@/features/plans/types';
import { energyDrops } from '@/lib/energy';
import { daysBetween, timeRange, weekRange, dateTile } from '@/lib/format';
import { plansOn, todayIso } from '@/lib/week';
import { withAlpha } from '@/styles/alpha';
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

        {view === 'agenda' ? <Agenda days={days} onOpen={open} /> : <Calendar days={days.slice(0, 3)} onOpen={open} />}
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

const HOUR_H = 52;
const minutes = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

/** Three days side by side on one time grid, sized to the plans in them. */
function Calendar({ days, onOpen }: { days: string[]; onOpen: (p: Plan) => void }) {
  const all = days.flatMap(plansOn);
  const first = Math.min(9, ...all.map((p) => Math.floor(minutes(p.start) / 60)));
  const last = Math.max(18, ...all.map((p) => Math.ceil(minutes(p.end) / 60)));
  const hours = Array.from({ length: last - first }, (_, i) => first + i);

  return (
    <View style={[styles.card, styles.calendar]}>
      <View style={styles.calHead}>
        <View style={styles.gutter} />
        {days.map((date) => {
          const tile = dateTile(date);
          return (
            <View key={date} style={styles.calDay}>
              <Text style={[type.label, styles.ink]}>{`${tile.weekday} ${tile.day}`}</Text>
              <Text style={[type.foot, styles.muted]}>{`Load ${load(date)}/${DAY_ROOM}`}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.calBody}>
        <View style={[styles.gutter, { height: hours.length * HOUR_H }]}>
          {hours.map((h) => (
            // Centred on its hour line.
            <Text key={h} style={[type.foot, styles.muted, styles.hour, { top: (h - first) * HOUR_H - 9 }]}>
              {hourLabel(h)}
            </Text>
          ))}
        </View>
        {days.map((date) => (
          <View key={date} style={[styles.calCol, { height: hours.length * HOUR_H }]}>
            {hours.map((h) => (
              <View key={h} style={[styles.hourLine, { top: (h - first) * HOUR_H }]} />
            ))}
            {plansOn(date).map((p) => {
              const top = ((minutes(p.start) - first * 60) / 60) * HOUR_H;
              const height = Math.max(((minutes(p.end) - minutes(p.start)) / 60) * HOUR_H - 2, 22);
              const kind = scrapColor[p.kind];
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.title}, ${timeRange(p.start, p.end)}`}
                  onPress={() => onOpen(p)}
                  style={[styles.event, { top, height, backgroundColor: withAlpha(kind, 0.14), borderLeftColor: kind }]}>
                  <Text style={[type.label, styles.ink]} numberOfLines={height > 40 ? 2 : 1}>
                    {p.title}
                  </Text>
                  {height > 44 && <Text style={[type.foot, styles.muted]} numberOfLines={1}>{timeRange(p.start, p.end)}</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
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
  calendar: { marginTop: space[20] },
  calHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.rule },
  calDay: { flex: 1, paddingVertical: space[12], alignItems: 'center', gap: 2 },
  calBody: { flexDirection: 'row', paddingTop: space[12], paddingBottom: space[12] },
  gutter: { width: 44 },
  hour: { position: 'absolute', left: space[8] },
  calCol: { flex: 1, borderLeftWidth: 1, borderLeftColor: color.rule },
  hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.rule },
  event: {
    position: 'absolute',
    left: 3,
    right: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
});
