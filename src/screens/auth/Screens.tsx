import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CelebratingArt from '@/assets/illustrations/celebrating.svg';
import CozyArt from '@/assets/illustrations/cozy.svg';
import LittleGuysArt from '@/assets/illustrations/little-guys.svg';
import SunshineArt from '@/assets/illustrations/sunshine.svg';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { TextField } from '@/components/TextField';
import { signInWithGoogle } from '@/lib/google-auth';
import { color } from '@/styles/tokens';
import { type } from '@/styles/type';

import { AuthHeader } from './AuthHeader';
import { SwitchLink } from './SwitchLink';

// Google sign-in goes through Neon Auth. Email sign-in isn't wired yet: it continues into onboarding.
const ONBOARDING = '/onboarding/start' as const;

/** Signs in with Google, then continues to `next` (the web build gets there through Google's redirect). */
function useGoogle(next: typeof ONBOARDING | '/week') {
  const router = useRouter();
  return async () => {
    try {
      if (await signInWithGoogle(next)) router.replace(next);
    } catch (e) {
      console.warn('Google sign-in failed', e);
    }
  };
}

/** Splash (360:7537). Moves on to Pre-login after a beat. */
export function Splash() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/welcome'), 1500);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <View style={styles.splash}>
      <View accessible accessibilityRole="image" accessibilityLabel="Fobo">
        <SunshineArt width={144} height={147} />
      </View>
      {/* Figma tracks Display/Time at -2.4%, i.e. -1.632px at 68. tokens.css says -2.4px. */}
      <Text style={[type.time, styles.wordmark]}>Fobo</Text>
    </View>
  );
}

/** Pre-login (360:7057). */
export function Welcome() {
  const router = useRouter();
  const google = useGoogle(ONBOARDING);
  return (
    <Screen
      footer={
        <>
          <Button label="Continue with Google" icon="google" onPress={google} />
          <Button label="Continue with email" variant="quiet" icon="mail" onPress={() => router.push('/signup')} />
        </>
      }>
      <View style={styles.welcome}>
        <View style={styles.littleGuys} importantForAccessibility="no-hide-descendants">
          <View style={styles.littleGuysArt}>
            <LittleGuysArt width={365} height={397} />
          </View>
        </View>
        <View style={styles.pitch}>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            Free isn’t the same as being full of energy.
          </Text>
          <Text style={[type.sub, styles.ink]}>
            Let Fobo prevent your <Text style={type.subStrong}>fear of being burnt out.</Text>
          </Text>
        </View>
      </View>
    </Screen>
  );
}

/** Sign up (360:7306). */
export function SignUp() {
  const router = useRouter();
  const google = useGoogle(ONBOARDING);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <Screen
      footer={
        <View style={styles.footerLink}>
          <Button label="Create Account" onPress={() => router.push(ONBOARDING)} />
          <SwitchLink prompt="Already have an account?" link="Log in" strongPrompt onPress={() => router.replace('/login')} />
        </View>
      }>
      <View style={styles.form}>
        <AuthHeader title="Create your account" Art={CelebratingArt} />
        <View style={styles.fields}>
          <GoogleOr label="Sign up with Google" onPress={google} />
          <View style={styles.fieldList}>
            <TextField label="Name" placeholder="Enter your full name" value={form.name} onChangeText={set('name')} autoComplete="name" textContentType="name" />
            <TextField
              label="Email"
              placeholder="Enter your email"
              value={form.email}
              onChangeText={set('email')}
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
            <TextField
              label="Password"
              placeholder="Enter your password"
              password
              value={form.password}
              onChangeText={set('password')}
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

/** Login (368:8126). */
export function Login() {
  const router = useRouter();
  const google = useGoogle('/week');
  const [form, setForm] = useState({ email: '', password: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <Screen
      footer={
        <View style={styles.footerLink}>
          <Button label="Log in" onPress={() => router.replace('/week')} />
          <SwitchLink prompt="New to Fobo?" link="Sign up" onPress={() => router.replace('/signup')} />
        </View>
      }>
      <View style={styles.form}>
        <AuthHeader title="Welcome back!" Art={CelebratingArt} />
        <View style={styles.fields}>
          <GoogleOr label="Log in with Google" onPress={google} />
          <View style={styles.fieldList}>
            {/* Figma placeholder reads "Enter your full name"; DESIGN.md §5 corrects it. */}
            <TextField
              label="Email"
              placeholder="Enter your email"
              value={form.email}
              onChangeText={set('email')}
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
            <TextField
              label="Password"
              placeholder="Enter your password"
              password
              value={form.password}
              onChangeText={set('password')}
              autoComplete="current-password"
              textContentType="password"
            />
            <Pressable accessibilityRole="link" onPress={() => router.push('/forgot')} hitSlop={11} style={styles.forgotLink}>
              <Text style={[type.body, styles.forgot]}>Forgot Password?</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

/** Forgot password (368:8206). */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  return (
    <Screen footer={<Button label="Send Code" />}>
      <View style={styles.form}>
        <AuthHeader
          title="Forgot Password?"
          subtitle="Enter your associated email, and we’ll make sure you get back on track."
          Art={CozyArt}
        />
        {/* Figma placeholder reads "Enter your full name"; DESIGN.md §5 corrects it. */}
        <TextField
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
        />
      </View>
    </Screen>
  );
}

function GoogleOr({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.googleOr}>
      <Button label={label} variant="quiet" icon="google" onPress={onPress} />
      <View style={styles.or} importantForAccessibility="no-hide-descendants">
        <View style={styles.line} />
        <Text style={[type.sub, styles.orText]}>or</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

/** px20 py40, content at the top, actions pinned to the bottom. */
function Screen({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 40), paddingBottom: Math.max(insets.bottom, 40) },
        ]}
        keyboardShouldPersistTaps="handled">
        <View>{children}</View>
        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'space-between', gap: 40 },
  footer: { gap: 12 },
  footerLink: { gap: 16 },
  ink: { color: color.ink },
  splash: {
    flex: 1,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.ground,
  },
  wordmark: { color: color.ink, letterSpacing: -1.632 },
  welcome: { paddingVertical: 40, gap: 80, alignItems: 'center' },
  littleGuys: { width: 315, height: 255 },
  // The export is the scene's full bounds; its origin sits here relative to the 315x255 frame.
  littleGuysArt: { position: 'absolute', left: -10.7, top: -29.5 },
  pitch: { alignSelf: 'stretch', gap: 16 },
  form: { gap: 40 },
  fields: { gap: 20 },
  fieldList: { gap: 12 },
  googleOr: { gap: 20 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flex: 1, height: 1, backgroundColor: color.ink3 },
  orText: { color: color.ink3 },
  forgotLink: { alignSelf: 'flex-end' },
  forgot: { color: color.ink2, textDecorationLine: 'underline' },
});
