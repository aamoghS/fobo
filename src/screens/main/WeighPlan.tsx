import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import asleepFace from '@/assets/faces/asleep.svg';
import fineFace from '@/assets/faces/fine.svg';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { Scrap, scrapColor } from '@/components/Scrap';
import { invites, type Invite } from '@/data/invites';
import { dayHeading, isoDay, startTime } from '@/lib/format';
import { seedFrom } from '@/lib/scrap-path';
import { withAlpha } from '@/styles/alpha';
import { color, radius } from '@/styles/tokens';
import { type } from '@/styles/type';

type Tab = 'tentative' | 'write';

/** Weigh a plan: pick an invite you haven't accepted, or write one. From Tory's mockup (not in Figma yet). */
export function WeighPlan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('tentative');
  const [selected, setSelected] = useState(invites[0]?.id);
  const [written, setWritten] = useState('');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/week'));

  const days = [...new Set(invites.map((i) => isoDay(i.start)))];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={close} hitSlop={10} style={styles.barButton}>
            <Icon name="back" size={24} />
          </Pressable>
          <Text style={[type.bodyStrong, styles.ink]}>Weigh a plan</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={10} style={styles.barButton}>
            <Icon name="close" size={24} />
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={[type.heroScreen, styles.ink, styles.title]}>
          What’s the plan?
        </Text>

        <View style={styles.tabs} accessibilityRole="tablist">
          <TabButton label="Tentative plans" active={tab === 'tentative'} onPress={() => setTab('tentative')} />
          <TabButton label="Write a plan" active={tab === 'write'} onPress={() => setTab('write')} />
        </View>

        {tab === 'tentative' ? (
          <>
            <Text style={[type.sub, styles.muted, styles.hint]}>Invites you haven’t accepted yet.</Text>
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
          <>
            <Text style={[type.sub, styles.muted, styles.hint]}>Something you’re thinking about saying yes to.</Text>
            <TextInput
              value={written}
              onChangeText={setWritten}
              placeholder="Drinks with Lea on Friday"
              placeholderTextColor={color.ink3}
              accessibilityLabel="The plan"
              style={[type.body, styles.ink, styles.input]}
            />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {tab === 'tentative' && <Text style={[type.sub, styles.muted, styles.footnote]}>This won’t accept the invite.</Text>}
        {/* The weighing step itself isn't designed yet. */}
        <Button
          label="Weigh this plan"
          trailingIcon="arrow"
          disabled={tab === 'tentative' ? !selected : !written.trim()}
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
      <Text style={[type.bodyStrong, active ? styles.ink : styles.faint]}>{label}</Text>
    </Pressable>
  );
}

function InviteRow({ invite, selected, onPress }: { invite: Invite; selected: boolean; onPress: () => void }) {
  const kindColor = scrapColor[invite.kind];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${invite.title}, ${startTime(invite.start)}, ${invite.with}`}
      onPress={onPress}
      style={[
        styles.row,
        selected
          ? { backgroundColor: withAlpha(kindColor, 0.06), borderColor: withAlpha(kindColor, 0.3) }
          : styles.rowRule,
      ]}>
      <View style={[styles.kindBar, { backgroundColor: kindColor }]} />
      <View style={styles.rowText}>
        <Text style={[type.itemTitle, styles.ink]}>{invite.title}</Text>
        <Text style={[type.sub, styles.muted]}>{`${startTime(invite.start)} · ${invite.with}`}</Text>
      </View>
      <Character invite={invite} />
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <Icon name="check" size={18} color={color.paper} />}
      </View>
    </Pressable>
  );
}

const CHAR_W = 40;

function Character({ invite }: { invite: Invite }) {
  const c = invite.character;
  if (c === 'sun') return <PaperSpirit mood="bright" size={54} />;
  const Face = c.face === 'fine' ? fineFace : asleepFace;
  const scale = CHAR_W / 46;
  return (
    <View style={styles.character}>
      <Scrap cut={c.cut} width={CHAR_W} height={36} seed={seedFrom(invite.id)} />
      <View style={styles.face}>
        <Face width={CHAR_W} height={(c.face === 'fine' ? 30 : 24) * scale} color={color.creatureInk} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.groundAlt },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  faint: { color: color.ink3 },
  topBar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { paddingTop: 28 },
  tabs: { paddingTop: 22, flexDirection: 'row', gap: 24 },
  tab: { flex: 1, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: color.ink },
  hint: { paddingTop: 22 },
  dayHeading: { paddingTop: 26, paddingBottom: 10 },
  row: {
    minHeight: 78,
    paddingVertical: 14,
    paddingRight: 14,
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  rowRule: { borderRadius: 0, borderBottomColor: color.rule },
  kindBar: { alignSelf: 'stretch', width: 4, borderRadius: radius.full },
  rowText: { flex: 1, paddingLeft: 10, gap: 2 },
  character: { width: CHAR_W, height: 40 },
  face: { position: 'absolute', top: 0, left: 0 },
  radio: {
    width: 26,
    height: 26,
    marginLeft: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.ink2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: color.ink, borderColor: color.ink },
  input: {
    marginTop: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.rule,
  },
  footer: { paddingTop: 12, paddingHorizontal: 20, gap: 12 },
  footnote: { textAlign: 'center' },
});
