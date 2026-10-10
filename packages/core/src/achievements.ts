// The achievement catalog, as the You tab draws it. The API awards them (server/src/routes/you.ts).
export const ACHIEVEMENTS = [
  { id: 'irish-goodbye', title: 'The Irish Goodbye', icon: 'home', badge: 'red' },
  { id: 'slow-steady', title: 'Slow and Steady', icon: 'snail', badge: 'pink' },
  { id: 'merrier', title: 'More the Merrier', icon: 'paper-airplane', badge: 'green' },
  { id: 'first-week', title: 'The First Week', icon: 'calendar', badge: 'blue' },
] as const;

/** Plans with this many people or more earn More the Merrier. */
export const MERRIER_PEOPLE = 3;
