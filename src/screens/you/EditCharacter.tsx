import { useRouter } from 'expo-router';
import { useRef, useState, type FC } from 'react';
import { ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BoredEyes from '@/assets/profile/eyes-bored.svg';
import HappyEyes from '@/assets/profile/eyes-happy.svg';
import SleepyEyes from '@/assets/profile/eyes-sleepy.svg';
import { Button } from '@/components/Button';
import { PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { EYES, SHAPES, SWATCHES } from '@/data/profile';
import { saveCharacter, useCharacter, type Character } from '@/features/profile/character';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { CharacterArt } from './CharacterArt';

const eyeArt: Record<Character['eyes'], { Art: FC<SvgProps>; w: number; h: number }> = {
  sleepy: { Art: SleepyEyes, w: 39.1, h: 6.5 },
  happy: { Art: HappyEyes, w: 35.1, h: 15.4 },
  bored: { Art: BoredEyes, w: 37.1, h: 17.7 },
};

const SWATCH_NAMES: Record<(typeof SWATCHES)[number], string> = {
  moodFine: 'Green',
  moodStretched: 'Yellow',
  moodAsleep: 'Pink',
  moodSpent: 'Red',
  scrapWork: 'Blue',
  paintViolet: 'Violet',
  paintCharcoal: 'Charcoal',
};

/** Edit Character (443:3590). Selected states aren't drawn; they follow the DS (ink fill or ring). */
export function EditCharacter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useCharacter();
  const [draft, setDraft] = useState(saved);
  // Each choice shows everywhere at once and saves to the profile shortly after the last change.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = <K extends keyof Character>(key: K, value: Character[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => saveCharacter(next), 400);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={[styles.hero, { paddingTop: insets.top }]}>
        <View style={styles.heroTint} />
        <CharacterArt character={draft} size={132} />
      </View>

      <View style={styles.body}>
        <Text accessibilityRole="header" style={[type.body, styles.ink]}>
          Edit shape
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Edit shape" style={styles.shapes}>
          {SHAPES.map((s) => {
            const on = draft.shape === s.key;
            return (
              <Pressable
                key={s.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={s.label}
                onPress={() => set('shape', s.key)}
                style={styles.shape}>
                <View style={[styles.shapeTile, on && styles.selectedOutline]}>
                  <PaperSpirit mood={s.art} size={61} />
                </View>
                <Text style={[type.foot, styles.ink, styles.center]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text accessibilityRole="header" style={[type.body, styles.ink, styles.section]}>
          Edit color
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Edit color" style={styles.swatches}>
          {SWATCHES.map((c) => {
            const on = draft.color === c;
            return (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={SWATCH_NAMES[c]}
                onPress={() => set('color', c)}
                hitSlop={4}
                style={[styles.swatchRing, on && styles.swatchOn]}>
                <View style={[styles.swatch, { backgroundColor: color[c] }]} />
              </Pressable>
            );
          })}
        </View>

        <Text accessibilityRole="header" style={[type.body, styles.ink, styles.section]}>
          Edit eyes
        </Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Edit eyes" style={styles.eyes}>
          {EYES.map((e) => {
            const on = draft.eyes === e.key;
            const { Art, w, h } = eyeArt[e.key];
            return (
              <Pressable
                key={e.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={e.label}
                onPress={() => set('eyes', e.key)}
                style={[styles.eyeChip, on && styles.eyeChipOn]}>
                <View style={styles.eyeArt}>
                  <Art width={w} height={h} color={on ? color.selInk : color.creatureInk} />
                </View>
                <Text style={[type.body, { color: on ? color.selInk : color.ink }]}>{e.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text accessibilityRole="header" style={[type.body, styles.ink, styles.section]}>
          Height
        </Text>
        <Slider value={draft.height} onChange={(v) => set('height', v)} label="Height" />

        <Button
          label="Save Character!"
          style={styles.save}
          onPress={() => {
            if (pending.current) clearTimeout(pending.current);
            saveCharacter(draft);
            router.back();
          }}
        />
      </View>
    </ScrollView>
  );
}

/** Track + thumb. No slider dependency; responder events drive it. */
function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [width, setWidth] = useState(1);
  const move = (e: GestureResponderEvent) => onChange(Math.min(1, Math.max(0, e.nativeEvent.locationX / width)));
  const step = (d: number) => onChange(Math.min(1, Math.max(0, Math.round((value + d) * 10) / 10)));
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={move}
      onResponderMove={move}
      style={styles.slider}>
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={[styles.thumb, { left: value * (width - 23) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  ink: { color: color.ink },
  center: { textAlign: 'center' },
  hero: { height: 170, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 0, overflow: 'hidden' },
  // Highlight at 25%, as drawn.
  heroTint: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: color.highlight, opacity: 0.25 },
  body: { paddingHorizontal: 17, paddingTop: 16 },
  section: { marginTop: 20 },
  shapes: { marginTop: 17, flexDirection: 'row', gap: 8 },
  shape: { flex: 1, alignItems: 'center' },
  shapeTile: {
    alignSelf: 'stretch',
    height: 98,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: radius.md,
    backgroundColor: color.fill,
    overflow: 'hidden',
  },
  selectedOutline: { borderWidth: 2, borderColor: color.selBg },
  swatches: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  swatchRing: { padding: 2, borderRadius: radius.full, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: color.selBg },
  swatch: { width: 38, height: 38, borderRadius: radius.full },
  eyes: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10, columnGap: 16 },
  eyeChip: {
    width: '46%',
    height: 42,
    paddingLeft: 16,
    gap: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: color.fill,
  },
  eyeChipOn: { backgroundColor: color.selBg },
  eyeArt: { width: 40, alignItems: 'center' },
  slider: { marginTop: 11, height: 23, justifyContent: 'center' },
  track: { height: 4, borderRadius: radius.full, backgroundColor: color.divider },
  thumb: { position: 'absolute', width: 23, height: 23, borderRadius: radius.full, backgroundColor: color.groundDeep },
  save: { marginTop: 25, alignSelf: 'center', width: 268 },
});
