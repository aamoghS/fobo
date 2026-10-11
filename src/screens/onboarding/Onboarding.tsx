import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState, type FC, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AloneArt from '@/assets/illustrations/onboarding/answer-alone.svg';
import DependsArt from '@/assets/illustrations/onboarding/answer-depends.svg';
import PeopleArt from '@/assets/illustrations/onboarding/answer-people.svg';
import BathArt from '@/assets/illustrations/onboarding/bubble-bath.svg';
import NookArt from '@/assets/illustrations/onboarding/reading-nook.svg';
import { AnswerCard } from '@/components/AnswerCard';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { Progress } from '@/components/Progress';
import { RadioGroup } from '@/components/RadioRow';
import { loadLive } from '@/data/live';
import { localDay, mondayOf } from '@/data/week';
import type { Plan } from '@/features/plans/types';
import { answers, chooseAnswer } from '@/features/profile/onboarding';
import { api } from '@/lib/api';
import { shortDateRange } from '@/lib/format';
import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';
import { DAY_ROOM } from '@fobo/core/constants';
import { ONBOARDING } from '@fobo/core/options';

import { QuietTrio } from './QuietTrio';
import { Recharging } from './Recharging';
import { SleepyBed } from './SleepyBed';
import { CalendarArt } from './CalendarArt';
import { AnswerSummary, WeekPlan, BringInWeek, WeekReview, plansFound } from './WeekSetup';

export const STEPS = ['start', 'recharge', 'head-home', 'yourself', 'profile', 'week-intro', 'calendar', 'review', 'transition', 'compare'] as const;
export type Step = (typeof STEPS)[number];

// Four segments: the three questions, then your week (bring it in, check it, compare). The profile
// summary, the week intro and Bring in your week sit between with just a back button.
const PROGRESS: Record<Step, number | null> = {
  start: 0,
  recharge: 1,
  'head-home': 2,
  yourself: 3,
  profile: null,
  'week-intro': null,
  calendar: null,
  review: 4,
  transition: 4,
  compare: 4,
};

// Steps with Skip but no progress bar, and where Skip goes: past the calendar, to the week as it is.
const SKIP_TO: Partial<Record<Step, Step>> = { 'week-intro': 'review' };

/** `editing`: opened from Capacity Profile to change one answer; Next and Skip go back there. */
export function OnboardingStep({ step, editing = false }: { step: Step; editing?: boolean }) {
  const router = useRouter();
  // The question steps hold Next back until something's picked. Skip still moves on.
  const [picked, setPicked] = useState(answers[step] ?? null);
  // Each answer saves to the profile as it's picked (src/features/profile/onboarding.ts).
  const pick = (v: string) => setPicked(chooseAnswer(step, v));
  // Answers save to the profile, then the app reloads it so the You tab shows the change.
  const save = async (changed: Partial<Record<Step, string>>) => {
    if (await api('PATCH', '/me', { onboarding: changed })) await loadLive();
  };
  const next = async () => {
    const i = STEPS.indexOf(step);
    if (editing) {
      if (answers[step]) await save({ [step]: answers[step] });
      router.back();
    } else if (i === STEPS.length - 1) {
      await save(answers);
      router.replace('/week');
    } else router.push({ pathname: '/onboarding/[step]', params: { step: STEPS[i + 1] } });
  };

  switch (step) {
    case 'start':
      return (
        <Frame step={step} onNext={next} cta="Continue" gap={40}>
          <Art Svg={QuietTrio} width={295} />
          <Copy title="Now, for some questions about you." body="A few quick ones so Fobo can guess how tall your days stack up. It learns the rest from your week." />
        </Frame>
      );
    case 'recharge':
      return (
        <Frame step={step} onNext={next} editing={editing} ready={!!picked}>
          <Art Svg={SleepyBed} width={147} />
          {/* "recharge" has no question mark in Figma; copied as drawn. */}
          <Copy title="How do you usually recharge" body="No wrong answer. It's a starting guess, not a label." mutedBody gap={12} />
          <RechargeAnswers value={picked} onChange={pick} />
        </Frame>
      );
    case 'head-home':
      return (
        <Frame step={step} onNext={next} editing={editing} ready={!!picked}>
          <Art Svg={Recharging} width={162} />
          <Copy title="At your last hangout, when did you feel ready to head home?" />
          <Radios
            value={picked}
            onChange={pick}
            label="At your last hangout, when did you feel ready to head home?"
            options={[...ONBOARDING['head-home']!]}
          />
        </Frame>
      );
    case 'yourself':
      return (
        <Frame step={step} onNext={next} editing={editing} ready={!!picked}>
          <Art Svg={BathArt} width={180} />
          <Copy title="After a big social day, when do you feel like yourself again" />
          <Radios
            value={picked}
            onChange={pick}
            label="After a big social day, when do you feel like yourself again"
            options={[...ONBOARDING.yourself!]}
          />
        </Frame>
      );
    case 'profile':
      return (
        <Frame step={step} onNext={next} cta="Looks right">
          <AnswerSummary />
        </Frame>
      );
    case 'week-intro':
      return (
        <Frame
          step={step}
          onNext={next}
          cta="Connect calendar"
          ctaIcon="calendar">
          <Copy
            title="Start with a week you know."
            body="Connect your calendar. Fobo compares a few of last week’s plans, then forecasts the week ahead."
            mutedBody
            gap={12}
          />
          <CalendarArt />
          <WeekPlan />
        </Frame>
      );
    case 'calendar':
      return (
        <Frame step={step} onNext={next} cta="Continue">
          <Copy
            title="Bring in your week"
            body="Fobo reads titles and times, then guesses what each plan costs. You can correct every guess."
            mutedBody
          />
          <BringInWeek />
        </Frame>
      );
    case 'review': {
      const found = plansFound();
      return (
        <Frame step={step} onNext={next} cta="Looks right">
          <Copy
            title="Does this look right?"
            body={
              found
                ? `Found ${found} ${found === 1 ? 'plan' : 'plans'} this week. Each has a guessed type and energy cost. Tap a plan to correct either.`
                : 'No plans this week yet. Add a few by hand, or carry on and Fobo learns as you go.'
            }
            mutedBody
          />
          <WeekReview />
        </Frame>
      );
    }
    case 'transition':
      return (
        <Frame step={step} onNext={next} gap={40}>
          <Art Svg={NookArt} width={150} />
          <Copy
            title="Now, let’s take a look together at last week."
            body="We'll show a few of your plans in pairs. Just pick which one cost you more. Four quick taps."
            mutedBody
          />
        </Frame>
      );
    case 'compare':
      return <Compare onDone={next} />;
  }
}

function Header({ step, editing = false }: { step: Step; editing?: boolean }) {
  const router = useRouter();
  const i = STEPS.indexOf(step);
  const skip = () =>
    editing
      ? router.back()
      : SKIP_TO[step]
      ? router.push({ pathname: '/onboarding/[step]', params: { step: SKIP_TO[step]! } })
      : i === STEPS.length - 1
      ? router.replace('/week')
      : router.push({ pathname: '/onboarding/[step]', params: { step: STEPS[i + 1] } });
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={13} style={styles.headerSide}>
        <Icon name="back" />
      </Pressable>
      {PROGRESS[step] !== null && (
        <View style={styles.progress}>
          <Progress step={PROGRESS[step]} />
        </View>
      )}
      {(PROGRESS[step] !== null || SKIP_TO[step]) && (
        <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={skip} hitSlop={13} style={styles.headerSide}>
          <Text style={[type.label, styles.skip]}>Skip</Text>
        </Pressable>
      )}
    </View>
  );
}

/** px20 py40: header on top, content sat above the bottom button. */
function Frame({
  step,
  onNext,
  cta = 'Next',
  gap = 20,
  editing = false,
  ready = true,
  ctaIcon,
  children,
}: {
  step: Step;
  onNext: () => void;
  cta?: string;
  gap?: number;
  editing?: boolean;
  /** False greys out the button. */
  ready?: boolean;
  ctaIcon?: IconName;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.frame, { paddingTop: Math.max(insets.top, 40) }]}>
        {/* Start keeps the header's space but hides it (opacity 0 in Figma). */}
        {step === 'start' ? <View style={styles.headerSpace} /> : <Header step={step} editing={editing} />}
        <View style={[styles.body, { gap }]}>{children}</View>
      </ScrollView>
      {/* Pinned, so the button sits in the same spot on every step however long the content runs. */}
      <View style={[styles.pinned, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        <Button label={cta} icon={ctaIcon} disabled={!ready} onPress={onNext} />
      </View>
    </View>
  );
}

function Art({ Svg, width }: { Svg: FC<SvgProps>; width: number }) {
  return (
    <View style={styles.art} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={155} />
    </View>
  );
}

function Copy({
  title,
  body,
  mutedBody,
  gap = 16,
}: {
  title: string;
  body?: string;
  mutedBody?: boolean;
  gap?: number;
}) {
  return (
    <View style={[styles.copy, { gap }]}>
      <Text accessibilityRole="header" style={[type.display, styles.ink]}>
        {title}
      </Text>
      {body && <Text style={[type.sub, mutedBody ? styles.muted : styles.ink]}>{body}</Text>}
    </View>
  );
}

const RECHARGE = [
  { value: 'alone', title: 'Mostly alone', caption: 'Quiet time', Art: AloneArt },
  { value: 'depends', title: 'It depends', caption: 'A bit of both', Art: DependsArt },
  { value: 'people', title: 'With people', caption: 'Company time', Art: PeopleArt },
];

type Answer = { value: string | null; onChange: (v: string) => void };

function RechargeAnswers({ value, onChange }: Answer) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How do you usually recharge" style={styles.answers}>
      {RECHARGE.map((a) => (
        <AnswerCard
          key={a.value}
          title={a.title}
          caption={a.caption}
          Art={a.Art}
          selected={value === a.value}
          onPress={() => onChange(a.value)}
        />
      ))}
    </View>
  );
}

function Radios({ value, onChange, label, options }: Answer & { label: string; options: string[] }) {
  return (
    <View style={styles.radios}>
      <RadioGroup
        label={label}
        options={options.map((o) => ({ value: o, label: o }))}
        value={value}
        onChange={onChange}
      />
    </View>
  );
}

// The drawn pair's art (446:4427), one per side.
const ART = [
  { art: require('@/assets/illustrations/onboarding/compare-dinner.png'), badge: require('@/assets/illustrations/onboarding/badge-dinner.png') },
  { art: require('@/assets/illustrations/onboarding/compare-drinks.png'), badge: require('@/assets/illustrations/onboarding/badge-drinks.png') },
];
/** "Four quick taps". */
const PAIRS = 4;

/** Last week's plans that took something, costliest first, two at a time. */
function pairsFrom(list: Plan[]) {
  const picked = list
    .filter((p) => p.status === 'accepted' && p.kind !== 'rest' && p.energyCost > 0)
    .sort((a, b) => b.energyCost - a.energyCost)
    .slice(0, PAIRS * 2);
  const pairs: [Plan, Plan][] = [];
  for (let i = 0; i + 1 < picked.length; i += 2) pairs.push([picked[i], picked[i + 1]]);
  return pairs;
}

/** "Thu, Oct 8 - 2.5h". */
const meta = (p: Plan) =>
  `${shortDateRange(p.start, p.end).split(' · ')[0]} - ${Math.round((Date.parse(p.end) - Date.parse(p.start)) / 18e5) / 2}h`;

/** Energy comparison (446:4427), with pairs from the user's own last week. */
function Compare({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [pairs, setPairs] = useState<[Plan, Plan][] | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const monday = mondayOf();
    const last = new Date(monday);
    last.setDate(monday.getDate() - 7);
    void api<Plan[]>('GET', `/plans?from=${localDay(last)}T00:00&to=${localDay(monday)}T00:00`).then((list) => {
      const found = pairsFrom(list ?? []);
      // Nothing to compare yet (a new calendar): this step has nothing to ask.
      if (!found.length) onDone();
      else setPairs(found);
    });
  }, []);

  const pair = pairs?.[n];
  const pick = (choice: 0 | 1 | 'same' | 'unknown') => {
    if (pair && typeof choice === 'number') {
      const [more, less] = choice === 0 ? pair : [pair[1], pair[0]];
      chooseAnswer('compare', more.id);
      // It took more than the other, so it weighs more from now on.
      if (more.energyCost <= less.energyCost) {
        void api('PATCH', `/plans/${more.id}`, { energyCost: Math.min(DAY_ROOM, less.energyCost + 0.5) });
      }
    } else chooseAnswer('compare', String(choice));
    if (pairs && n + 1 < pairs.length) setN(n + 1);
    else onDone();
  };
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.compare, { paddingTop: Math.max(insets.top, 40) }]}>
        <View style={styles.compareHeader}>
          <Header step="compare" />
        </View>
        <View style={styles.question}>
          <Text accessibilityRole="header" style={[type.display, styles.strong]}>
            Which activity took more energy?
          </Text>
          <Text style={[type.sub, styles.muted]}>Think about how you felt afterward.</Text>
        </View>
        <View style={styles.activities}>
          {pair?.map((a, i) => (
            <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${a.title}, ${meta(a)}`} onPress={() => pick(i as 0 | 1)} style={styles.card}>
              <View style={styles.cardArt}>
                <Image source={ART[i].art} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
              <View style={styles.badge}>
                <Image source={ART[i].badge} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
              <View style={styles.cardText}>
                <Text style={[type.title, styles.strong]}>{a.title}</Text>
                <Text style={[type.sub, styles.muted]}>{meta(a)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.compareFooter, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        <Button label="About the Same" style={styles.stretch} onPress={() => pick('same')} />
        <Pressable accessibilityRole="button" onPress={() => pick('unknown')} hitSlop={12}>
          <Text style={[type.sub, styles.faint]}>Can’t remember</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  scroll: { flex: 1 },
  frame: { flexGrow: 1, paddingHorizontal: 20 },
  pinned: { paddingHorizontal: 20 },
  ink: { color: color.ink },
  strong: { color: color.inkStrong },
  muted: { color: color.ink2 },
  faint: { color: color.ink3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { width: 28, alignItems: 'center', justifyContent: 'center' },
  headerSpace: { height: 24 },
  progress: { width: 241 },
  skip: { color: color.ink2, textAlign: 'center' },
  body: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: 40, paddingBottom: 68 },
  art: { height: 155, alignItems: 'center' },
  copy: { alignSelf: 'stretch' },
  answers: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginHorizontal: -6 },
  radios: { alignSelf: 'stretch' },
  compare: { flexGrow: 1, paddingBottom: 20 },
  compareHeader: { paddingHorizontal: 20 },
  question: { paddingTop: 40, paddingBottom: 20, paddingHorizontal: 19, gap: 16 },
  activities: { paddingHorizontal: 14, gap: 10, flexDirection: 'row', alignItems: 'flex-start' },
  card: {
    flex: 1,
    paddingTop: 11,
    paddingBottom: 12,
    paddingHorizontal: 10,
    gap: 29,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    boxShadow: shadow.soft,
    overflow: 'hidden',
  },
  cardArt: { height: 137, borderRadius: radius.lg, overflow: 'hidden' },
  badge: { position: 'absolute', left: 15, top: 115, width: 55, height: 55, borderRadius: radius.full, overflow: 'hidden' },
  cardText: { paddingHorizontal: 4, gap: 8 },
  compareFooter: { alignItems: 'center', gap: 16, paddingHorizontal: 18 },
  stretch: { alignSelf: 'stretch' },
});
