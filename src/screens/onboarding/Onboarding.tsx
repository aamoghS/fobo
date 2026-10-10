import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, type FC, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AloneArt from '@/assets/illustrations/onboarding/answer-alone.svg';
import DependsArt from '@/assets/illustrations/onboarding/answer-depends.svg';
import PeopleArt from '@/assets/illustrations/onboarding/answer-people.svg';
import BathArt from '@/assets/illustrations/onboarding/bubble-bath.svg';
import TrioArt from '@/assets/illustrations/onboarding/quiet-trio.svg';
import NookArt from '@/assets/illustrations/onboarding/reading-nook.svg';
import RechargingArt from '@/assets/illustrations/onboarding/recharging.svg';
import BedArt from '@/assets/illustrations/onboarding/sleepy-bed.svg';
import { AnswerCard } from '@/components/AnswerCard';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { Progress } from '@/components/Progress';
import { RadioGroup } from '@/components/RadioRow';
import { loadLive } from '@/data/live';
import { answers } from '@/features/profile/onboarding';
import { api } from '@/lib/api';
import { color, radius, shadow } from '@/styles/tokens';
import { type } from '@/styles/type';

export const STEPS = ['start', 'recharge', 'head-home', 'yourself', 'transition', 'compare'] as const;
export type Step = (typeof STEPS)[number];

// Four segments: the three questions, then the comparison (transition + pairs).
const PROGRESS: Record<Step, number> = { start: 0, recharge: 1, 'head-home': 2, yourself: 3, transition: 4, compare: 4 };

/** `editing`: opened from Capacity Profile to change one answer; Next and Skip go back there. */
export function OnboardingStep({ step, editing = false }: { step: Step; editing?: boolean }) {
  const router = useRouter();
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
          <Art Svg={TrioArt} width={295} />
          <Copy title="Now, for some questions about you." body="A few quick ones so Fobo can guess how tall your days stack up. It learns the rest from your week." />
        </Frame>
      );
    case 'recharge':
      return (
        <Frame step={step} onNext={next} editing={editing}>
          <Art Svg={BedArt} width={147} />
          {/* "recharge" has no question mark in Figma; copied as drawn. */}
          <Copy title="How do you usually recharge" body="No wrong answer. It's a starting guess, not a label." />
          <RechargeAnswers />
        </Frame>
      );
    case 'head-home':
      return (
        <Frame step={step} onNext={next} editing={editing}>
          <Art Svg={RechargingArt} width={162} />
          <Copy lead="Think of your last group hangout." title="When did you start wanting to head home?" />
          <Radios
            step={step}
            label="When did you start wanting to head home?"
            options={['In the first hour', 'After 1 to 2 hours', 'After 2 to 3 hours', 'I stayed happily to the end']}
          />
        </Frame>
      );
    case 'yourself':
      return (
        <Frame step={step} onNext={next} editing={editing}>
          <Art Svg={BathArt} width={180} />
          <Copy title="After a big social day, when do you feel like yourself again" />
          <Radios
            step={step}
            label="After a big social day, when do you feel like yourself again"
            options={['Same evening', 'Next morning', 'After a day', '2 to 3 days', 'Longer']}
          />
        </Frame>
      );
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
      : i === STEPS.length - 1
      ? router.replace('/week')
      : router.push({ pathname: '/onboarding/[step]', params: { step: STEPS[i + 1] } });
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={13} style={styles.headerSide}>
        <Icon name="back" />
      </Pressable>
      <View style={styles.progress}>
        <Progress step={PROGRESS[step]} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={skip} hitSlop={13} style={styles.headerSide}>
        <Text style={[type.label, styles.skip]}>Skip</Text>
      </Pressable>
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
  children,
}: {
  step: Step;
  onNext: () => void;
  cta?: string;
  gap?: number;
  editing?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.frame, { paddingTop: Math.max(insets.top, 40), paddingBottom: Math.max(insets.bottom, 40) }]}>
      {/* Start keeps the header's space but hides it (opacity 0 in Figma). */}
      {step === 'start' ? <View style={styles.headerSpace} /> : <Header step={step} editing={editing} />}
      <View style={[styles.body, { gap }]}>{children}</View>
      <Button label={cta} onPress={onNext} />
    </ScrollView>
  );
}

function Art({ Svg, width }: { Svg: FC<SvgProps>; width: number }) {
  return (
    <View style={styles.art} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={155} />
    </View>
  );
}

function Copy({ lead, title, body, mutedBody }: { lead?: string; title: string; body?: string; mutedBody?: boolean }) {
  return (
    <View style={styles.copy}>
      {lead && <Text style={[type.sub, styles.muted]}>{lead}</Text>}
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

function RechargeAnswers() {
  const [value, setValue] = useState(answers.recharge ?? null);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How do you usually recharge" style={styles.answers}>
      {RECHARGE.map((a) => (
        <AnswerCard
          key={a.value}
          title={a.title}
          caption={a.caption}
          Art={a.Art}
          selected={value === a.value}
          onPress={() => setValue((answers.recharge = a.value))}
        />
      ))}
    </View>
  );
}

function Radios({ step, label, options }: { step: Step; label: string; options: string[] }) {
  const [value, setValue] = useState(answers[step] ?? null);
  return (
    <View style={styles.radios}>
      <RadioGroup
        label={label}
        options={options.map((o) => ({ value: o, label: o }))}
        value={value}
        onChange={(v) => setValue((answers[step] = v))}
      />
    </View>
  );
}

// Only the first pair is designed (446:4427); "Four quick taps" needs the other three.
const PAIR = [
  { id: 'lea-parents', title: 'Dinner with Lea’s parents', meta: 'Thu, Oct 8 - 2.5h', art: require('@/assets/illustrations/onboarding/compare-dinner.png'), badge: require('@/assets/illustrations/onboarding/badge-dinner.png') },
  { id: 'offsite-drinks', title: 'Offsite drinks at a bar', meta: 'Fri, Oct 9 - 1.5h', art: require('@/assets/illustrations/onboarding/compare-drinks.png'), badge: require('@/assets/illustrations/onboarding/badge-drinks.png') },
];

/** Energy comparison (446:4427). */
function Compare({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const pick = (id: string) => {
    answers.compare = id;
    onDone();
  };
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.compare, { paddingTop: Math.max(insets.top, 40), paddingBottom: insets.bottom }]}>
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
        {PAIR.map((a) => (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${a.title}, ${a.meta}`} onPress={() => pick(a.id)} style={styles.card}>
            <View style={styles.cardArt}>
              <Image source={a.art} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
            <View style={styles.badge}>
              <Image source={a.badge} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
            <View style={styles.cardText}>
              <Text style={[type.title, styles.strong]}>{a.title}</Text>
              <Text style={[type.sub, styles.muted]}>{a.meta}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.compareFooter}>
        <Button label="About the Same" style={styles.stretch} onPress={() => pick('same')} />
        <Pressable accessibilityRole="button" onPress={() => pick('unknown')} hitSlop={12}>
          <Text style={[type.sub, styles.faint]}>Can’t remember</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  frame: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
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
  copy: { alignSelf: 'stretch', gap: 16 },
  answers: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginHorizontal: -6 },
  radios: { alignSelf: 'stretch' },
  compare: { flexGrow: 1 },
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
  compareFooter: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingBottom: 40 },
  stretch: { alignSelf: 'stretch' },
});
