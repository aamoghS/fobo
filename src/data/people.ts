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
  { id: 'dani', name: 'Dani', tint: 'tintButter', nextLabel: 'Dinner · Saturday', bio: 'Never met a dinner table they didn’t light up.' },
  { id: 'jun', name: 'Jun', tint: 'tintSky', nextLabel: 'Coffee · Sunday', bio: 'Always up for a slow morning.', pastTogether: 3 },
  { id: 'hana', name: 'Hana', tint: 'tintRose', nextLabel: 'No upcoming plans', bio: 'Happiest on a quiet night in.' },
  { id: 'ava', name: 'Ava', tint: 'tintMint', nextLabel: 'Walk · Friday', bio: 'Will turn any catch-up into a walk.' },
  { id: 'lea', name: 'Lea', tint: 'tintButter', nextLabel: 'Lunch · Monday', bio: 'Keeps the long lunches going.' },
];

export const getPerson = (id: string) => people.find((p) => p.id === id);

/** A person's bio, or one written from their next plan when they haven't got one (e.g. live data). */
export function bioFor(person: Person) {
  if (person.bio) return person.bio;
  const [what, when] = person.nextLabel.split(' · ');
  return when ? `${what} on ${when} is next.` : 'Nothing planned together yet.';
}
