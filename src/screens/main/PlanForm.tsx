import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { PlanFields, dayLabel, parseTime, readDraft, type PlanDraft } from '@/components/PlanFields';
import { TextField } from '@/components/TextField';
import { demoRemove, demoSave } from '@/data/demo';
import { demoChanged, isDemo, loadLive, useLiveScreen } from '@/data/live';
import { people } from '@/data/people';
import { getPlan } from '@/data/plans';
import { localDay } from '@/data/week';
import { dayLoad } from '@/features/capacity/day-load';
import { send } from '@/lib/api';
import { costFromLength } from '@/lib/energy';
import { plansOn } from '@/lib/week';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '@fobo/core/constants';

const COSTS = Array.from({ length: DAY_ROOM + 1 }, (_, i) => i);

/** "20:30" as "8:30", the app's leave-by style. */
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
};


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

  const [draft, setDraft] = useState<PlanDraft>({
    title: plan?.title ?? '',
    day: plan?.start.slice(0, 10) ?? localDay(new Date()),
    kind: plan?.kind ?? 'social',
    starts: plan?.start.slice(11, 16) ?? '',
    ends: plan?.end.slice(11, 16) ?? '',
    notes: plan?.notes ?? '',
  });
  const day = draft.day;
  const [cost, setCost] = useState(plan?.energyCost ?? 3);
  const [withIds, setWithIds] = useState<string[]>(plan?.with?.filter((w) => people.some((p) => p.id === w)) ?? []);
  const [leaveBy, setLeaveBy] = useState(plan?.leaveBy ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const before = dayLoad(plansOn(day).filter((p) => p.id !== id));
  const after = before + cost;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/plans'));

  const save = async () => {
    const read = readDraft(draft);
    const exit = leaveBy.trim() ? parseTime(leaveBy) : '';
    if ('error' in read) return setError(read.error);
    if (exit === null) return setError('Add the leave-by time like 8:30pm.');
    setSaving(true);
    if (isDemo()) {
      // fobo-demo: saved on the sample week, no server.
      const savedId = demoSave(
        { ...read, kind: draft.kind ?? undefined, energyCost: plan ? cost : costFromLength(read.start, read.end), with: withIds, leaveBy: exit ? clock(exit) : undefined, notes: draft.notes.trim() || null },
        plan?.id,
      );
      demoChanged();
      setSaving(false);
      if (then === 'back') return close();
      return router.replace({ pathname: '/plans/[id]', params: { id: savedId } });
    }
    const result = await send<{ id: string }>(plan ? 'PATCH' : 'POST', plan ? `/plans/${plan.id}` : '/plans', {
      ...read,
      kind: draft.kind,
      energyCost: plan ? cost : costFromLength(read.start, read.end),
      // Google invites keep their own guest list.
      ...(plan?.source === 'google' ? {} : { with: withIds }),
      leaveBy: exit ? clock(exit) : null,
      notes: draft.notes.trim() || null,
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
    if (isDemo()) {
      demoRemove(plan.id);
      demoChanged();
      setSaving(false);
      return router.replace('/plans');
    }
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

        <PlanFields
          draft={draft}
          onChange={setDraft}
          autoFocus={!plan}
          focusTime={focus === 'time'}
          titleNote={plan?.source === 'google' && <Text style={[type.foot, styles.muted]}>Changes to the name and time go to Google Calendar too.</Text>}
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
              {`${dayLabel(day)} goes from ${before} to ${after} of ${DAY_ROOM}.${after > DAY_ROOM ? ' That’s over the line.' : ''}`}
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
  pinned: { paddingHorizontal: space.margin, paddingTop: space[12], gap: space[8] },
});
