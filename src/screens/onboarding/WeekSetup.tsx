import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { PlanLine } from '@/components/PlanLine';
import { Pressable } from '@/components/Pressable';
import { WeekShelf } from '@/components/WeekShelf';
import { loadLive, useLive } from '@/data/live';
import { plans } from '@/data/plans';
import { week } from '@/data/week';
import { answers } from '@/features/profile/answers';
import { useCharacter } from '@/features/profile/character';
import { api } from '@/lib/api';
import { signInWithGoogle } from '@/lib/google-auth';
import { weekdayLong } from '@/lib/format';
import { dayLoadOn, plansOn, shelfDays, todayIso } from '@/lib/week';
import { CharacterArt } from '@/screens/you/CharacterArt';
import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '@fobo/core/constants';
import { CAPACITY_LABELS, RECHARGE_VALUES, RECOVERY_VALUES, SOCIAL_ENERGY_VALUES } from '@fobo/core/copy';

// The steps that come after the questions: your capacity profile, bring in your week, and does this look right.
// Onboarding.tsx sets each inside its Frame.

const HEARD = [
  { step: 'recharge', label: CAPACITY_LABELS.recharge, values: RECHARGE_VALUES },
  { step: 'head-home', label: CAPACITY_LABELS.socialEnergy, values: SOCIAL_ENERGY_VALUES },
  { step: 'yourself', label: CAPACITY_LABELS.recovery, values: RECOVERY_VALUES },
] as const;

/** Your capacity profile: the three answers as Capacity Profile rows. Each reopens its question. */
export function AnswerSummary() {
  const router = useRouter();
  const character = useCharacter();
  // An answer changed on its question shows here on the way back.
  const [, redraw] = useState(0);
  useFocusEffect(useCallback(() => redraw((n) => n + 1), []));

  return (
    <View style={styles.stretch}>
      <View style={styles.heard}>
        <CharacterArt character={character} size={140} />
        <Text accessibilityRole="header" style={[type.display, styles.ink, styles.center]}>
          Your capacity profile
        </Text>
        <Text style={[type.sub, styles.muted]}>Tap anything to change it.</Text>
      </View>
      <View style={styles.answers}>
        {HEARD.map(({ step, label, values }, i) => {
          const value = answers[step] ? values[answers[step]!] : undefined;
          return (
            <Pressable
              key={step}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${value ?? 'Not answered'}`}
              onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step, edit: '1' } })}
              style={[styles.answer, i > 0 && styles.rule]}>
              <View style={styles.answerText}>
                <Text style={[type.foot, styles.muted]}>{label}</Text>
                <Text style={[type.bodyStrong, value ? styles.ink : styles.muted]}>{value ?? 'Skipped. Tap to answer.'}</Text>
              </View>
              <Icon name="chevron" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const AHEAD: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'calendar', title: 'Choose a calendar', detail: 'It stays in sync on its own: new, moved and cancelled plans update automatically.' },
  { icon: 'people', title: 'Compare a few recent plans', detail: 'Four quick this-or-that questions.' },
  { icon: 'sun', title: 'See your week ahead', detail: 'How full each day is, and what it’s full of.' },
];

/** Start with a week you know: what the next few steps do. */
export function WeekPlan() {
  return (
    <View style={[styles.stretch, styles.ahead]}>
      {AHEAD.map((a, i) => (
        <View key={a.title} accessible accessibilityLabel={`${a.title}. ${a.detail}`} style={[styles.aheadRow, i > 0 && styles.rule]}>
          <Icon name={a.icon} size={22} />
          <View style={styles.answerText}>
            <Text style={[type.bodyStrong, styles.ink]}>{a.title}</Text>
            <Text style={[type.sub, styles.muted]}>{a.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

type Connection = { id: string; accountEmail: string };

type GoogleState =
  | { kind: 'checking' | 'connecting' | 'email' }
  | { kind: 'linked'; email: string }
  | { kind: 'no-access'; email: string | null };

/**
 * Bring in your week: Google Calendar (linked at Google sign-in; this says so, links it if that didn't
 * happen, or asks for Calendar access), Outlook (in the UI only), pasted notes, or plans by hand.
 */
export function BringInWeek() {
  const router = useRouter();
  const [google, setGoogle] = useState<GoogleState>({ kind: 'checking' });
  const [outlookTapped, setOutlookTapped] = useState(false);

  const check = useCallback(async () => {
    const [list, status] = await Promise.all([
      api<Connection[]>('GET', '/connections'),
      api<{ signedIn: boolean; email: string | null; calendar: boolean }>('GET', '/google-status'),
    ]);
    let linked = list?.[0] ?? null;
    // Signed in with Google and Calendar allowed, but the link didn't happen at sign-in: make it now.
    if (!linked && status?.calendar) {
      setGoogle({ kind: 'connecting' });
      const made = await api<{ account: string }>('POST', '/google-connect', {});
      if (made) linked = { id: '', accountEmail: made.account };
    }
    if (linked) {
      setGoogle({ kind: 'linked', email: linked.accountEmail });
      // Pull it fresh now, so Does this look right shows everything.
      await api('POST', '/google-sync', {});
      await loadLive();
    } else if (status?.signedIn) setGoogle({ kind: 'no-access', email: status.email });
    else setGoogle({ kind: 'email' });
  }, []);
  useEffect(() => void check(), [check]);

  // Signing in again with the same Google account asks for Calendar access; the API links it on return.
  const allow = async () => {
    if (await signInWithGoogle('/onboarding/calendar')) {
      await loadLive();
      await check();
    }
  };

  return (
    <View style={[styles.stretch, styles.options]}>
      <Option
        icon="google"
        title="Google Calendar"
        detail={
          google.kind === 'checking'
            ? 'Checking for your calendar'
            : google.kind === 'connecting'
            ? 'Connecting your calendar'
            : google.kind === 'linked'
            ? `Already connected as ${google.email}. New, moved and cancelled plans update on their own.`
            : google.kind === 'no-access'
            ? `Signed in${google.email ? ` as ${google.email}` : ''}, but Calendar wasn’t allowed. Tap to allow it.`
            : 'Sign in with Google to connect it. New, moved and cancelled plans then update on their own.'
        }
        done={google.kind === 'linked'}
        onPress={google.kind === 'no-access' ? allow : undefined}
      />
      {/* Shown for the demo; Outlook doesn't connect. */}
      <Option
        image={require('@/assets/icons/outlook.png')}
        title="Outlook"
        detail={outlookTapped ? 'Outlook isn’t available yet. Try pasting your schedule instead.' : 'Stays in sync on its own, like Google Calendar.'}
        first={false}
        onPress={() => setOutlookTapped(true)}
      />
      <Option
        icon="paste"
        title="Paste a schedule or notes"
        detail="One plan per line"
        first={false}
        onPress={() => router.push('/plans/paste')}
      />
      <Option
        icon="pencil"
        title="Add plans by hand"
        detail="Title, day and time"
        first={false}
        onPress={() => router.push({ pathname: '/plans/new', params: { then: 'back' } })}
      />
    </View>
  );
}

function Option({
  icon,
  image,
  title,
  detail,
  done = false,
  first = true,
  onPress,
}: {
  icon?: IconName;
  /** A brand mark that's a picture rather than a line icon (Outlook). */
  image?: number;
  title: string;
  detail: string;
  done?: boolean;
  first?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View style={styles.optionIcon}>
        {image ? <Image source={image} style={styles.brand} contentFit="contain" /> : icon && <Icon name={icon} size={22} />}
      </View>
      <View style={styles.answerText}>
        <Text style={[type.bodyStrong, styles.ink]}>{title}</Text>
        <Text style={[type.sub, styles.muted]}>{detail}</Text>
      </View>
      {done ? <Icon name="check" /> : onPress && <Icon name="chevron" />}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.option, !first && styles.rule]}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${title}. ${detail}`} style={[styles.option, !first && styles.rule]}>
      {body}
    </View>
  );
}

/** How many plans this week, for Does this look right's line. */
export function plansFound() {
  return plans.filter((p) => p.start.slice(0, 10) >= week.start && p.start.slice(0, 10) <= week.end && p.kind !== 'rest').length;
}

/** Does this look right: the week on the shelf, and the picked day's plans. Tapping one opens it to correct. */
export function WeekReview() {
  useLive();
  const router = useRouter();
  const [selected, setSelected] = useState(todayIso);
  const dayPlans = plansOn(selected);

  return (
    <View style={styles.stretch}>
      <WeekShelf days={shelfDays(selected)} onSelectDay={setSelected} />
      <View style={styles.dayHead}>
        <Text accessibilityRole="header" style={[type.title, styles.ink]}>
          {weekdayLong(selected)}
        </Text>
        <Text style={[type.foot, styles.muted]}>{`${dayLoadOn(selected)} of ${DAY_ROOM}`}</Text>
      </View>
      {dayPlans.length ? (
        <View style={styles.card}>
          {dayPlans.map((p, i) => (
            <PlanLine key={p.id} plan={p} first={i === 0} onPress={() => router.push({ pathname: '/plans/new', params: { id: p.id } })} />
          ))}
        </View>
      ) : (
        <Text style={[type.sub, styles.muted]}>Nothing on this day.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  center: { textAlign: 'center' },
  heard: { alignItems: 'center', gap: 8, paddingBottom: 24 },
  answers: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: color.fill },
  answer: { minHeight: 72, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  answerText: { flex: 1, gap: 4 },
  rule: { borderTopWidth: 1, borderTopColor: color.rule },
  options: { marginTop: 4 },
  option: { minHeight: 72, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ahead: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: radius.panel, backgroundColor: color.fill },
  aheadRow: { paddingVertical: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  // Icon/outlook (566:2426) is 20x19.
  brand: { width: 20, height: 19 },
  dayHead: { paddingTop: 28, paddingBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  card: { borderRadius: radius.row, backgroundColor: color.paper, boxShadow: shadow.soft, overflow: 'hidden' },
});
