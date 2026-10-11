import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { scrapColor } from '@/components/Scrap';
import { setExit } from '@/data/live';
import { getPlan, planDetails } from '@/data/plans';
import { startTime, timeRange } from '@/lib/format';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '../../../packages/core/src';

const REMINDERS = [10, 15, 30];
/** "15 min before": the chip, and the reminder row on the event screen. */
const nudge = (m: number) => `${m} min before`;
const pad = (n: number) => String(n).padStart(2, '0');
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** "8:30" for the leave-by label, as the event screen shows it. */
const clock = (d: Date) => `${d.getHours() % 12 || 12}${d.getMinutes() ? `:${pad(d.getMinutes())}` : ':00'}`;

/**
 * Plan my exit (no Figma frame yet): pick when you'll leave, see what that saves, get a reminder,
 * and have a line ready. Saving shortens the plan to your leave time and lowers its cost.
 */
export function PlanExit({ id, onClose }: { id: string; onClose: () => void }) {
  const plan = getPlan(id);
  const start = new Date(plan?.start ?? 0);
  const end = new Date(plan?.end ?? 0);
  const total = Math.max(30, (end.getTime() - start.getTime()) / 60000);

  // Leave-by choices every 30 minutes, from half an hour in to half an hour before the end.
  const options: Date[] = [];
  for (let m = 30; m < total; m += 30) options.push(new Date(start.getTime() + m * 60000));
  if (options.length === 0) options.push(new Date(start.getTime() + (total / 2) * 60000));

  const saved = planDetails[id]?.exit?.leaveBy;
  const initial = Math.max(
    0,
    options.findIndex((d) => clock(d) === saved),
  );
  const fallback = Math.min(options.length - 1, Math.round(options.length * 0.6));
  const [choice, setChoice] = useState(saved ? initial : fallback);
  // Reopened, it starts from the nudge already set, so saving again doesn't quietly reset it.
  const [remind, setRemind] = useState(REMINDERS.find((m) => nudge(m) === planDetails[id]?.reminder) ?? 15);
  // The line that was copied: a new leave time is a new line, not copied yet.
  const [copied, setCopied] = useState<string | null>(null);

  const leave = options[choice];
  const stayed = (leave.getTime() - start.getTime()) / 60000;
  const share = stayed / total;
  // Always weighed against staying the whole time, so re-planning doesn't compound.
  const cost = planDetails[id]?.fullCost ?? plan?.energyCost ?? 0;
  const newCost = Math.max(1, Math.round(cost * share * 2) / 2);
  const reminderAt = new Date(leave.getTime() - remind * 60000);
  const line = `I’ve got an early start, so I’ll head out at ${startTime(`${plan?.start.slice(0, 11)}${hm(leave)}`).toLowerCase()}. Thanks for having me!`;

  // The bar fills to where you leave, and glides when you change it.
  const fill = useRef(new Animated.Value(share)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: share, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [share, fill]);

  if (!plan) return null;
  const leaveLabel = startTime(`${plan.start.slice(0, 11)}${hm(leave)}`);

  // The web copies; native has no clipboard without a new dependency, so it opens the share sheet,
  // which has Copy and the messaging apps.
  const web = Platform.OS === 'web';
  const copy = async () => {
    if (web) {
      const done = await navigator.clipboard?.writeText(line).then(() => true, () => false);
      if (done) setCopied(line);
    } else {
      await Share.share({ message: line }).catch(() => {});
    }
  };
  const isCopied = copied === line;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={[type.title, styles.ink]}>
              Plan my exit
            </Text>
            <Text style={[type.sub, styles.muted]} numberOfLines={1}>{`${plan.title} · ${timeRange(plan.start, plan.end)}`}</Text>
          </View>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>

        {/* The headline: when you leave, and what it saves. */}
        <View style={styles.card}>
          <Text style={[type.sub, styles.muted]}>Leave by</Text>
          <Text style={[type.display, styles.ink]}>{leaveLabel}</Text>
          <View style={styles.bar} accessibilityLabel={`Staying ${Math.round(share * 100)}% of the plan`}>
            <Animated.View
              style={[
                styles.barFill,
                { backgroundColor: scrapColor[plan.kind], width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <View style={styles.barEnds}>
            <Text style={[type.foot, styles.muted]}>{startTime(plan.start)}</Text>
            <Text style={[type.foot, styles.muted]}>{startTime(plan.end)}</Text>
          </View>
          <Text style={[type.bodyStrong, styles.ink]}>
            {`Costs ${newCost} of ${DAY_ROOM}`}
            <Text style={[type.body, styles.muted]}>{` instead of ${cost}`}</Text>
          </Text>
        </View>

        <Text style={[type.bodyStrong, styles.ink, styles.section]}>When</Text>
        <View style={styles.chips}>
          {options.map((d, i) => (
            <Chip key={d.getTime()} label={startTime(`${plan.start.slice(0, 11)}${hm(d)}`)} pressed={i === choice} onPress={() => setChoice(i)} />
          ))}
        </View>

        <Text style={[type.bodyStrong, styles.ink, styles.section]}>Nudge me</Text>
        <View style={styles.chips}>
          {REMINDERS.map((m) => (
            <Chip key={m} label={nudge(m)} pressed={m === remind} onPress={() => setRemind(m)} />
          ))}
        </View>

        <Text style={[type.bodyStrong, styles.ink, styles.section]}>Something to say</Text>
        <View style={styles.line}>
          <Text style={[type.body, styles.ink]}>{`“${line}”`}</Text>
          {web ? (
            <Chip label={isCopied ? 'Copied' : 'Copy'} icon={isCopied ? 'check' : 'copy'} pressed={isCopied} onPress={copy} />
          ) : (
            <Chip label="Share" icon="paper-airplane" pressed={false} onPress={copy} />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Set my exit"
          trailingIcon="arrow"
          onPress={() => {
            setExit(
              plan.id,
              newCost,
              clock(leave),
              `Saves ${Math.round((cost - newCost) * 10) / 10} of ${DAY_ROOM} · reminder at ${startTime(`${plan.start.slice(0, 11)}${hm(reminderAt)}`)}`,
              nudge(remind),
            );
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  headerText: { flex: 1, gap: space[4] },
  card: { marginTop: space[20], padding: space[20], gap: space[8], borderRadius: radius.row, backgroundColor: color.fill },
  bar: { marginTop: space[8], height: 10, borderRadius: radius.full, backgroundColor: color.paper, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  barEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  section: { paddingTop: space[28], paddingBottom: space[12] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  line: { padding: space[16], gap: space[12], alignItems: 'flex-start', borderRadius: radius.row, borderWidth: 1, borderColor: color.rule, backgroundColor: color.paper },
  footer: { paddingTop: space[12], paddingHorizontal: space.margin, paddingBottom: space[16] },
});
