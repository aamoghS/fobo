import type { IconName } from '@/components/Icon';
import type { color } from '@/styles/tokens';

/**
 * You tab mock data: Profile v.1 (443:3735), Capacity Profile (443:3680), Settings (443:3555).
 * These are loose frames, so the copy is as drawn and will move to the API.
 */
export const profile = {
  name: 'Marm',
  title: 'Social Butterfly',
  // Figma shows a teammate's real address; a placeholder stands in until auth is wired.
  email: 'marm@example.com',
  streak: { days: 5, of: 7, title: '5 day streak!', detail: 'Maintained balanced energy!' },
};

export type Achievement = { id: string; title: string; icon: IconName; badge: 'red' | 'pink' | 'green' | 'blue' };

export const achievements: Achievement[] = [
  { id: 'irish-goodbye', title: 'The Irish Goodbye', icon: 'home', badge: 'red' },
  { id: 'slow-steady', title: 'Slow and Steady', icon: 'snail', badge: 'pink' },
  { id: 'merrier', title: 'More the Merrier', icon: 'paper-airplane', badge: 'green' },
  { id: 'first-week', title: 'The First Week', icon: 'calendar', badge: 'blue' },
];

/** Home screen widget preview. */
export const widget = {
  label: 'Today',
  headline: 'Still fuel left in your tank.',
  next: '4:00 Call with Mum',
  nudge: 'Free tonight. Rest?',
};

/** Capacity Profile rows. `step` reopens the onboarding question that set it. */
export const capacity: { label: string; value: string; step?: 'recharge' | 'head-home' | 'yourself' }[] = [
  { label: 'How you recharge', value: 'Recharges both ways', step: 'recharge' },
  { label: 'Social energy', value: 'Fades after ~3 hrs', step: 'head-home' },
  { label: 'Alone time', value: '2 hours needed' },
  { label: 'Busy days', value: '2 busy days in a row is fine' },
  { label: 'Recovery', value: '3 days recovery needed', step: 'yourself' },
  { label: 'Stress-relief', value: 'Painting, jogging, sleeping' },
];

export const settingsRows = ['Account', 'Connected Apps & Devices', 'Notifications', 'Accessibility', 'Privacy Policy', 'My Data'];

/** Edit Character options, in Figma order. */
export const SHAPES = [
  { key: 'slab', label: 'Slab', art: 'stretched' },
  { key: 'drip', label: 'Drip', art: 'spent' },
  { key: 'flower', label: 'Flower', art: 'bright' },
  { key: 'cloud', label: 'Cloud', art: 'asleep' },
  { key: 'square', label: 'Square', art: 'work' },
] as const;

export const SWATCHES = [
  'moodFine',
  'moodStretched',
  'moodAsleep',
  'moodSpent',
  'scrapWork',
  'paintViolet',
  'paintCharcoal',
] as const satisfies readonly (keyof typeof color)[];

export const EYES = [
  { key: 'sleepy', label: 'Sleepy' },
  { key: 'happy', label: 'Happy' },
  { key: 'bored', label: 'Bored' },
] as const;
