// The achievement catalog, as the You tab draws it. The API awards them (server/src/routes/you.ts).
/** Plans with this many people or more earn More the Merrier. */
export const MERRIER_PEOPLE = 3;

// `how` is what it takes, shown on Achievements whether it's earned yet or not.
export const ACHIEVEMENTS = [
  { id: 'irish-goodbye', title: 'The Irish Goodbye', how: 'Plan a time to head home, then see it through', icon: 'home', badge: 'red' },
  { id: 'slow-steady', title: 'Slow and Steady', how: 'Stay within your room for 7 days in a row', icon: 'snail', badge: 'pink' },
  { id: 'merrier', title: 'More the Merrier', how: `Make a plan with ${MERRIER_PEOPLE} or more people`, icon: 'paper-airplane', badge: 'green' },
  { id: 'first-week', title: 'The First Week', how: 'Spend your first week with Fobo', icon: 'calendar', badge: 'blue' },
] as const;
