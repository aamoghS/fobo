import { Platform } from 'react-native';

import { color } from './tokens';

export const focusRing = {
  outlineColor: color.ink,
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: 2,
} as const;

/** True while the user is navigating with a keyboard (web), so pointer taps don't show the ring. */
let keyboardMode = Platform.OS !== 'web';
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') keyboardMode = true;
  });
  window.addEventListener('pointerdown', () => {
    keyboardMode = false;
  });
}

export const isKeyboardMode = () => keyboardMode;
