/** Column width used when a character stands alone. On the shelf, the column decides. */
export const COLUMN = 46

/** Height grows with the load; width is fixed so the week reads as one even row. */
export function sizeFor(load: number, w = COLUMN): { w: number; h: number } {
  return { w, h: Math.max(w, 30 + Math.max(load, 0) * 14) }
}
