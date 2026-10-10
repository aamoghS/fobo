import { useRouter } from 'expo-router';
import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { color } from '@/styles/tokens';
import { type } from '@/styles/type';

import { celebratingScene, welcomeSunCenter } from './sunLayout';

type Props = {
  title: string;
  subtitle?: string;
  /** Scene illustration, 106x142 (Celebrating 360:7731, Cozy 368:8336). */
  Art: FC<{ width: number; height: number }>;
  /** Keep sign-up's sun at the welcome sun's resting centre, at every screen width. */
  alignWelcomeSun?: boolean;
};

/** Back button, character top-right, Display title. Shared by Sign up, Login, Forgot password. */
export function AuthHeader({ title, subtitle, Art, alignWelcomeSun = false }: Props) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={[styles.art, alignWelcomeSun && styles.welcomeSun]} importantForAccessibility="no-hide-descendants">
        <Art width={106} height={142} />
      </View>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
      <View style={styles.titles}>
        <Text accessibilityRole="header" style={[type.display, styles.title]}>
          {title}
        </Text>
        {subtitle && <Text style={[type.body, styles.subtitle]}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 147 },
  // Positioned as in Figma: the character hangs off the top-right of the 147 header.
  art: { position: 'absolute', top: -24.8, right: -3.6 },
  welcomeSun: {
    left: '50%',
    right: 'auto',
    marginLeft: welcomeSunCenter.x - celebratingScene.sunX,
    top: welcomeSunCenter.y - celebratingScene.sunY,
  },
  titles: { marginTop: 56, gap: 8 },
  title: { color: color.ink },
  subtitle: { color: color.ink2 },
});
