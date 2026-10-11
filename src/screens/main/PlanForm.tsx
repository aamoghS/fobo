import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DayPicker } from '@/components/DayPicker';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MiniScrap } from '@/components/MiniScrap';
import { Pressable } from '@/components/Pressable';
import { SelectField } from '@/components/SelectField';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { loadLive, useLiveScreen } from '@/data/live';
import { people } from '@/data/people';
import { getPlan } from '@/data/plans';
import { localDay } from '@/data/week';
import { dayLoad } from '@/features/capacity/day-load';
import type { PlanKind } from '@/features/plans/types';
import { send } from '@/lib/api';
import { costFromLength } from '@/lib/energy';
import { dateTile } from '@/lib/format';
import { plansOn } from '@/lib/week';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '@fobo/core/constants';

const KINDS: { key: PlanKind; label: string }[] = [
  { key: 'social', label: 'Social' },
  { key: 'work', label: 'Work' },
  { key: 'obligation', label: 'Obligation' },
  { key: 'enjoy', label: 'Enjoy' },
  { key: 'rest', label: 'Rest' },
];
const COSTS = Array.from({ length: DAY_ROOM + 1 }, (_, i) => i);

/** "7pm", "7:30 pm" or "19:30" as "19:30"; null when it isn't a time. */
function parseTime(text: string) {
  const m = text.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** "20:30" as "8:30", the app's leave-by style. */
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
};


function dayLabel(day: string, today: string) {
  const tomorrow = new Date(`${today}T00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === today) return 'Today';
  if (day === localDay(tomorrow)) return 'Tomorrow';
  const t = dateTile(day);
  return `${t.weekday.slice(0, 1)}${t.weekday.slice(1).toLowerCase()} ${t.day}`;
}

/**
 * Add a plan (Plans +), or edit one (`id`): Edit, Move it (`focus: 'time'`) and the leave-by Edit
 * (`focus: 'exit'`) on Event detail. A new plan asks only what, when and what kind (its cost starts
 * as a guess from its length); editing adds the cost and leave-by. `then: 'back'` returns to where it
 * was opened (onboarding) instead of the new plan. Not in Figma yet: built from the design system's
 * text fields, chips and buttons.
 */
export function PlanForm({ id, focus, then }: { id?: string; focus?: string; then?: string }) {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plan = id ? getPlan(id) : undefined;
  const today = localDay(new Date());

  const [title, setTitle] = useState(plan?.title ?? '');
  const [kind, setKind] = useState<PlanKind>(plan?.kind ?? 'social');
  const [day, setDay] = useState(plan?.start.slice(0, 10) ?? today);
  const [starts, setStarts] = useState(plan?.start.slice(11, 16) ?? '');
  const [ends, setEnds] = useState(plan?.end.slice(11, 16) ?? '');
  const [cost, setCost] = useState(plan?.energyCost ?? 3);
  const [withIds, setWithIds] = useState<string[]>(plan?.with?.filter((w) => people.some((p) => p.id === w)) ?? []);
  const [leaveBy, setLeaveBy] = useState(plan?.leaveBy ?? '');
  const [notes, setNotes] = useState(plan?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<'day' | 'kind' | null>(null);

  const before = dayLoad(plansOn(day).filter((p) => p.id !== id));
  const after = before + cost;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/plans'));

  const save = async () => {
    const s = parseTime(starts);
    const e = parseTime(ends);
    const exit = leaveBy.trim() ? parseTime(leaveBy) : '';
    if (!title.trim()) return setError('Give the plan a name.');
    if (!s || !e) return setError('Add a start and end time, like 7pm or 19:00.');
    if (exit === null) return setError('Add the leave-by time like 8:30pm.');
    // An end at or before the start runs past midnight.
    const next = new Date(`${day}T00:00`);
    next.setDate(next.getDate() + 1);
    const endDay = e <= s ? localDay(next) : day;
    setSaving(true);
    const result = await send<{ id: string }>(plan ? 'PATCH' : 'POST', plan ? `/plans/${plan.id}` : '/plans', {
      title: title.trim(),
      start: `${day}T${s}`,
      end: `${endDay}T${e}`,
      kind,
      energyCost: plan ? cost : costFromLength(`${day}T${s}`, `${endDay}T${e}`),
      // Google invites keep their own guest list.
      ...(plan?.source === 'google' ? {} : { with: withIds }),
      leaveBy: exit ? clock(exit) : null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if ('error' in result) return setError(result.error);
    await loadLive();
    if (then === 'back') close();
    else router.replace({ pathname: '/plans/[id]', params: { id: result.data.id } });
  };

  const remove = async () => {
    if (!plan) return;
    setSaving(true);
    const result = await send('DELETE', `/plans/${plan.id}`);
    setSaving(false);
    if ('error' in result) return setError(result.error);
    await loadLive();
    router.replace('/plans');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>
        <Text accessibilityRole="header" style={[type.display, styles.ink]}>
          {plan ? 'Edit plan' : 'New plan'}
        </Text>

        <TextField label="What" placeholder="Dinner at Comal" value={title} onChangeText={setTitle} autoFocus={!plan} />
        {plan?.source === 'google' && <Text style={[type.foot, styles.muted]}>Changes to the name and time go to Google Calendar too.</Text>}

        <View style={styles.pair}>
          <SelectField label="Day" value={dayLabel(day, today)} onPress={() => setPicking('day')} />
          <SelectField
            label="Kind"
            value={KINDS.find((k) => k.key === kind)!.label}
            leading={<MiniScrap kind={kind} id="kind" size={20} />}
            onPress={() => setPicking('kind')}
          />
        </View>
        <View style={styles.times}>
          <View style={styles.time}>
            <TextField label="Starts" placeholder="7pm" value={starts} onChangeText={setStarts} autoCapitalize="none" autoFocus={focus === 'time'} />
          </View>
          <View style={styles.time}>
            <TextField label="Ends" placeholder="9pm" value={ends} onChangeText={setEnds} autoCapitalize="none" />
          </View>
        </View>

        <TextField
          label="Additional details (optional)"
          placeholder="Address, what to bring, anything to remember"
          value={notes}
          onChangeText={setNotes}
          rows={3}
        />

        {/* A new plan's cost starts as a guess; it's corrected here, once it's on the week. */}
        {plan && (
          <>
            <Section label={`Energy it takes: ${cost} of ${DAY_ROOM}`} scroll>
              {COSTS.map((c) => (
                <Chip key={c} label={String(c)} pressed={cost === c} onPress={() => setCost(c)} />
              ))}
            </Section>
            <Text style={[type.sub, after > DAY_ROOM ? styles.over : styles.muted]}>
              {`${dayLabel(day, today)} goes from ${before} to ${after} of ${DAY_ROOM}.${after > DAY_ROOM ? ' That’s over the line.' : ''}`}
            </Text>
          </>
        )}

        {people.length > 0 && plan?.source !== 'google' && (
          <Section label="With" scroll>
            {people.map((p) => {
              const on = withIds.includes(p.id);
              return (
                <Chip
                  key={p.id}
                  label={p.name}
                  pressed={on}
                  onPress={() => setWithIds((ids) => (on ? ids.filter((x) => x !== p.id) : [...ids, p.id]))}
                />
              );
            })}
          </Section>
        )}

        {plan && (
          <TextField
            label="Leave by (optional)"
            placeholder="8:30pm"
            value={leaveBy}
            onChangeText={setLeaveBy}
            autoCapitalize="none"
            autoFocus={focus === 'exit'}
          />
        )}

        {error ? <Text style={[type.sub, styles.over]}>{error}</Text> : null}
      </ScrollView>
      {/* Pinned 40 from the bottom, like onboarding's buttons. */}
      <View style={[styles.pinned, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        <Button label={plan ? 'Save plan' : 'Add plan'} onPress={save} disabled={saving} />
        {plan && <Button label="Delete plan" variant="quiet" onPress={remove} disabled={saving} />}
      </View>

      <Sheet visible={picking === 'day'} onClose={() => setPicking(null)} title="Pick a day">
        <DayPicker
          value={day}
          onChange={(d) => {
            setDay(d);
            setPicking(null);
          }}
        />
      </Sheet>
      <Sheet visible={picking === 'kind'} onClose={() => setPicking(null)} title="What kind of plan?">
        <View accessibilityRole="radiogroup">
          {KINDS.map((k, i) => (
            <Pressable
              key={k.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: kind === k.key }}
              onPress={() => {
                setKind(k.key);
                setPicking(null);
              }}
              style={[styles.kindRow, i > 0 && styles.rule]}>
              <MiniScrap kind={k.key} id={k.key} size={28} />
              <Text style={[type.bodyStrong, styles.ink, styles.grow]}>{k.label}</Text>
              {kind === k.key && <Icon name="check" />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function Section({ label, scroll = false, children }: { label: string; scroll?: boolean; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[type.label, styles.ink]}>{label}</Text>
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.wrap}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.margin, paddingBottom: space[20], gap: space[20] },
  topBar: { flexDirection: 'row' },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  over: { color: color.error },
  section: { gap: space[8] },
  bleed: { marginHorizontal: -space.margin },
  chips: { gap: space[8], paddingHorizontal: space.margin },
  wrap: { gap: space[8], flexDirection: 'row', flexWrap: 'wrap' },
  times: { flexDirection: 'row', gap: space[12] },
  pair: { flexDirection: 'row', gap: space[12] },
  pinned: { paddingHorizontal: space.margin, paddingTop: space[12], gap: space[8] },
  kindRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  rule: { borderTopWidth: 1, borderTopColor: color.rule },
  grow: { flex: 1 },
  time: { flex: 1 },
});
