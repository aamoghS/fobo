import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PaperSpirit, type SpiritMood } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { Sheet } from '@/components/Sheet';
import type { Plan } from '@/features/plans/types';
import { getPerson } from '@/data/people';
import { plans } from '@/data/plans';
import { profile } from '@/data/profile';
import { NOW } from '@/data/week';
import { timeRange, weekdayLong } from '@/lib/format';
import { DAY_ROOM } from '../../../packages/core/src';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

// Demo only: the check-in after a plan shows for this account, and comes back on every reload or sign-in.
const DEMO_EMAIL = 'thashin2004@gmail.com';

type Feeling = 'energizing' | 'neutral' | 'draining';
const FEELINGS: { key: Feeling; label: string; mood: SpiritMood }[] = [
  { key: 'energizing', label: 'Energizing', mood: 'bright' },
  { key: 'neutral', label: 'Neutral', mood: 'fine' },
  { key: 'draining', label: 'Draining', mood: 'spent' },
];

/** The latest plan that has ended (not rest), to ask about. */
function lastPlan(): Plan | undefined {
  return plans
    .filter((p) => p.kind !== 'rest' && p.status !== 'declined' && p.end <= NOW)
    .sort((a, b) => b.end.localeCompare(a.end))[0];
}

const question = (title: string) => `How was ${title}?`;

/** Home's banner after a plan ("How was dinner at Comal?") and its check-in sheet. */
export function PlanReview() {
  'use no memo'; // Reads the live plans; see live.ts.
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const plan = lastPlan();
  if (done || !plan || profile.email.toLowerCase() !== DEMO_EMAIL) return null;

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityHint="Opens a short check-in" onPress={() => setOpen(true)} style={styles.banner}>
        <PaperSpirit mood="fine" size={44} />
        <View style={styles.bannerText}>
          <Text style={[type.bodyStrong, styles.ink]} numberOfLines={1}>
            {question(plan.title)}
          </Text>
          <Text style={[type.foot, styles.ink]}>Takes five seconds</Text>
        </View>
        <Icon name="chevron" color={color.ink} />
      </Pressable>
      <ReviewSheet plan={plan} visible={open} onClose={() => setOpen(false)} onDone={() => setDone(true)} />
    </>
  );
}

function ReviewSheet({ plan, visible, onClose, onDone }: { plan: Plan; visible: boolean; onClose: () => void; onDone: () => void }) {
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [worth, setWorth] = useState<boolean | null>(null);
  const [thanked, setThanked] = useState(false);

  // The thank-you shows for a moment, then the sheet closes and the banner goes.
  useEffect(() => {
    if (!thanked) return;
    const t = setTimeout(() => {
      onClose();
      setTimeout(onDone, 300);
    }, 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per thank-you; the parent's callbacks change each render.
  }, [thanked]);

  const cost = Math.max(1, Math.round(plan.energyCost) || 3);
  const lighter = feeling === 'energizing' && worth === true;
  const heavier = feeling === 'draining' || worth === false;
  const next = lighter ? Math.max(1, cost - 1) : heavier ? Math.min(DAY_ROOM, cost + 1) : cost;
  const names = (plan.with ?? []).map((id) => getPerson(id)?.name).filter(Boolean);
  const when = `${weekdayLong(plan.start)}, ${timeRange(plan.start, plan.end)}${names.length ? ` · ${names.join(', ')}` : ''}`;
  const answered = feeling !== null && worth !== null;

  return (
    <Sheet visible={visible} onClose={onClose} title={thanked ? 'Thank you!' : question(plan.title)}>
      {thanked ? (
        <View style={styles.thanks}>
          <PaperSpirit mood="bright" size={88} />
          <Text style={[type.sub, styles.muted, styles.center]}>
            {next === cost ? `${plan.title} stays at ${cost}/${DAY_ROOM}.` : `Plans like this now count as ${next}/${DAY_ROOM}.`}
          </Text>
        </View>
      ) : (
        <>
          <Text style={[type.sub, styles.muted]}>{when}</Text>
          <View style={styles.feelings} accessibilityRole="radiogroup">
            {FEELINGS.map((f) => {
              const on = feeling === f.key;
              return (
                <Pressable
                  key={f.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={f.label}
                  onPress={() => setFeeling(f.key)}
                  style={[styles.feeling, on && styles.feelingOn]}>
                  <PaperSpirit mood={f.mood} size={52} />
                  <Text style={[type.bodyStrong, { color: on ? color.selInk : color.ink }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text accessibilityRole="header" style={[type.title, styles.ink]}>
            Worth the energy?
          </Text>
          <View style={styles.row}>
            <Button label="Yes" variant={worth === true ? 'ink' : 'quiet'} size="compact" style={styles.half} onPress={() => setWorth(true)} />
            <Button label="Not quite" variant={worth === false ? 'ink' : 'quiet'} size="compact" style={styles.half} onPress={() => setWorth(false)} />
          </View>

          {answered && (
            <View style={styles.learned}>
              <Text style={[type.foot, styles.muted]}>What Fobo learned</Text>
              <View style={styles.costs}>
                {next !== cost && <Text style={[type.title, styles.muted, styles.struck]}>{cost}</Text>}
                <Text style={[type.title, styles.ink]}>{next}</Text>
                <Text style={[type.body, styles.ink, styles.flex]}>
                  {next < cost ? 'Plans like this cost less now.' : next > cost ? 'Plans like this cost more now.' : 'Plans like this cost about the same.'}
                </Text>
              </View>
            </View>
          )}

          <Button label="Save" disabled={!answered} onPress={() => setThanked(true)} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  banner: {
    marginTop: space[16],
    paddingVertical: space[16],
    paddingLeft: space[16],
    paddingRight: space[12],
    gap: space[12],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.row,
    backgroundColor: color.moodBright,
  },
  bannerText: { flex: 1, gap: 2 },
  feelings: { flexDirection: 'row', gap: space[8] },
  feeling: { flex: 1, paddingVertical: space[16], gap: space[8], alignItems: 'center', borderRadius: radius.row, backgroundColor: color.fill },
  feelingOn: { backgroundColor: color.selBg },
  row: { flexDirection: 'row', gap: space[12] },
  half: { flex: 1 },
  learned: { padding: space[16], gap: space[8], borderRadius: radius.row, backgroundColor: color.paper, boxShadow: shadow.soft },
  costs: { flexDirection: 'row', alignItems: 'baseline', gap: space[8] },
  struck: { textDecorationLine: 'line-through' },
  thanks: { paddingVertical: space[16], gap: space[16], alignItems: 'center' },
});
