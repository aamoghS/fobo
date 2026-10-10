/** Names that appear on the Final screens. People screens (387:1456, 387:1613) will fill in the rest. */
export type Person = { id: string; name: string };

export const people: Person[] = [
  { id: 'dani', name: 'Dani' },
  { id: 'jun', name: 'Jun' },
  { id: 'hana', name: 'Hana' },
  { id: 'ava', name: 'Ava' },
  { id: 'lea', name: 'Lea' },
  { id: 'josh', name: 'Josh' },
  { id: 'priya', name: 'Priya' },
];

export const getPerson = (id: string) => people.find((p) => p.id === id);
