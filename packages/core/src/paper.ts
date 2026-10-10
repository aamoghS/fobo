import type { Category, Mood } from './types'

/**
 * Paper cut-out look. Every colour means something:
 * scraps in a stack are coloured by the kind of plan, a lone character by its mood.
 */
export const SCRAP: Record<Category, string> = {
  work: '#2547D0', // cobalt
  social: '#E8402A', // tomato
  obligation: '#E9A920', // mustard
  enjoy: '#1F9D6B', // leaf
  rest: '#F7A6C9', // pink
}

export const MOOD_PAPER: Record<Mood, string> = {
  bright: '#F5C125',
  fine: '#1F9D6B',
  stretched: '#F08A2A', // orange, so it never reads as the bright flower
  spent: '#E8402A',
  asleep: '#F7A6C9',
}

export const KRAFT = '#D9D9D4' // past days: the colour drained out to soft grey
export const INK = '#1E1B18'
export const SHEET = '#FFFDF8'

/** Small deterministic jitter so cuts look hand-made but never flicker between renders. */
export function jitter(seed: number, amount: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 2 * amount
}

/**
 * One scrap of paper, standing on y = 0, `w` wide and `h` tall, centred on x = 0.
 * The top edge is cut differently for each kind of plan.
 */
export function scrapPath(cat: Category, w: number, h: number, seed: number): string {
  const l = -w / 2 + jitter(seed, 1.2)
  const r = w / 2 + jitter(seed + 1, 1.2)
  const top = -h
  const j = (k: number) => jitter(seed + k, 1)
  const start = `M${l} ${j(2)} L${l + j(3) * 0.6} ${top + 6}`
  const end = `L${r} ${j(4)} Z`
  switch (cat) {
    case 'work': {
      // a straight cut with one snipped corner
      return `${start} L${l + 0.5} ${top + j(5)} L${r - 13} ${top + j(6)} L${r} ${top + 12} ${end}`
    }
    case 'social': {
      // a wavy cut
      const a = Math.min(8, h * 0.35)
      return `${start} C${l + w * 0.2} ${top - a} ${l + w * 0.3} ${top + a} ${l + w * 0.5} ${top} S${l + w * 0.8} ${top - a} ${r} ${top + 2} ${end}`
    }
    case 'obligation': {
      // pinking shears
      const teeth = Math.max(3, Math.round(w / 10))
      const step = (r - l) / teeth
      let d = `${start} L${l} ${top}`
      for (let i = 0; i < teeth; i++) d += ` L${l + step * (i + 0.5)} ${top - 7} L${l + step * (i + 1)} ${top}`
      return `${d} ${end}`
    }
    case 'enjoy': {
      // scallops
      const n = Math.max(2, Math.round(w / 20))
      const step = (r - l) / n
      let d = `${start} L${l} ${top}`
      for (let i = 0; i < n; i++) d += ` A${step / 2} ${step / 2.2} 0 0 1 ${l + step * (i + 1)} ${top}`
      return `${d} ${end}`
    }
    case 'rest':
    default: {
      // a cloud cushion
      const b = w / 4
      return `M${l} 0 C${l - 4} ${-h * 0.4} ${l + b * 0.4} ${-h} ${l + b} ${-h * 0.8} C${l + b * 1.4} ${-h * 1.2} ${l + b * 2.6} ${-h * 1.2} ${l + b * 2.8} ${-h * 0.8} C${r - b * 0.4} ${-h} ${r + 4} ${-h * 0.4} ${r} 0 Z`
    }
  }
}

/** A lone character's silhouette, cut to its mood. */
export function moodPath(mood: Mood, w: number, h: number): string {
  const r = w / 2
  switch (mood) {
    case 'bright': {
      // a flower: petals bulging out between points on an inner circle
      const n = 9
      const cy = -h / 2
      const R = Math.min(r, h / 2)
      const pt = (a: number, rad: number) => `${(Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`
      let d = `M${pt(0, R * 0.78)}`
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2
        const a1 = ((i + 1) / n) * Math.PI * 2
        d += ` Q${pt((a0 + a1) / 2, R * 1.22)} ${pt(a1, R * 0.78)}`
      }
      return `${d} Z`
    }
    case 'fine':
      // a soft square blob
      return `M${-r} 0 C${-r - 2} ${-h * 0.5} ${-r + 2} ${-h} ${-r * 0.2} ${-h + 1} C${r * 0.4} ${-h - 2} ${r + 2} ${-h * 0.9} ${r} ${-h * 0.45} C${r + 1} ${-h * 0.2} ${r} 0 ${r} 0 Z`
    case 'stretched': {
      // a tall slab with a zigzag top
      const teeth = 4
      const step = w / teeth
      let d = `M${-r} 0 L${-r} ${-h + 6}`
      for (let i = 0; i < teeth; i++) d += ` L${-r + step * (i + 0.5)} ${-h} L${-r + step * (i + 1)} ${-h + 6}`
      return `${d} L${r} 0 Z`
    }
    case 'spent':
      // a drooping blob that has melted a little
      return `M${-r - 4} 0 C${-r - 2} ${-h * 0.25} ${-r + 2} ${-h * 0.6} ${-r * 0.5} ${-h * 0.85} C${-r * 0.1} ${-h * 1.02} ${r * 0.6} ${-h * 0.98} ${r * 0.8} ${-h * 0.6} C${r} ${-h * 0.3} ${r + 6} ${-h * 0.1} ${r + 4} 0 Z`
    case 'asleep':
    default:
      return scrapPath('rest', w, h, 3)
  }
}

export const PAPER_SHADOW = 'drop-shadow(0 2px 0 rgba(20, 20, 20, 0.10))'
