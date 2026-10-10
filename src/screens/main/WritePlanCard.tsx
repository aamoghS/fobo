import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { people as circle } from '@/data/people';
import { dayAndTime } from '@/lib/format';
import { readPlan } from '@/lib/read-plan';
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
      <Text style={[type.label, styles.ink]}>Your plan</Text>
      {/* The ghost text is the only prompt: Medium in ink-3, the lightest the type ramp goes. */}
      <TextInput
        value={text}
        onChangeText={onChangeText}
        multiline
        placeholder="Dinner Saturday at 7 with Dani…"
        placeholderTextColor={color.ink3}
        accessibilityLabel="Your plan"
        style={[type.body, styles.ink, styles.input]}
      />

      <Pressable accessibilityRole="button" accessibilityLabel="Paste an invite" onPress={paste} hitSlop={8} style={styles.paste}>
        <Icon name="paste" size={20} color={color.ink2} />
        <Text style={[type.sub, styles.muted]}>Paste</Text>
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

/** Insight Row shape (DS): icon, a quiet label over the value, then a way in. */
function Row({ icon, label, value, empty }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[type.foot, styles.muted]}>{label}</Text>
        <Text style={[value ? type.bodyStrong : type.body, value ? styles.ink : styles.faint]} numberOfLines={1}>
          {value ?? empty}
        </Text>
      </View>
      <Icon name="chevron" size={18} color={color.ink2} />
    </View>
  );
}

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
  faint: { color: color.ink3 },
  input: { minHeight: 132, marginTop: space[20], padding: 0, textAlignVertical: 'top', outlineWidth: 0 },
  paste: { alignSelf: 'flex-start', paddingVertical: space[16], gap: space[12], flexDirection: 'row', alignItems: 'center' },
  row: { minHeight: 76, gap: space[16], flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: color.rule },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { flex: 1, gap: 2 },
});
