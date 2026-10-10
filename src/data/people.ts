import type { color } from '@/styles/tokens';

/** Your circle on People (387:1456): accepted friends, filled from the API by src/data/live.ts. */
export type Person = {
  id: string;
  name: string;
  /** Avatar ring. */
  tint: keyof typeof color;
  /** Next plan together ("Dinner · Saturday"). */
  nextLabel: string;
  bio?: string;
  pastTogether?: number;
};

export const people: Person[] = [];

export const getPerson = (id: string) => people.find((p) => p.id === id);

/** A person's bio, or one written from their next plan when they haven't got one (e.g. live data). */
export function bioFor(person: Person) {
  if (person.bio) return person.bio;
  const [what, when] = person.nextLabel.split(' · ');
  return when ? `${what} on ${when} is next.` : 'Nothing planned together yet.';
}
