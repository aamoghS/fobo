// Wording the API writes into its answers, in one place for design to edit. Keys are the onboarding
// answers (./options.ts ONBOARDING).

/** Capacity Profile row labels. */
export const CAPACITY_LABELS = {
  recharge: 'How you recharge',
  socialEnergy: 'Social energy',
  alone: 'Alone time',
  busy: 'Busy days',
  recovery: 'Recovery',
  stressRelief: 'Stress-relief',
};

/** Capacity Profile values from the onboarding answers. */
export const RECHARGE_VALUES: Record<string, string> = {
  alone: 'Recharges alone',
  people: 'Recharges with people',
  depends: 'Recharges both ways',
};
export const SOCIAL_ENERGY_VALUES: Record<string, string> = {
  'In the first hour': 'Fades after ~1 hr',
  'After 1 to 2 hours': 'Fades after ~2 hrs',
  'After 2 to 3 hours': 'Fades after ~3 hrs',
  'I stayed happily to the end': 'Lasts all night',
};
export const RECOVERY_VALUES: Record<string, string> = {
  'Same evening': 'Recovers the same evening',
  'Next morning': '1 night recovery needed',
  'After a day': '1 day recovery needed',
  '2 to 3 days': '3 days recovery needed',
  Longer: 'More than 3 days recovery needed',
};
export const aloneTime = (hours: number) => `${hours} hours needed`;
export const busyDays = (days: number) => `${days} busy days in a row is fine`;

/** Profile title from how the user recharges. */
export const TITLES: Record<string, string> = { people: 'Social Butterfly', depends: 'Social Butterfly', alone: 'Homebody' };

export const STREAK = {
  title: (days: number) => `${days} day streak!`,
  detail: 'Maintained balanced energy!',
};

/** The "Today" home screen widget. */
export const WIDGET = {
  label: 'Today',
  roomy: 'Still fuel left in your tank.',
  full: 'A full day.',
  over: 'Over the line today.',
  nothingNext: 'Nothing else today',
  freeTonight: 'Free tonight. Rest?',
};

/** People: a friend with no plan coming up together. */
export const NO_UPCOMING = 'No upcoming plans';

/** Your week: "Up next" when there is no plan coming up. */
export const NOTHING_PLANNED = 'Nothing planned';
