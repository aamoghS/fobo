import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { TextField } from '@/components/TextField';
import { loadLive, useLiveScreen } from '@/data/live';
import { requests, sent, type Person } from '@/data/people';
import { profile } from '@/data/profile';
import { send } from '@/lib/api';
import { color, space } from '@/styles/tokens';
import { type } from '@/styles/type';

/**
 * Add person (People +): a friend request by email or handle, plus the requests waiting on you and the
 * ones you sent. Not in Figma yet: built from the design system's text field, buttons and list rows.
 */
export function AddPerson() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [who, setWho] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/people'));

  const ask = async () => {
    const value = who.trim();
    if (!value) return;
    setBusy(true);
    // An address with an @ inside is an email; anything else (with or without a leading @) is a handle.
    const result = await send('POST', '/friends', /.@/.test(value) ? { email: value } : { handle: value });
    setBusy(false);
    if ('error' in result) return setNote(result.error === 'already friends or asked' ? 'You’re already friends, or already asked.' : 'No one on Fobo with that email or handle yet.');
    setWho('');
    setNote(`Request sent. ${value} shows up in Your circle once they accept.`);
    await loadLive();
  };

  const answer = async (person: Person, accept: boolean) => {
    setBusy(true);
    await send(accept ? 'POST' : 'DELETE', accept ? `/friends/${person.id}/accept` : `/friends/${person.id}`);
    await loadLive();
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[48]) }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <IconButton icon="back" label="Back to People" onPress={back} />
        </View>
        <Text accessibilityRole="header" style={[type.display, styles.ink]}>
          Add someone
        </Text>

        <TextField
          label="Email or handle"
          placeholder="name@example.com"
          value={who}
          onChangeText={setWho}
          onSubmitEditing={ask}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="send"
          autoFocus
        />
        <Button label="Send request" onPress={ask} disabled={busy || !who.trim()} />
        {note ? <Text style={[type.sub, styles.muted]}>{note}</Text> : null}
        {profile.handle ? <Text style={[type.foot, styles.muted]}>{`Friends can add you as @${profile.handle}.`}</Text> : null}

        {requests.length > 0 && (
          <List title="Asked to add you">
            {requests.map((p, i) => (
              <PersonRow key={p.id} person={p} last={i === requests.length - 1}>
                <Button label="Not now" variant="quiet" size="small" onPress={() => answer(p, false)} disabled={busy} />
                <Button label="Accept" size="small" onPress={() => answer(p, true)} disabled={busy} />
              </PersonRow>
            ))}
          </List>
        )}

        {sent.length > 0 && (
          <List title="Waiting on them">
            {sent.map((p, i) => (
              <PersonRow key={p.id} person={p} last={i === sent.length - 1}>
                <Button label="Cancel" variant="quiet" size="small" onPress={() => answer(p, false)} disabled={busy} />
              </PersonRow>
            ))}
          </List>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function List({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.list}>
      <Text accessibilityRole="header" style={[type.title, styles.ink]}>
        {title}
      </Text>
      <View>{children}</View>
    </View>
  );
}

function PersonRow({ person, last, children }: { person: Person; last: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Avatar person={person} size={46} />
      <View style={[styles.rowText, !last && styles.rule]}>
        <View style={styles.rowLines}>
          <Text style={[type.bodyStrong, styles.ink]} numberOfLines={1}>
            {person.name}
          </Text>
          <Text style={[type.sub, styles.muted]} numberOfLines={1}>
            {person.nextLabel}
          </Text>
        </View>
        <View style={styles.actions}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 120, gap: space[16] },
  topBar: { flexDirection: 'row' },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  list: { paddingTop: space[16], gap: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  rowText: { flex: 1, minHeight: 72, gap: space[8], flexDirection: 'row', alignItems: 'center' },
  rule: { borderBottomWidth: 1, borderBottomColor: color.rule },
  rowLines: { flex: 1 },
  actions: { flexDirection: 'row', gap: space[8] },
});
