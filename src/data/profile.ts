import { ACHIEVEMENTS } from '@fobo/core/achievements';
import { STREAK_DAYS } from '@fobo/core/constants';
import { WIDGET } from '@fobo/core/copy';
import { EYES as CORE_EYES, SHAPES as CORE_SHAPES, SWATCHES as CORE_SWATCHES } from '@fobo/core/options';

import type { IconName } from '@/components/Icon';
import type { color } from '@/styles/tokens';

/**
 * The You tab: Profile v.1 (443:3735), Capacity Profile (443:3680), Settings (443:3555).
 * Filled from the API by src/data/live.ts.
 */
export const profile = {
  name: '',
  title: '',
  email: '',
  streak: { days: 0, of: STREAK_DAYS, title: '', detail: '' },
};

export type Achievement = { id: string; title: string; icon: IconName; badge: 'red' | 'pink' | 'green' | 'blue' };

// The catalog the API awards from must use the app's icons and badges.
ACHIEVEMENTS satisfies readonly Achievement[];

/** Earned achievements. */
export const achievements: Achievement[] = [];

/** Home screen widget preview. */
export const widget = { label: WIDGET.label, headline: '', next: '', nudge: '' };

/** Capacity Profile rows. `step` reopens the onboarding question that set it. */
export const capacity: { label: string; value: string; step?: 'recharge' | 'head-home' | 'yourself' }[] = [];

export const settingsRows = ['Account', 'Connected Apps & Devices', 'Notifications', 'Accessibility', 'Privacy Policy', 'My Data'];

/** Edit Character options, in Figma order, shared with the API through @fobo/core. */
export const SHAPES = CORE_SHAPES;
export const SWATCHES = CORE_SWATCHES satisfies readonly (keyof typeof color)[];
export const EYES = CORE_EYES;
