import type { PlanKind } from '@/features/plans/types';

export type ScrapCut = PlanKind | 'past';

// Top cuts traced from the Scrap set (34:878). Coordinates are relative to a 63.83-wide scrap
// whose highest point sits at y = 0. They scale with width; the body below stretches with height.
const BASE_W = 63.83;
const R = (n: number) => Math.round(n * 100) / 100;

/** Height of the top cut band at width w (the part above the flat-sided body). */
export function cutDepth(cut: ScrapCut, w: number) {
  const s = w / BASE_W;
  switch (cut) {
    case 'work':
    case 'past':
      return 12.96 * s;
    case 'social':
      return 14 * s;
    case 'obligation':
      return 7 * s;
    case 'enjoy':
      return 9.67 * s;
    case 'rest':
      return 0;
  }
}

/**
 * SVG path for one scrap of paper. Height shows energy, so h is free; the sides get a small
 * hand-cut wobble that is stable for a given seed. Rest is a cushion that sits under a stack.
 */
export function scrapPath(cut: ScrapCut, w: number, h: number, seed = 1): string {
  const s = w / BASE_W;
  const rand = mulberry32(seed);
  const wob = (max: number) => R(rand() * max);

  if (cut === 'rest') {
    // Cloud cushion, 63.83x21.6 in the source; scaled to fill w x h.
    const x = (n: number) => R(n * s);
    const y = (n: number) => R((n / 21.6) * h);
    return [
      `M${x(0)} ${y(21.6)}`,
      `C${x(-4)} ${y(14.4)} ${x(6.4)} ${y(3.6)} ${x(16)} ${y(7.2)}`,
      `C${x(22.4)} ${y(0)} ${x(41.6)} ${y(0)} ${x(44.8)} ${y(7.2)}`,
      `C${x(57.43)} ${y(3.6)} ${x(67.83)} ${y(14.4)} ${x(63.83)} ${y(21.6)}`,
      'Z',
    ].join(' ');
  }

  const leftBottom = wob(1);
  const rightBottom = R(w - wob(2.5));
  const bottomTilt = R(h - wob(0.6));
  const top = topCut(cut, w, s);
  return `M${leftBottom} ${R(h)} L${top} L${rightBottom} ${bottomTilt} Z`;
}

/** Points along the top edge, from the left side to the right side. */
function topCut(cut: ScrapCut, w: number, s: number): string {
  const x = (n: number) => R(n * s);
  switch (cut) {
    case 'work':
    case 'past':
      // Snipped corner, top-right.
      return `0.02 ${x(6.96)} L${x(0.5)} 0 L${x(50.83)} ${x(1.14)} L${R(w)} ${x(12.96)}`;
    case 'social':
      // Wavy.
      return `0.02 ${x(14)} C${x(12.8)} 0 ${x(19.2)} ${x(16)} ${x(32)} ${x(8)} C${x(44.8)} 0 ${x(51.2)} 0 ${R(w)} ${x(10)}`;
    case 'obligation': {
      // Pinking shears: six teeth.
      const pts = Array.from({ length: 13 }, (_, i) => `${R((w * i) / 12)} ${i % 2 ? 0 : x(7)}`);
      return pts.join(' L');
    }
    case 'enjoy': {
      // Three scallops.
      const base = x(9.67);
      const rx = R(w / 6);
      const arcs = [1, 2, 3].map((i) => `A${rx} ${base} 0 0 1 ${R((w * i) / 3)} ${base}`);
      return `0 ${base} ${arcs.join(' ')}`;
    }
    case 'rest':
      return `0 0 L${R(w)} 0`;
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable numeric seed from a plan id. */
export function seedFrom(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}
