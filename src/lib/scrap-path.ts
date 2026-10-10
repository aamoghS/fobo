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
      return 11 * s;
    case 'past':
      return 4 * s;
    case 'social':
      return 12 * s;
    case 'obligation':
      return 14 * s;
    case 'enjoy':
      return 15 * s;
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
  const depth = cutDepth(cut, w);
  // The sides bow a hair, like paper cut by hand rather than a guillotine.
  const leftBow = R(wob(1.6) - 0.6);
  const rightBow = R(w - wob(1.6) + 0.6);
  const top = topCut(cut, w, s);
  return [
    `M${leftBottom} ${R(h)}`,
    `Q${leftBow} ${R((h + depth) / 2)} ${top}`,
    `Q${rightBow} ${R((bottomTilt + depth) / 2)} ${rightBottom} ${bottomTilt}`,
    'Z',
  ].join(' ');
}

/** Points along the top edge, from the left side to the right side. */
function topCut(cut: ScrapCut, w: number, s: number): string {
  const x = (n: number) => R(n * s);
  switch (cut) {
    case 'work':
      // Snipped corner, top-right.
      return `0 ${x(4)} L${x(1)} 0 L${x(50)} ${x(0.8)} L${R(w)} ${x(11)}`;
    case 'past':
      // Nearly flat, a soft bow across the top. Past plans lose their kind's cut as they drain.
      return `0 ${x(4)} C${x(16)} ${x(0.5)} ${x(46)} 0 ${R(w)} ${x(3)}`;
    case 'social':
      // Two soft peaks, the left one taller, with a dip between.
      return `0 ${x(10)} C${x(5)} ${x(1)} ${x(13)} 0 ${x(18)} ${x(1)} C${x(25)} ${x(5)} ${x(29)} ${x(9)} ${x(34)} ${x(8)} C${x(40)} ${x(6)} ${x(46)} ${x(2)} ${x(52)} ${x(1.5)} C${x(57)} ${x(1)} ${x(61)} ${x(4)} ${R(w)} ${x(9)}`;
    case 'obligation':
      // Crown: three points.
      return `0 ${x(14)} L${x(11)} ${x(1)} L${x(22)} ${x(10)} L${x(32)} 0 L${x(42)} ${x(10)} L${x(53)} ${x(1)} L${R(w)} ${x(14)}`;
    case 'enjoy': {
      // Two round bumps.
      const rx = R(w / 4);
      const ry = x(15);
      return `0 ${ry} A${rx} ${ry} 0 0 1 ${R(w / 2)} ${ry} A${rx} ${ry} 0 0 1 ${R(w)} ${ry}`;
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
