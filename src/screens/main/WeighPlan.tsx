import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PlanFields, emptyDraft, readDraft, type PlanDraft } from '@/components/PlanFields';
import { Pressable } from '@/components/Pressable';
import { scrapColor } from '@/components/Scrap';
import { inviteFrom, invites, type Invite } from '@/data/invites';
import { loadLive, useLiveScreen } from '@/data/live';
import { people } from '@/data/people';
import type { Plan } from '@/features/plans/types';
import { api, send } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { Candidate } from '@/lib/weigh';
import { dayHeading, isoDay, startTime } from '@/lib/format';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { WeighResult } from './WeighResult';

type Tab = 'tentative' | 'write';

/** Weigh a plan: pick an invite you haven't accepted, or write one. From Tory's mockup (not in Figma yet). */
export function WeighPlan({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  'use no memo'; // Reads the in-memory data, which changes without new props; see live.ts.
  useLiveScreen();
  const [tab, setTab] = useState<Tab>('tentative');
  // Nothing chosen until you pick one; the button waits for it.
  const [selected, setSelected] = useState<string>();
  // Kind starts on Guess for me: weighing works it out.
  const [draft, setDraft] = useState<PlanDraft>(() => emptyDraft(null));
  const [writtenId, setWrittenId] = useState<string>();
  const [weighing, setWeighing] = useState<Candidate>();
  const [busy, setBusy] = useState(false);

  // A written plan is saved as tentative first (POST /plans), so weighing reads exactly what was filled in.
  const written = async () => {
    const read = readDraft(draft);
    if ('error' in read) return notify(read.error);
    const fields = { ...read, kind: draft.kind, notes: draft.notes.trim() || null };
    // Weighed before (and back to change it): update that tentative plan rather than add another.
    const made = await send<{ id: string }>(
      writtenId ? 'PATCH' : 'POST',
      writtenId ? `/plans/${writtenId}` : '/plans',
      writtenId ? fields : { ...fields, status: 'proposed' },
    );
    if ('error' in made) return notify(made.error);
    setWrittenId(made.data.id);
    return made.data.id;
  };

  // Gemini weighs it (POST /weigh): its cost, and its kind if left to guess. The result tries it on its day.
  const weigh = async () => {
    setBusy(true);
    const planId = tab === 'tentative' ? selected : await written();
    if (!planId) return setBusy(false);
    const weighed = await api<Plan>('POST', '/weigh', { planId });
    if (weighed) await loadLive();
    setBusy(false);
    if (!weighed) return notify("Couldn't weigh that plan. Try again in a moment.");
    setWeighing(inviteFrom(weighed, people));
  };

  if (weighing) {
    // Saying yes: the plan stops being tentative.
    const add = async () => {
      const accepted = await api('PATCH', `/plans/${weighing.id}`, { status: 'accepted' });
      if (!accepted) return notify("Couldn't add that plan. Try again in a moment.");
      await loadLive();
      onAdded();
    };
    return <WeighResult candidate={weighing} onBack={() => setWeighing(undefined)} onClose={onClose} onAdd={add} />;
  }

  const days = [...new Set(invites.map((i) => isoDay(i.start)))];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabs} accessibilityRole="tablist">
          <TabButton label="Tentative plans" active={tab === 'tentative'} onPress={() => setTab('tentative')} />
          <TabButton label="Write a plan" active={tab === 'write'} onPress={() => setTab('write')} />
        </View>

        {tab === 'tentative' ? (
          <>
            {days.map((day) => (
              <View key={day}>
                <Text style={[type.body, styles.muted, styles.dayHeading]}>{dayHeading(day)}</Text>
                {invites
                  .filter((i) => isoDay(i.start) === day)
                  .map((invite) => (
                    <InviteRow
                      key={invite.id}
                      invite={invite}
                      selected={selected === invite.id}
                      onPress={() => setSelected(invite.id)}
                    />
                  ))}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.write}>
            <PlanFields draft={draft} onChange={setDraft} guessKind />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {tab === 'tentative' && <Text style={[type.sub, styles.muted, styles.footnote]}>This won’t accept the invite.</Text>}
        <Button
          label={busy ? 'Weighing…' : 'Weigh this plan'}
          trailingIcon="arrow"
          disabled={busy || (tab === 'tentative' ? !selected : !draft.title.trim() || !draft.starts.trim() || !draft.ends.trim())}
          onPress={weigh}
        />
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}>
      <Text style={[type.bodyStrong, active ? styles.selInk : styles.ink]}>{label}</Text>
    </Pressable>
  );
}

// Respect the system's reduce-motion setting: selection then just switches.
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((on) => (reduceMotion = on)).catch(() => {});

/**
 * One tentative invite. Picking it is a small moment: the row squishes and bounces back, the grey
 * card settles in, the kind bar grows to full height (so the card's rounded corners curve it), and
 * the check pops in with a little overshoot. Deselecting plays it back quietly.
 */
function InviteRow({ invite, selected, onPress }: { invite: Invite; selected: boolean; onPress: () => void }) {
  const kindColor = scrapColor[invite.kind];
  const on = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const squish = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      on.setValue(selected ? 1 : 0);
      pop.setValue(selected ? 1 : 0);
      return;
    }
    if (selected) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(squish, { toValue: 0.97, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.spring(squish, { toValue: 1, friction: 4, tension: 160, useNativeDriver: false }),
        ]),
        Animated.timing(on, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.sequence([
          Animated.delay(60),
          // One soft overshoot (~10%), then settle: a fixed curve, so it's the same every time.
          Animated.timing(pop, { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.7)), useNativeDriver: false }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(on, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        Animated.timing(pop, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ]).start();
    }
  }, [selected, on, pop, squish]);

  const inset = on.interpolate({ inputRange: [0, 1], outputRange: [space[12], 0] });

  return (
    <Animated.View style={{ transform: [{ scale: squish }] }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${invite.title}, ${startTime(invite.start)}, ${invite.with}`}
        onPress={onPress}
        style={styles.row}>
        {/* The card: grey fill and kind bar, clipped to the row's rounded corners. */}
        <View pointerEvents="none" style={styles.card}>
          <Animated.View
            style={[styles.fill, { opacity: on, transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}
          />
          <Animated.View
            style={[
              styles.kindBar,
              {
                backgroundColor: kindColor,
                top: inset,
                bottom: inset,
                width: on.interpolate({ inputRange: [0, 1], outputRange: [4, 5] }),
                borderRadius: on.interpolate({ inputRange: [0, 1], outputRange: [radius.full, 0] }),
              },
            ]}
          />
        </View>
        <Animated.View pointerEvents="none" style={[styles.rule, { opacity: Animated.subtract(1, on) }]} />

        <View style={styles.rowText}>
          <Text style={[type.bodyStrong, styles.ink]}>{invite.title}</Text>
          <Text style={[type.sub, styles.muted]}>{`${startTime(invite.start)} · ${invite.with}`}</Text>
        </View>
        <View style={styles.radio}>
          <Animated.View
            style={[styles.radioFill, { opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: pop }] }]}>
            <Animated.View
              style={{ transform: [{ rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) }] }}>
              <Icon name="check" size={18} color={color.selInk} />
            </Animated.View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingTop: space[8], paddingHorizontal: space.margin, paddingBottom: space[28] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  selInk: { color: color.selInk },
  // Segmented toggle: chips in a fill capsule, the chosen side goes black.
  tabs: { marginTop: space[12], padding: space[4], flexDirection: 'row', borderRadius: radius.full, backgroundColor: color.fill },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  tabActive: { backgroundColor: color.selBg },
  dayHeading: { paddingTop: space[28], paddingBottom: space[8] },
  write: { paddingTop: space[20] },
  row: {
    minHeight: 84,
    paddingVertical: space[16],
    paddingRight: space[16],
    gap: space[16],
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.row, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.row, backgroundColor: color.fill },
  kindBar: { position: 'absolute', left: 0 },
  rule: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: color.rule },
  rowText: { flex: 1, paddingLeft: space[20], gap: space[4] },
  radio: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.ink2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Covers the outline ring as it pops in.
  radioFill: {
    position: 'absolute',
    top: -1.5,
    left: -1.5,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: color.selBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingTop: space[12], paddingHorizontal: space.margin, paddingBottom: space[16], gap: space[12] },
  footnote: { textAlign: 'center' },
});
