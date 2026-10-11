import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { EYE_ART, eyeFlip, PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { EYES, SHAPES, SWATCHES } from '@/data/profile';
import { saveCharacter, useCharacter, type Character } from '@/features/profile/character';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

import { CharacterArt } from './CharacterArt';

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
      {/* The character stands below the status bar, with room to grow to its full height. */}
      <View style={[styles.hero, { height: insets.top + HERO }]}>
        {/* A wash of the character's own colour. */}
        <View style={[styles.heroTint, { backgroundColor: color[draft.color] }]} />
        <CharacterArt character={draft} size={132} />
        <View style={[styles.back, { top: insets.top + 8 }]}>
          <IconButton icon="back" label="Back" iconSize={24} onPress={() => router.back()} />
        </View>
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
                  <PaperSpirit mood={s.art} size={61} eyes={draft.eyes} />
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={EYE_TILE + 10}
          decelerationRate="fast"
          accessibilityRole="radiogroup"
          accessibilityLabel="Edit eyes"
          style={styles.bleed}
          contentContainerStyle={styles.eyes}>
          {EYES.map((e) => {
            const on = draft.eyes === e.key;
            const eye = EYE_ART[e.key];
            const { Art, w, h } = eye;
            return (
              <Pressable
                key={e.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={e.label}
                onPress={() => set('eyes', e.key)}
                style={[styles.eyeTile, on && styles.selectedOutline]}>
                <View style={eyeFlip(eye)}>
                  <Art width={w * 1.2} height={h * 1.2} color={color.creatureInk} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

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
      // Keeps the drag once it starts, so nothing else (a scroll, a swipe) takes it over.
      onResponderTerminationRequest={() => false}
      style={styles.slider}>
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={[styles.thumb, { left: value * (width - 23) }]} />
    </View>
  );
}

const EYE_TILE = 96;
/** Hero room below the status bar: the tallest character (height at full) plus a little air. */
const HERO = 212;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  ink: { color: color.ink },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 0, overflow: 'hidden' },
  heroTint: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.14 },
  back: { position: 'absolute', left: 17 },
  body: { paddingHorizontal: 17, paddingTop: 16 },
  section: { marginTop: 20 },
  shapes: { marginTop: 17, flexDirection: 'row', gap: 8 },
  shape: { flex: 1, alignItems: 'center' },
  shapeTile: {
    alignSelf: 'stretch',
    // Just taller than the 61-wide character (66), so the tiles don't stand mostly empty.
    height: 74,
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
  bleed: { marginTop: 10, marginHorizontal: -17 },
  eyes: { paddingHorizontal: 17, gap: 10 },
  eyeTile: { width: EYE_TILE, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: color.fill },
  slider: { marginTop: 11, height: 23, justifyContent: 'center' },
  track: { height: 4, borderRadius: radius.full, backgroundColor: color.divider },
  thumb: { position: 'absolute', width: 23, height: 23, borderRadius: radius.full, backgroundColor: color.groundDeep },
  save: { marginTop: 25, alignSelf: 'center', width: 268 },
});
