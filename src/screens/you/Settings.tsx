import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Pressable } from '@/components/Pressable';
import { Sheet } from '@/components/Sheet';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { loadLive, signOut, useLiveScreen } from '@/data/live';
import { profile } from '@/data/profile';
import { api, API_URL, send } from '@/lib/api';
import { linkGoogle, signInWithGoogle } from '@/lib/google-auth';
import { notify } from '@/lib/notify';
import { color, radius, shadow, space } from '@/styles/tokens';
import { type } from '@/styles/type';

type Me = { name: string | null; handle: string; email: string | null; shareBlocks: boolean; shareScores: boolean };
type Connection = { id: string; accountEmail: string; writeBack: boolean };
type Google =
  | { kind: 'checking' }
  | { kind: 'linked'; connection: Connection }
  | { kind: 'no-access'; email: string | null }
  | { kind: 'email' };
type Editing = { field: 'name' | 'handle'; value: string; error?: string } | null;

// What the database takes for a username (profiles.handle in db/migrations/001_schema.sql).
const HANDLE = /^[a-z0-9_]{3,24}$/;

/**
 * Settings, after Settings (443:3555), refreshed to the app's card rows: your account (name and
 * username edit in a sheet), Google Calendar, what friends can see, your profile, and the fine print.
 */
export function Settings() {
  useLiveScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<Me | null>(null);
  const [google, setGoogle] = useState<Google>({ kind: 'checking' });
  const [outlookTapped, setOutlookTapped] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<'ask' | 'working' | null>(null);

  const load = useCallback(async () => {
    const [mine, list, status] = await Promise.all([
      api<Me>('GET', '/me'),
      api<Connection[]>('GET', '/connections'),
      api<{ signedIn: boolean; email: string | null }>('GET', '/google-status'),
    ]);
    if (mine) setMe(mine);
    const linked = list?.[0];
    if (linked) setGoogle({ kind: 'linked', connection: linked });
    else if (status?.signedIn) setGoogle({ kind: 'no-access', email: status.email });
    else setGoogle({ kind: 'email' });
  }, []);
  useEffect(() => void load(), [load]);

  // A switch flips at once and goes back if the save fails.
  const share = async (key: 'shareBlocks' | 'shareScores', on: boolean) => {
    if (!me) return;
    setMe({ ...me, [key]: on });
    if (!(await api('PATCH', '/me', { [key]: on }))) {
      setMe((m) => m && { ...m, [key]: !on });
      notify("Couldn't save that. Try again in a moment.");
    }
  };

  const writeBack = async (on: boolean) => {
    if (google.kind !== 'linked') return;
    const { connection } = google;
    setGoogle({ kind: 'linked', connection: { ...connection, writeBack: on } });
    if (!(await api('PATCH', `/connections/${connection.id}`, { writeBack: on }))) {
      setGoogle({ kind: 'linked', connection });
      notify("Couldn't save that. Try again in a moment.");
    }
  };

  const disconnect = async () => {
    if (google.kind !== 'linked') return;
    if (!(await api('DELETE', `/connections/${google.connection.id}`))) return notify("Couldn't disconnect. Try again in a moment.");
    await loadLive();
    await load();
  };

  // An email account links Google to itself; the API links Calendar on the way back.
  const link = async () => {
    try {
      if (!(await linkGoogle('/you/settings'))) return;
      await loadLive();
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Google sign-in failed. Try again.');
    }
  };

  const save = async () => {
    if (!editing) return;
    const isHandle = editing.field === 'handle';
    const trimmed = editing.value.trim().replace(/^@/, '');
    // Usernames are stored lowercase, so "Mia_K" saves as "mia_k".
    const value = isHandle ? trimmed.toLowerCase() : trimmed;
    if (!value) return setEditing({ ...editing, error: isHandle ? 'Add a username.' : 'Add your name.' });
    if (isHandle && !HANDLE.test(value)) return setEditing({ ...editing, error: 'Use 3 to 24 letters, numbers or underscores.' });
    setSaving(true);
    const res = await send<Me>('PATCH', '/me', { [editing.field]: value });
    setSaving(false);
    if ('error' in res) {
      // The API answers 'invalid input' when the database says no; with the pattern checked above, that's a taken username.
      const taken = isHandle && res.error === 'invalid input';
      return setEditing({ ...editing, error: taken ? 'That username is taken. Try another.' : "Couldn't save that. Try again." });
    }
    setMe(res.data);
    setEditing(null);
    await loadLive();
  };

  const deleteAccount = async () => {
    setDeleting('working');
    if (!(await api('DELETE', '/me'))) {
      setDeleting('ask');
      return notify("Couldn't delete your account. Try again in a moment.");
    }
    setDeleting(null);
    signOut();
    router.replace('/welcome');
  };

  const name = me?.name || profile.name;
  const handle = me?.handle || profile.handle;
  const email = me?.email || profile.email;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, space[20]) }]}>
      <IconButton icon="back" label="Back" iconSize={24} onPress={() => router.back()} />
      <Text accessibilityRole="header" style={[type.display, styles.ink, styles.title]}>
        Settings
      </Text>

      <Section title="Account">
        <Row icon="you" title="Name" detail={name || 'Add your name'} onPress={() => setEditing({ field: 'name', value: name })} />
        <Row icon="chain" title="Username" detail={handle ? `@${handle}` : 'Add a username'} note="Friends add you by this." onPress={() => setEditing({ field: 'handle', value: handle })} />
        <Row icon="mail" title="Email" detail={email || 'None'} />
      </Section>

      <Section title="Calendars">
        <Row
          icon="google"
          title="Google Calendar"
          detail={
            google.kind === 'checking'
              ? 'Checking'
              : google.kind === 'linked'
              ? `Connected as ${google.connection.accountEmail}`
              : google.kind === 'no-access'
              ? 'Calendar wasn’t allowed. Tap to allow it.'
              : 'Sign in with Google to connect it.'
          }
          onPress={google.kind === 'no-access' ? () => void signInWithGoogle('/you/settings') : google.kind === 'email' ? link : undefined}
          trailing={google.kind === 'linked' ? <Icon name="check" /> : undefined}
        />
        {google.kind === 'linked' && (
          <>
            <Row
              icon="plans"
              title="Add Fobo plans to Google"
              detail="Plans you make here show up there too."
              trailing={<Switch label="Add Fobo plans to Google Calendar" value={google.connection.writeBack} onChange={writeBack} />}
            />
            <Row icon="close" title="Disconnect Google Calendar" detail="Removes the plans it brought in." onPress={disconnect} trailing={null} />
          </>
        )}
        {/* Shown for the demo; Outlook doesn't connect. */}
        <Row
          image={require('@/assets/icons/outlook.png')}
          title="Outlook"
          detail={outlookTapped ? 'Outlook isn’t available yet.' : 'Not connected'}
          onPress={() => setOutlookTapped(true)}
        />
      </Section>

      <Section title="What friends see">
        <Row
          icon="hide"
          title="When you’re busy"
          detail="Busy blocks only, not what the plans are."
          trailing={<Switch label="Show friends when you’re busy" value={!!me?.shareBlocks} disabled={!me} onChange={(on) => share('shareBlocks', on)} />}
        />
        <Row
          icon="bolt"
          title="Your day load"
          detail="How full each day is, out of 10."
          trailing={<Switch label="Show friends your day load" value={!!me?.shareScores} disabled={!me} onChange={(on) => share('shareScores', on)} />}
        />
      </Section>

      <Section title="You">
        <Row icon="refresh" title="Capacity profile" detail="What recharges you, and how fast." onPress={() => router.push('/you/capacity')} />
        <Row icon="pencil" title="Edit character" detail="Shape, colour and height." onPress={() => router.push('/you/character')} />
      </Section>

      <Section title="About">
        <Row icon="file" title="Privacy Policy" onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`)} />
        <Row icon="book" title="Terms of Service" onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)} />
      </Section>

      <View style={styles.logout}>
        <Button
          label="Log out"
          onPress={() => {
            signOut();
            router.replace('/welcome');
          }}
        />
        {!!email && <Text style={[type.foot, styles.muted, styles.center]}>{`Logged in as ${email}`}</Text>}
        <Button label="Delete account" variant="text" onPress={() => setDeleting('ask')} />
      </View>

      <Sheet visible={!!deleting} onClose={() => deleting !== 'working' && setDeleting(null)} title="Delete your account?">
        <View style={styles.edit}>
          <Text style={[type.sub, styles.muted]}>
            This removes your plans, calendar connection, friends and character from Fobo for good. Your Google Calendar stays as it is.
          </Text>
          <Button label={deleting === 'working' ? 'Deleting' : 'Delete account'} disabled={deleting === 'working'} onPress={deleteAccount} />
          <Button label="Keep my account" variant="quiet" disabled={deleting === 'working'} onPress={() => setDeleting(null)} />
        </View>
      </Sheet>

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.field === 'handle' ? 'Your username' : 'Your name'}>
        {editing && (
          <View style={styles.edit}>
            <TextField
              label={editing.field === 'handle' ? 'Username' : 'Name'}
              value={editing.value}
              onChangeText={(value) => setEditing({ ...editing, value, error: undefined })}
              autoFocus
              autoCapitalize={editing.field === 'handle' ? 'none' : 'words'}
              autoCorrect={false}
              invalid={!!editing.error}
              error={editing.error}
              onSubmitEditing={save}
            />
            <Button label={saving ? 'Saving' : 'Save'} disabled={saving} onPress={save} />
          </View>
        )}
      </Sheet>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[type.bodyStrong, styles.ink]}>
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/**
 * One settings row: an icon in a fill circle, a title with its current value under it, and a chevron
 * when it opens something (or `trailing`, like a switch; null for nothing).
 */
function Row({
  icon,
  image,
  title,
  detail,
  note,
  onPress,
  trailing,
}: {
  icon?: IconName;
  /** A brand mark that's a picture rather than a line icon (Outlook). */
  image?: number;
  title: string;
  detail?: string;
  note?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const end = trailing !== undefined ? trailing : onPress ? <Icon name="chevron" color={color.ink2} /> : null;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, detail].filter(Boolean).join(', ')}
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}>
      <View style={styles.badge}>
        {image ? <Image source={image} style={styles.image} contentFit="contain" /> : icon && <Icon name={icon} size={20} />}
      </View>
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, styles.ink]}>{title}</Text>
        {!!detail && <Text style={[type.sub, styles.muted]}>{detail}</Text>}
        {!!note && <Text style={[type.foot, styles.muted]}>{note}</Text>}
      </View>
      {end}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { paddingHorizontal: space.margin, paddingBottom: 140 },
  ink: { color: color.ink },
  muted: { color: color.ink2 },
  center: { textAlign: 'center' },
  title: { marginTop: space[16] },
  section: { marginTop: space[28], gap: space[12] },
  // The Profile card's paper and shadow. It clips the last row's rule.
  card: { paddingHorizontal: space[16], borderRadius: 22, overflow: 'hidden', backgroundColor: color.paper, boxShadow: shadow.soft },
  row: { minHeight: 68, marginBottom: -1, paddingVertical: space[12], gap: space[12], flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: color.rule },
  badge: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
  image: { width: 22, height: 21 },
  rowText: { flex: 1, gap: 2 },
  logout: { marginTop: space[48], gap: space[12] },
  edit: { gap: space[20] },
});
