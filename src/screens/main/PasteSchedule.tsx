import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { TextField } from '@/components/TextField';
import { loadLive } from '@/data/live';
import { send } from '@/lib/api';
import { costFromLength } from '@/lib/energy';
import { dayAndTime } from '@/lib/format';
import { readSchedule } from '@/lib/read-schedule';
import { color, radius, space } from '@/styles/tokens';
import { type } from '@/styles/type';

const EXAMPLE = 'Thu 7pm dinner with Lea’s parents\nFri 9-5 team offsite\nSat 10am-1pm help Theo move';

/**
 * Paste a schedule (Bring in your week): notes, an email or a group chat, one plan a line. The plans
 * it reads show as you type; Add puts them on the week with a kind and cost to correct later.
 */
export function PasteSchedule() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { plans, unread } = readSchedule(text);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/plans'));

  const add = async () => {
    setSaving(true);
    for (const p of plans) {
      const result = await send('POST', '/plans', { ...p, energyCost: costFromLength(p.start, p.end) });
      if ('error' in result) {
        setSaving(false);
        return setError(result.error);
      }
    }
    await loadLive();
    setSaving(false);
    close();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            Paste a schedule
          </Text>
          <Text style={[type.sub, styles.muted]}>From notes, an email or a group chat. Days and times are picked out for you.</Text>
        </View>

        <TextField label="Your schedule" placeholder={EXAMPLE} value={text} onChangeText={setText} rows={6} autoFocus />

        {plans.length > 0 && (
          <View style={styles.found}>
            <Text style={[type.label, styles.ink]}>{`Found ${plans.length} ${plans.length === 1 ? 'plan' : 'plans'}`}</Text>
            <View style={styles.list}>
              {plans.map((p, i) => (
                <View key={i} style={[styles.plan, i > 0 && styles.rule]}>
                  <Text style={[type.bodyStrong, styles.ink, styles.grow]} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={[type.sub, styles.muted]}>{dayAndTime(p.start)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {unread.length > 0 && (
          <Text style={[type.sub, styles.muted]}>
            {`No day and time in ${unread.length === 1 ? 'this line' : 'these lines'}, so ${unread.length === 1 ? 'it’s' : 'they’re'} left out: ${unread.join(', ')}`}
          </Text>
        )}
        {error ? <Text style={[type.sub, styles.over]}>{error}</Text> : null}
      </ScrollView>
      <View style={[styles.pinned, { paddingBottom: Math.max(insets.bottom, 40) }]}>
        <Button
          label={plans.length > 1 ? `Add ${plans.length} plans` : 'Add plan'}
          icon="plus"
          disabled={!plans.length || saving}
          onPress={add}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.margin, paddingBottom: space[20], gap: space[20] },
  topBar: { flexDirection: 'row' },
  heading: { gap: space[12] },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  over: { color: color.error },
  grow: { flex: 1 },
  found: { gap: space[8] },
  list: { borderRadius: radius.md, backgroundColor: color.paper2, overflow: 'hidden' },
  plan: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16] },
  rule: { borderTopWidth: 1, borderTopColor: color.rule },
  pinned: { paddingHorizontal: space.margin, paddingTop: space[12] },
});
