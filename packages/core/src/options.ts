// The app's choices, shared by the app (src/data/profile.ts) and the API, which accepts only these.

/** Edit Character shapes, in Figma order. `art` is the PaperSpirit mood drawn for the shape. */
export const SHAPES = [
  { key: 'slab', label: 'Slab', art: 'stretched' },
  { key: 'drip', label: 'Drip', art: 'spent' },
  { key: 'flower', label: 'Flower', art: 'bright' },
  { key: 'cloud', label: 'Cloud', art: 'asleep' },
  { key: 'square', label: 'Square', art: 'work' },
] as const;

/** Edit Character colours, as token names. */
export const SWATCHES = [
  'moodFine',
  'moodStretched',
  'moodAsleep',
  'moodSpent',
  'scrapWork',
  'paintViolet',
  'paintCharcoal',
] as const;

/** Edit Character eyes. */
export const EYES = [
  { key: 'sleepy', label: 'Sleepy' },
  { key: 'happy', label: 'Happy' },
  { key: 'bored', label: 'Bored' },
] as const;

/** Avatar ring tints, as token names. */
export const TINTS = ['tintButter', 'tintSky', 'tintRose', 'tintMint', 'tintPeach'] as const;
export const DEFAULT_TINT = 'tintSky';

/** Plan kinds: scrap colour and top cut. */
export const PLAN_KINDS = ['work', 'social', 'obligation', 'enjoy', 'rest'] as const;

/** How a plan nobody has sorted yet (fresh from Google Calendar) is drawn. */
export const UNSORTED_KIND = 'work';

/** Onboarding answers by step (src/screens/onboarding/Onboarding.tsx). `compare` takes a plan id. */
export const ONBOARDING: Record<string, readonly string[] | null> = {
  recharge: ['alone', 'depends', 'people'],
  'head-home': ['In the first hour', 'After 1 to 2 hours', 'After 2 to 3 hours', 'I stayed happily to the end'],
  yourself: ['Same day', 'Next day', '2 to 3 days', 'Longer'],
  compare: null,
  // Set when onboarding is finished or skipped through, so sign-in knows to go straight to the week.
  done: ['yes'],
};
