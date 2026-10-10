import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/Pressable';
import { scrapColor } from '@/components/Scrap';
import { invites, type Invite } from '@/data/invites';
import { dayHeading, isoDay, startTime } from '@/lib/format';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

import { WritePlanCard } from './WritePlanCard';

type Tab = 'tentative' | 'write';

/** Weigh a plan: pick an invite you haven't accepted, or write one. From Tory's mockup (not in Figma yet). */
export function WeighPlan() {
  const [tab, setTab] = useState<Tab>('tentative');
  const [selected, setSelected] = useState(invites[0]?.id);
  const [written, setWritten] = useState('');

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
          <>
            <WritePlanCard text={written} onChangeText={setWritten} />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
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
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <Icon name="check" size={18} color={color.paper} />}
      </View>
    </Pressable>
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
  footer: { paddingTop: space[12], paddingHorizontal: space.margin, paddingBottom: space[16], gap: space[12] },
  footnote: { textAlign: 'center' },
});
