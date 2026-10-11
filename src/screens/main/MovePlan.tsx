import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { movePlan } from '@/data/live';
import { getPlan } from '@/data/plans';
import { week } from '@/data/week';
import { daysBetween, dayShort, isoDay, timeRange, weekdayLong } from '@/lib/format';
import { dayLoadOn, todayIso } from '@/lib/week';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

type Fit = 'room' | 'tight' | 'over';
const FIT_LABEL: Record<Fit, string> = { room: 'Room', tight: 'Tight', over: 'Over' };
const fitFor = (load: number): Fit => (load > DAY_ROOM ? 'over' : load > DAY_ROOM * 0.75 ? 'tight' : 'room');

/**
 * Move it (no Figma frame yet): the other days this week, lightest first, each showing what its
 * load would become with this plan on it. Same time, different day.
 */
export function MovePlan({ id, onClose }: { id: string; onClose: () => void }) {
  const plan = getPlan(id);
  const from = plan ? isoDay(plan.start) : todayIso;
  const options = daysBetween(todayIso, week.end)
    .filter((d) => d !== from)
    .map((date) => {
      const now = dayLoadOn(date);
      const after = Math.round(now + (plan?.energyCost ?? 0));
      return { date, now, after, fit: fitFor(after) };
    })
    .sort((a, b) => a.after - b.after);
  const [chosen, setChosen] = useState(options[0]?.date);

  if (!plan) return null;
  const fromNow = dayLoadOn(from);
  const pick = options.find((o) => o.date === chosen);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={[type.title, styles.ink]}>
              Move it
            </Text>
            <Text style={[type.sub, styles.muted]} numberOfLines={1}>{`${plan.title} · ${timeRange(plan.start, plan.end)}`}</Text>
          </View>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>

        {/* Where it is now, and what moving gives back. */}
        <View style={styles.now}>
          <Icon name="calendar" size={20} color={color.ink2} />
          <Text style={[type.sub, styles.ink, styles.nowText]}>
            {`Now on ${dayShort(from)}. Moving it takes ${dayShort(from)} from ${fromNow} to ${Math.max(0, Math.round(fromNow - plan.energyCost))} of ${DAY_ROOM}.`}
          </Text>
        </View>

        <Text style={[type.bodyStrong, styles.ink, styles.section]}>Other days this week</Text>
        {options.length === 0 && <Text style={[type.sub, styles.muted]}>No other days left this week.</Text>}
        {options.map((o) => {
          const selected = o.date === chosen;
          return (
            <Pressable
              key={o.date}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${weekdayLong(o.date)}, load ${o.now} to ${o.after} of ${DAY_ROOM}, ${FIT_LABEL[o.fit]}`}
              onPress={() => setChosen(o.date)}
              style={[styles.row, selected ? styles.rowOn : styles.rowRule]}>
              <View style={styles.rowText}>
                <Text style={[type.bodyStrong, styles.ink]}>{dayShort(o.date)}</Text>
                <Text style={[type.sub, styles.muted]}>{`Load ${o.now} → ${o.after} of ${DAY_ROOM}`}</Text>
              </View>
              <View style={[styles.fit, o.fit !== 'room' && styles.fitWarn]}>
                <Text style={[type.label, styles.ink]}>{FIT_LABEL[o.fit]}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected && <Icon name="check" size={16} color={color.selInk} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[type.foot, styles.muted, styles.center]}>Same time, new day. We’ll tell the others.</Text>
        <Button
          label={pick ? `Move to ${weekdayLong(pick.date)}` : 'Move it'}
          trailingIcon="arrow"
          disabled={!pick}
          onPress={() => {
            if (!pick) return;
            movePlan(plan.id, pick.date);
            onClose();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: space[8], paddingHorizontal: space.margin, paddingBottom: space[28] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  headerText: { flex: 1, gap: space[4] },
  now: {
    marginTop: space[20],
    padding: space[16],
    gap: space[12],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.row,
    backgroundColor: color.fill,
  },
  nowText: { flex: 1 },
  section: { paddingTop: space[28], paddingBottom: space[8] },
  row: { minHeight: 68, paddingHorizontal: space[16], gap: space[12], flexDirection: 'row', alignItems: 'center' },
  rowOn: { borderRadius: radius.row, backgroundColor: color.fill },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  rowText: { flex: 1, gap: 2 },
  fit: { paddingHorizontal: space[8], height: 24, justifyContent: 'center', borderRadius: radius.full, backgroundColor: color.paper, borderWidth: 1, borderColor: color.rule },
  fitWarn: { backgroundColor: color.warn, borderColor: color.warn },
  radio: { width: 26, height: 26, borderRadius: radius.full, borderWidth: 1.5, borderColor: color.ink2, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.selBg, borderColor: color.selBg },
  footer: { paddingTop: space[12], paddingHorizontal: space.margin, paddingBottom: space[16], gap: space[8] },
});
