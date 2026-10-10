import type { color } from '@/styles/tokens';

/** Your circle on People (387:1456), in Figma's order. Jun's profile is People detail (387:1613). */
export type Person = {
  id: string;
  name: string;
  /** Avatar ring. */
  tint: keyof typeof color;
  /** Next plan as Figma words it in the list ("Dinner · Saturday"). */
  nextLabel: string;
  bio?: string;
  pastTogether?: number;
};

export const people: Person[] = [
  { id: 'dani', name: 'Dani', tint: 'tintButter', nextLabel: 'Dinner · Saturday' },
  { id: 'jun', name: 'Jun', tint: 'tintSky', nextLabel: 'Coffee · Sunday', bio: 'Always up for a slow morning.', pastTogether: 3 },
  { id: 'hana', name: 'Hana', tint: 'tintRose', nextLabel: 'No upcoming plans' },
  { id: 'ava', name: 'Ava', tint: 'tintMint', nextLabel: 'Walk · Friday' },
  { id: 'lea', name: 'Lea', tint: 'tintButter', nextLabel: 'Lunch · Monday' },
];

export const getPerson = (id: string) => people.find((p) => p.id === id);
