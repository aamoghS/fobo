import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import asleepFace from '@/assets/faces/asleep.svg';
import fineEyes from '@/assets/faces/fine-eyes.svg';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PaperSpirit } from '@/components/PaperSpirit';
import { Pressable } from '@/components/Pressable';
import { Scrap, scrapColor } from '@/components/Scrap';
import { invites, type Invite } from '@/data/invites';
import { dayHeading, isoDay, startTime } from '@/lib/format';
import { seedFrom } from '@/lib/scrap-path';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { WritePlanCard } from './WritePlanCard';

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
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}>
        <View style={styles.topBar}>
          <IconButton icon="back" label="Back" onPress={close} />
          <Text style={[type.bodyStrong, styles.ink]}>Weigh a plan</Text>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>

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
            <WritePlanCard text={written} onChangeText={setWritten} />
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
      <Text style={[type.bodyStrong, active ? styles.selInk : styles.ink]}>{label}</Text>
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
      // Selection goes grey with a black check (design system); the bar keeps the plan's kind.
      style={[styles.row, selected ? styles.rowSelected : styles.rowRule]}>
      <View style={[styles.kindBar, { backgroundColor: kindColor }]} />
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, styles.ink]}>{invite.title}</Text>
        <Text style={[type.sub, styles.muted]}>{`${startTime(invite.start)} · ${invite.with}`}</Text>
      </View>
      <Character invite={invite} kindColor={kindColor} />
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <Icon name="check" size={18} color={color.paper} />}
      </View>
    </Pressable>
  );
}

const CHAR_W = 42;

function Character({ invite, kindColor }: { invite: Invite; kindColor: string }) {
  const c = invite.character;
  if (c === 'sun') return <PaperSpirit mood="bright" size={56} />;
  // Googly eyes run a size up and sit lower than on the shelf, like the mockup.
  const Face = c.face === 'fine' ? fineEyes : asleepFace;
  const faceW = c.face === 'fine' ? 64 : 50;
  const scale = faceW / 46;
  return (
    <View style={styles.character}>
      <Scrap cut={c.cut} fill={kindColor} width={CHAR_W} height={CHAR_W} seed={seedFrom(invite.id)} />
      <View style={[styles.face, { top: c.face === 'fine' ? -5 : 3, left: (CHAR_W - faceW) / 2 }]}>
        <Face width={faceW} height={(c.face === 'fine' ? 30 : 24) * scale} color={color.creatureInk} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: space[28] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  selInk: { color: color.selInk },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Segmented toggle: chips in a fill capsule, the chosen side goes black.
  tabs: { marginTop: space[20], padding: space[4], flexDirection: 'row', borderRadius: radius.full, backgroundColor: color.fill },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  tabActive: { backgroundColor: color.selBg },
  hint: { paddingTop: space[16] },
  dayHeading: { paddingTop: space[28], paddingBottom: space[8] },
  row: {
    minHeight: 84,
    paddingVertical: space[16],
    paddingRight: space[16],
    gap: space[16],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.row,
    overflow: 'hidden',
  },
  rowSelected: { backgroundColor: color.fill },
  rowRule: { borderRadius: 0, borderBottomWidth: 1, borderBottomColor: color.rule },
  kindBar: { position: 'absolute', left: 0, top: space[12], bottom: space[12], width: 4, borderRadius: radius.full },
  rowText: { flex: 1, paddingLeft: space[20], gap: space[4] },
  character: { width: CHAR_W, height: CHAR_W + 2, alignItems: 'center', justifyContent: 'center' },
  face: { position: 'absolute', top: 0, left: 0 },
  radio: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.ink2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: color.selBg, borderColor: color.selBg },
  footer: { paddingTop: space[12], paddingHorizontal: space.margin, gap: space[12] },
  footnote: { textAlign: 'center' },
});
