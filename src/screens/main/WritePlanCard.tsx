import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { people as circle } from '@/data/people';
import { dayAndTime } from '@/lib/format';
import { readPlan } from '@/lib/read-plan';
import { withAlpha } from '@/styles/alpha';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

/** Write a plan composer from Tory's mockup: the plan as typed, then who and when read out of it. */
export function WritePlanCard({ text, onChangeText }: { text: string; onChangeText: (t: string) => void }) {
  const { people, start } = readPlan(text);
  const first = people[0];
  const person = first && circle.find((p) => p.name.toLowerCase() === first.toLowerCase());
  const withLabel = first ? (people.length > 1 ? `${first} + ${people.length - 1}` : first) : undefined;

  const paste = async () => {
    // Web only for now: native needs expo-clipboard, which isn't a dependency yet.
    if (Platform.OS !== 'web') return;
    const pasted = await navigator.clipboard?.readText().catch(() => '');
    if (pasted) onChangeText(pasted.trim());
  };

  return (
    <View style={styles.card}>
      {/* The ghost text is the only prompt, set lighter than the Medium the plan is typed in. */}
      <TextInput
        value={text}
        onChangeText={onChangeText}
        multiline
        placeholder="Dinner Saturday at 7 with Dani…"
        placeholderTextColor={GHOST}
        accessibilityLabel="Your plan"
        style={[type.body, styles.ink, styles.input, !text && styles.ghost]}
      />

      <Pressable accessibilityRole="button" accessibilityLabel="Paste an invite" onPress={paste} hitSlop={8} style={styles.paste}>
        <Icon name="paste" size={16} color={color.ink2} />
        <Text style={[type.subStrong, styles.muted]}>Paste</Text>
      </Pressable>

      <Row
        icon={person ? <Avatar person={person} size={24} /> : <Icon name="people" size={22} color={color.ink2} />}
        label="People"
        value={withLabel}
        empty="Add people"
      />
      <Row icon={<Icon name="calendar" size={22} color={color.ink2} />} label="When" value={start ? dayAndTime(start) : undefined} empty="Add date & time" />
    </View>
  );
}

type RowProps = { icon: ReactNode; label: string; value?: string; empty: string };

/** Icon, the value (or a ghost prompt), then a way in. The label is only for screen readers. */
function Row({ icon, label, value, empty }: RowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value ?? 'not set'}`}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={[type.body, styles.rowText, value ? styles.ink : styles.ghost]} numberOfLines={1}>
        {value ?? empty}
      </Text>
      <Icon name="chevron" size={18} color={color.ink2} />
    </View>
  );
}

// Ghost prompts sit a step lighter than ink-3 (the lightest token): ink at 34%, in Regular.
// The plan as typed and the values read out of it stay Medium in ink.
const GHOST = withAlpha(color.ink, 0.34);

const styles = StyleSheet.create({
  // A composer: paper on the drawer's ground, edged with a hairline.
  card: {
    marginTop: space[20],
    paddingTop: space[20],
    paddingHorizontal: space[20],
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.paper,
  },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  ghost: { fontFamily: 'DMSans_400Regular', color: GHOST },
  input: { minHeight: 132, padding: 0, textAlignVertical: 'top', outlineWidth: 0 },
  // Small quiet pill, like the DS's small button.
  paste: {
    alignSelf: 'flex-start',
    marginVertical: space[16],
    height: 32,
    paddingHorizontal: space[12],
    gap: space[8],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: color.fill,
  },
  row: { minHeight: 64, gap: space[16], flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: color.rule },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { flex: 1 },
});
