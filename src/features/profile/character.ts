import { useSyncExternalStore } from 'react';

import type { EYES, SHAPES, SWATCHES } from '@/data/profile';
import { api } from '@/lib/api';

export type Character = {
  shape: (typeof SHAPES)[number]['key'];
  color: (typeof SWATCHES)[number];
  eyes: (typeof EYES)[number]['key'];
  /** 0 to 1 slider position. */
  height: number;
};

// Loaded from the profile API when signed in (src/data/live.ts). Defaults match Profile v.1: a stretched slab.
let character: Character = { shape: 'slab', color: 'moodStretched', eyes: 'bored', height: 0.2 };
const listeners = new Set<() => void>();

export function useCharacter() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => character,
    () => character,
  );
}

export function saveCharacter(next: Character, { remote = true } = {}) {
  character = next;
  listeners.forEach((l) => l());
  if (remote) void api('PATCH', '/me', { character: next });
}

/** Slider position to vertical stretch; 0.2 (the drawn default) is 1. */
export const stretchFor = (height: number) => 0.9 + height * 0.5;
