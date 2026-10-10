import type { PlanKind } from '@/features/plans/types';

export type ScrapCut = PlanKind | 'past';

// Shapes traced from the Your week shelf (391:12486). Coordinates are for a 46-wide scrap whose
// highest point sits at y = 0; they scale with width, and the body below stretches with height.
const BASE_W = 46;
const R = (n: number) => Math.round(n * 100) / 100;

/** Height of the top cut band at width w (the part above the flat-sided body). */
export function cutDepth(cut: ScrapCut, w: number) {
  const s = w / BASE_W;
  switch (cut) {
    case 'work':
    case 'past':
      return 10 * s;
    case 'social':
      return 12.1 * s;
    case 'obligation':
      return 9 * s;
    case 'enjoy':
      return 12 * s;
    case 'rest':
      return 0;
  }
}

/**
 * SVG path for one scrap of paper. Height shows energy, so h is free. Work scraps come in the
 * shelf's two snips, picked by seed so a plan always gets the same one. Rest is a cushion.
 */
export function scrapPath(cut: ScrapCut, w: number, h: number, seed = 1): string {
  const s = w / BASE_W;
  const x = (n: number) => R(n * s);
  const H = R(h);

  switch (cut) {
    case 'work':
    case 'past':
      // Snipped top-right corner; the right edge tapers in a little.
      return mulberry32(seed)() < 0.75
        ? `M0 ${H} V${x(2)} L${x(40)} 0 L${R(w)} ${x(10)} L${x(43)} ${H} Z`
        : `M${x(2)} ${H} L0 0 L${x(40)} ${x(2)} L${R(w)} ${x(8)} V${H} Z`;
    case 'social':
      // Flat on the left, rising to a rounded bump on the right.
      return `M0 ${H} L${x(1)} ${x(12.1)} L${x(22)} ${x(8.1)} C${x(27.33)} ${x(2.1)} ${x(32.67)} ${x(-0.57)} ${x(38)} ${x(0.1)} C${x(42.67)} ${x(1.43)} ${x(45.33)} ${x(5.43)} ${R(w)} ${x(12.1)} V${H} Z`;
    case 'obligation': {
      // Pinking-shears crown: four teeth.
      const pts = [[0, 9], [6, 1], [11, 8], [17, 0], [23, 8], [29, 0], [35, 8], [40, 1], [46, 9]];
      return `M0 ${H} ${pts.map(([px, py]) => `L${x(px)} ${x(py)}`).join(' ')} V${H} Z`;
    }
    case 'enjoy':
      // Two round bumps.
      return `M0 ${H} V${x(10)} C${x(1.33)} ${x(3.33)} ${x(6)} 0 ${x(14)} 0 C${x(19.33)} 0 ${x(22.33)} ${x(2.67)} ${x(23)} ${x(8)} C${x(23.67)} ${x(2.67)} ${x(27)} 0 ${x(33)} 0 C${x(41.67)} 0 ${R(w)} ${x(4)} ${R(w)} ${x(12)} V${H} Z`;
    case 'rest': {
      // Cloud cushion, 50x18.67 in the source; scaled to fill w x h.
      const cx = (n: number) => R((n / 50) * w);
      const cy = (n: number) => R((n / 18.67) * h);
      return [
        `M0 ${cy(18.67)}`,
        `C0 ${cy(12.67)} ${cx(2.67)} ${cy(9.67)} ${cx(8)} ${cy(9.67)}`,
        `C${cx(10)} ${cy(5)} ${cx(13.67)} ${cy(3.33)} ${cx(19)} ${cy(4.67)}`,
        `C${cx(22.33)} ${cy(0.67)} ${cx(26.33)} 0 ${cx(31)} ${cy(2.67)}`,
        `C${cx(36.33)} ${cy(0.67)} ${cx(40)} ${cy(2)} ${cx(42)} ${cy(6.67)}`,
        `C${cx(47.33)} ${cy(6.67)} ${R(w)} ${cy(10.67)} ${R(w)} ${cy(18.67)}`,
        'Z',
      ].join(' ');
    }
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
