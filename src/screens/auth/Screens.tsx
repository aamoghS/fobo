import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CelebratingArt from '@/assets/illustrations/celebrating.svg';
import CozyArt from '@/assets/illustrations/cozy.svg';
import SunshineFaceArt from '@/assets/illustrations/sunshine-face.svg';
import SunshinePetalsArt from '@/assets/illustrations/sunshine-petals.svg';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { TextField } from '@/components/TextField';
import { Tooltip } from '@/components/Tooltip';
import { isSignedIn, loadLive } from '@/data/live';
import { logInWithEmail, signUpWithEmail } from '@/lib/email-auth';
import { signInWithGoogle } from '@/lib/google-auth';
import { notify } from '@/lib/notify';
import { color } from '@/styles/tokens';
import { type } from '@/styles/type';

import { AuthHeader } from './AuthHeader';
import { CelebratingSun } from './CelebratingSun';
import { SwitchLink } from './SwitchLink';
import { handOffSun } from './sunHandoff';
import { handOffWelcomeSun, useFadeIn, WelcomeArt } from './WelcomeArt';

// Google and email sign-in both go through the Fobo API (src/lib/google-auth.ts, src/lib/email-auth.ts).
const ONBOARDING = '/onboarding/start' as const;

/** Signs in with Google, then continues to `next` (the web build gets there through Google's redirect). */
function useGoogle(next: typeof ONBOARDING | '/week') {
  const router = useRouter();
  return async () => {
    try {
      if (await signInWithGoogle(next)) {
        await loadLive();
        router.replace(next);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Google sign-in failed. Try again.');
    }
  };
}

/**
 * Splash (360:7537). The petals turn under a still face; the wordmark fades and the sun flies on into
 * Pre-login, or the app opens on Your week when already signed in.
 */
export function Splash() {
  const router = useRouter();
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const sunshine = useRef<View>(null);
  useEffect(() => {
    const native = Platform.OS !== 'web';
    let turning: Animated.CompositeAnimation | undefined;
    let leaving: Animated.CompositeAnimation | undefined;
    let t: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (done) return;
        if (!reduce) {
          turning = Animated.loop(
            Animated.timing(spin, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: native }),
          );
          turning.start();
        }
        t = setTimeout(() => {
          leaving = Animated.timing(fade, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: native,
          });
          leaving.start(({ finished }) => {
            if (!finished) return;
            if (isSignedIn()) return router.replace('/week');
            // Pre-login's sun picks up from here, mid-turn.
            spin.stopAnimation((v) => {
              const sun = sunshine.current;
              if (!sun) return router.replace('/welcome');
              sun.measureInWindow((x, y) => {
                handOffSun({ x: x + 73.75, y: y + 73.4, angle: v * 360 });
                router.replace('/welcome');
              });
            });
          });
        }, 1500);
      });
    return () => {
      done = true;
      clearTimeout(t);
      turning?.stop();
      leaving?.stop();
    };
  }, [router, spin, fade]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={styles.splash}>
      <View
        ref={sunshine}
        collapsable={false}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Fobo"
        style={styles.sunshine}>
        <Animated.View style={[styles.sunLayer, { transform: [{ rotate }] }]}>
          <SunshinePetalsArt width={160} height={160} />
        </Animated.View>
        {/* Its own view so it stacks above the positioned petals on web too. */}
        <View style={styles.sunLayer}>
          <SunshineFaceArt width={160} height={160} />
        </View>
      </View>
      {/* Figma tracks Display/Time at -2.4%, i.e. -1.632px at 68. tokens.css says -2.4px. */}
      <Animated.Text style={[type.time, styles.wordmark, { opacity: fade }]}>Fobo</Animated.Text>
    </View>
  );
}

/** Pre-login (360:7057). */
export function Welcome() {
  const router = useRouter();
  const google = useGoogle(ONBOARDING);
  // The copy and buttons come in once the sun is out of the way.
  const copyIn = useFadeIn(700);
  return (
    <Screen
      footer={
        <Animated.View style={[styles.footer, { opacity: copyIn }]}>
          <Button label="Continue with Google" icon="google" onPress={google} />
          <Button
            label="Continue with email"
            variant="quiet"
            icon="mail"
            onPress={() => handOffWelcomeSun(() => router.push('/signup'))}
          />
        </Animated.View>
      }>
      <View style={styles.welcome}>
        <WelcomeArt />
        <Animated.View style={[styles.pitch, { opacity: copyIn }]}>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            Free isn’t the same as being full of energy.
          </Text>
          <Text style={[type.sub, styles.ink]}>
            Let Fobo prevent your <Text style={type.subStrong}>fear of being burnt out.</Text>
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

type SignUpField = 'name' | 'email' | 'password';
const FIELDS: SignUpField[] = ['name', 'email', 'password'];

/** Every field is required. Hints aren't in Figma yet: they need a pass from UX writing. */
const RULES: Record<SignUpField, { ok: (v: string) => boolean; hint: string }> = {
  name: { ok: (v) => v.trim() !== '', hint: 'Enter your name' },
  // Something@something.ending, with an ending of at least two letters.
  email: { ok: (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()), hint: 'Enter a valid email, like name@example.com' },
  password: { ok: (v) => v.length >= 8, hint: 'Use at least 8 characters for your password' },
};

/** Sign up (360:7306). */
export function SignUp() {
  const router = useRouter();
  const google = useGoogle(ONBOARDING);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  // A field turns red once it's been left, or after a tap on Create Account. It shakes as it turns red.
  const [seen, setSeen] = useState<Record<SignUpField, boolean>>({ name: false, email: false, password: false });
  const [shakes, setShakes] = useState<Record<SignUpField, number>>({ name: 0, email: 0, password: 0 });
  const bad = (f: SignUpField) => !RULES[f].ok(form[f]);
  const red = (f: SignUpField) => seen[f] && bad(f);
  const ready = FIELDS.every((f) => !bad(f));
  const hint = FIELDS.find(red);
  const flag = (fields: SignUpField[]) => {
    setSeen((s) => ({ ...s, ...Object.fromEntries(fields.map((f) => [f, true])) }));
    setShakes((s) => ({ ...s, ...Object.fromEntries(fields.map((f) => [f, s[f] + 1])) }));
  };
  const leave = (f: SignUpField) => () => bad(f) && !seen[f] && flag([f]);
  const create = async () => {
    if (!ready) return flag(FIELDS.filter(bad));
    const result = await signUpWithEmail(form.name, form.email, form.password);
    if (!result.ok) return notify(result.error);
    await loadLive();
    router.replace(ONBOARDING);
  };
  return (
    <Screen
      footer={
        <View style={styles.footerLink}>
          <View>
            <Tooltip text={hint ? RULES[hint].hint : ''} visible={!!hint} />
            <Button
              label="Create Account"
              dimmed={!ready}
              accessibilityHint={ready ? undefined : 'Fill in your name, email and password first'}
              onPress={create}
            />
          </View>
          <SwitchLink prompt="Already have an account?" link="Log in" strongPrompt onPress={() => router.replace('/login')} />
        </View>
      }>
      <View style={styles.form}>
        <AuthHeader title="Create your account" Art={CelebratingSun} />
        <View style={styles.fields}>
          <GoogleOr label="Sign up with Google" onPress={google} />
          <View style={styles.fieldList}>
            <TextField
              label="Name"
              placeholder="Enter your full name"
              value={form.name}
              onChangeText={set('name')}
              onBlur={leave('name')}
              invalid={red('name')}
              shake={shakes.name}
              autoComplete="name"
              textContentType="name"
            />
            <TextField
              label="Email"
              placeholder="Enter your email"
              value={form.email}
              onChangeText={set('email')}
              onBlur={leave('email')}
              invalid={red('email')}
              shake={shakes.email}
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
              onBlur={leave('password')}
              invalid={red('password')}
              shake={shakes.password}
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
          <Button
            label="Log in"
            onPress={async () => {
              const result = await logInWithEmail(form.email, form.password);
              if (!result.ok) return notify(result.error);
              await loadLive();
              router.replace('/week');
            }}
          />
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
  sunshine: { width: 144, height: 147 },
  // Petals and face share a 160 box centred on the flower's middle, (73.75, 73.4) in the 144x147 frame.
  sunLayer: { position: 'absolute', left: -6.25, top: -6.6, width: 160, height: 160 },
  wordmark: { color: color.ink, letterSpacing: -1.632 },
  welcome: { paddingVertical: 40, gap: 80, alignItems: 'center' },
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
