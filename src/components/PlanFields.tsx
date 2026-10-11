import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { localDay } from '@/data/week';
import type { PlanKind } from '@/features/plans/types';
import { dateTile } from '@/lib/format';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { DayPicker } from './DayPicker';
import { Icon } from './Icon';
import { MiniScrap } from './MiniScrap';
import { Pressable } from './Pressable';
import { SelectField } from './SelectField';
import { Sheet } from './Sheet';
import { TextField } from './TextField';

const KINDS: { key: PlanKind; label: string }[] = [
  { key: 'social', label: 'Social' },
  { key: 'work', label: 'Work' },
  { key: 'obligation', label: 'Obligation' },
  { key: 'enjoy', label: 'Enjoy' },
  { key: 'rest', label: 'Rest' },
];
const GUESS = 'Guess for me';

/** What the plan form holds. `kind` is null for "Guess for me" (Weigh a plan works it out). */
export type PlanDraft = { title: string; day: string; kind: PlanKind | null; starts: string; ends: string; notes: string };

export const emptyDraft = (kind: PlanKind | null = 'social'): PlanDraft => ({
  title: '',
  day: localDay(new Date()),
  kind,
  starts: '',
  ends: '',
  notes: '',
});

/** "7pm", "7:30 pm" or "19:30" as "19:30"; null when it isn't a time. */
export function parseTime(text: string) {
  const m = text.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** The draft as a plan's title, start and end, or what's missing. An end at or before the start runs past midnight. */
export function readDraft(d: PlanDraft): { error: string } | { title: string; start: string; end: string } {
  const s = parseTime(d.starts);
  const e = parseTime(d.ends);
  if (!d.title.trim()) return { error: 'Give the plan a name.' };
  if (!s || !e) return { error: 'Add a start and end time, like 7pm or 19:00.' };
  const next = new Date(`${d.day}T00:00`);
  next.setDate(next.getDate() + 1);
  return { title: d.title.trim(), start: `${d.day}T${s}`, end: `${e <= s ? localDay(next) : d.day}T${e}` };
}

/** "Today", "Tomorrow", or "Sat 10". */
export function dayLabel(day: string) {
  const today = localDay(new Date());
  const tomorrow = new Date(`${today}T00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === today) return 'Today';
  if (day === localDay(tomorrow)) return 'Tomorrow';
  const t = dateTile(day);
  return `${t.weekday.slice(0, 1)}${t.weekday.slice(1).toLowerCase()} ${t.day}`;
}

type Props = {
  draft: PlanDraft;
  onChange: (draft: PlanDraft) => void;
  /** Offer "Guess for me" as a kind. */
  guessKind?: boolean;
  autoFocus?: boolean;
  /** Focus Starts (Move it). */
  focusTime?: boolean;
  /** Under What, like a note that the name goes to Google Calendar too. */
  titleNote?: ReactNode;
};

/**
 * A plan's what, day and kind, times and details: the plan form, and Weigh a plan's Write a plan.
 * Day and kind are dropdowns that open a Sheet over the screen.
 */
export function PlanFields({ draft, onChange, guessKind = false, autoFocus = false, focusTime = false, titleNote }: Props) {
  const [picking, setPicking] = useState<'day' | 'kind' | null>(null);
  const set = (change: Partial<PlanDraft>) => onChange({ ...draft, ...change });
  const kinds: { key: PlanKind | null; label: string }[] = guessKind ? [{ key: null, label: GUESS }, ...KINDS] : KINDS;

  return (
    <View style={styles.fields}>
      <TextField label="What" placeholder="Dinner at Comal" value={draft.title} onChangeText={(title) => set({ title })} autoFocus={autoFocus} />
      {titleNote}

      <View style={styles.pair}>
        <SelectField label="Day" value={dayLabel(draft.day)} onPress={() => setPicking('day')} />
        <SelectField
          label="Kind"
          value={kinds.find((k) => k.key === draft.kind)?.label ?? GUESS}
          leading={draft.kind ? <MiniScrap kind={draft.kind} id="kind" size={20} /> : undefined}
          onPress={() => setPicking('kind')}
        />
      </View>
      <View style={styles.pair}>
        <View style={styles.half}>
          <TextField
            label="Starts"
            placeholder="7pm"
            value={draft.starts}
            onChangeText={(starts) => set({ starts })}
            autoCapitalize="none"
            autoFocus={focusTime}
          />
        </View>
        <View style={styles.half}>
          <TextField label="Ends" placeholder="9pm" value={draft.ends} onChangeText={(ends) => set({ ends })} autoCapitalize="none" />
        </View>
      </View>

      <TextField
        label="Additional details (optional)"
        placeholder="Address, what to bring, anything to remember"
        value={draft.notes}
        onChangeText={(notes) => set({ notes })}
        rows={3}
      />

      <Sheet visible={picking === 'day'} onClose={() => setPicking(null)} title="Pick a day">
        <DayPicker
          value={draft.day}
          onChange={(day) => {
            set({ day });
            setPicking(null);
          }}
        />
      </Sheet>
      <Sheet visible={picking === 'kind'} onClose={() => setPicking(null)} title="What kind of plan?">
        <View accessibilityRole="radiogroup">
          {kinds.map((k, i) => (
            <Pressable
              key={k.key ?? 'guess'}
              accessibilityRole="radio"
              accessibilityState={{ checked: draft.kind === k.key }}
              onPress={() => {
                set({ kind: k.key });
                setPicking(null);
              }}
              style={[styles.kindRow, i > 0 && styles.rule]}>
              {k.key ? <MiniScrap kind={k.key} id={k.key} size={28} /> : <View style={styles.guess}><Icon name="bolt" size={22} /></View>}
              <Text style={[type.bodyStrong, styles.ink, styles.grow]}>{k.label}</Text>
              {draft.kind === k.key && <Icon name="check" />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space[20] },
  pair: { flexDirection: 'row', gap: space[12] },
  half: { flex: 1 },
  ink: { color: color.ink },
  kindRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  guess: { width: 28, alignItems: 'center' },
  rule: { borderTopWidth: 1, borderTopColor: color.rule },
  grow: { flex: 1 },
});
