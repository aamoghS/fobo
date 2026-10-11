import { useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
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

import CozyArt from '@/assets/illustrations/cozy.svg';
import SunshineFaceArt from '@/assets/illustrations/sunshine-face.svg';
import SunshinePetalsArt from '@/assets/illustrations/sunshine-petals.svg';
import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { TextField } from '@/components/TextField';
import { homeAfterSignIn, isSignedIn, loadLive } from '@/data/live';
import { logInWithEmail, signUpWithEmail } from '@/lib/email-auth';
import { signInWithGoogle } from '@/lib/google-auth';
import { notify } from '@/lib/notify';
import { color } from '@/styles/tokens';
import { type } from '@/styles/type';

import { AuthHeader } from './AuthHeader';
import { CelebratingSun } from './CelebratingSun';
import { SwitchLink } from './SwitchLink';
import { handOffCelebration, handOffSun } from './sunHandoff';
import { welcomeScene } from './sunLayout';
import { useAuthForm } from './useAuthForm';
import { handOffWelcomeSun, useFadeIn, WelcomeArt } from './WelcomeArt';

// Google and email sign-in both go through the Fobo API (src/lib/google-auth.ts, src/lib/email-auth.ts).
const ONBOARDING = '/onboarding/start' as const;

/**
 * Signs in with Google, then goes to the week, or to onboarding for an account that hasn't been through
 * it yet (a new Google account on Log in too). The web build gets there through /auth.
 */
function useGoogle(next: typeof ONBOARDING | '/week') {
  const router = useRouter();
  return async () => {
    try {
      if (await signInWithGoogle(next)) {
        await loadLive();
        router.replace(homeAfterSignIn());
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
            if (isSignedIn()) return router.replace(homeAfterSignIn());
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

/** Sign up (360:7306). */
export function SignUp() {
  const router = useRouter();
  const google = useGoogle(ONBOARDING);
  const { field, ready, submit } = useAuthForm('signup');
  return (
    <Screen
      footer={
        <View style={styles.footerLink}>
          <Button
            label="Create Account"
            dimmed={!ready}
            accessibilityHint={ready ? undefined : 'Fill in your name, email and password first'}
            onPress={() =>
              submit(async ({ name, email, password }) => {
                const result = await signUpWithEmail(name, email, password);
                if (!result.ok) return notify(result.error);
                await loadLive();
                router.replace(ONBOARDING);
              })
            }
          />
          <SwitchLink prompt="Already have an account?" link="Log in" strongPrompt onPress={() => {
            handOffCelebration();
            router.replace('/login');
          }} />
        </View>
      }>
      <View style={styles.form}>
        <AuthHeader title="Create your account" Art={CelebratingSun} alignWelcomeSun />
        <View style={styles.fields}>
          <GoogleOr label="Sign up with Google" onPress={google} />
          <View style={styles.fieldList}>
            <TextField
              {...field('name')}
              label="Name"
              placeholder="Enter your full name"
              autoComplete="name"
              textContentType="name"
            />
            <TextField
              {...field('email')}
              label="Email"
              placeholder="Enter your email"
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
            <TextField
              {...field('password')}
              label="Password"
              placeholder="Enter your password"
              password
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
  const { field, ready, submit } = useAuthForm('login');
  return (
    <Screen
      footer={
        <View style={styles.footerLink}>
          <Button
            label="Log in"
            dimmed={!ready}
            accessibilityHint={ready ? undefined : 'Fill in a valid email and password first'}
            onPress={() =>
              submit(async ({ email, password }) => {
                const result = await logInWithEmail(email, password);
                if (!result.ok) return notify(result.error);
                await loadLive();
                router.replace(homeAfterSignIn());
              })
            }
          />
          <SwitchLink prompt="New to Fobo?" link="Sign up" onPress={() => {
            handOffCelebration();
            router.replace('/signup');
          }} />
        </View>
      }>
      <View style={styles.form}>
        <AuthHeader title="Welcome back!" Art={CelebratingSun} alignWelcomeSun />
        <View style={styles.fields}>
          <GoogleOr label="Log in with Google" onPress={google} />
          <View style={styles.fieldList}>
            {/* Figma placeholder reads "Enter your full name"; DESIGN.md §5 corrects it. */}
            <TextField
              {...field('email')}
              label="Email"
              placeholder="Enter your email"
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
            <TextField
              {...field('password')}
              label="Password"
              placeholder="Enter your password"
              password
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
  const { field, ready, submit } = useAuthForm('forgot');
  return (
    <Screen
      footer={
        <Button
          label="Send Code"
          dimmed={!ready}
          accessibilityHint={ready ? undefined : 'Fill in a valid email first'}
          // Sending the code isn't wired up yet; a valid email just clears the check for now.
          onPress={() => submit(() => {})}
        />
      }>
      <View style={styles.form}>
        <AuthHeader
          title="Forgot Password?"
          subtitle="Enter your associated email, and we’ll make sure you get back on track."
          Art={CozyArt}
        />
        {/* Figma placeholder reads "Enter your full name"; DESIGN.md §5 corrects it. */}
        <TextField
          {...field('email')}
          label="Email"
          placeholder="Enter your email"
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
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 40) }]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {/* Pinned, so the buttons sit in the same spot on every screen however long the content runs. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 40) }]}>{footer}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  scroll: { flex: 1 },
  // 40 under the content keeps the old gap above the buttons when it runs long.
  content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  footer: { gap: 12, paddingHorizontal: 20 },
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
  welcome: { paddingVertical: welcomeScene.paddingY, gap: 80, alignItems: 'center' },
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
