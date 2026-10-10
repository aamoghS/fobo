import { shadow } from './tokens';

/** Splits a shadow token ("0 2px 0 rgba(...)") so SVG art can draw it as an offset copy. */
export function parseShadow(value: string) {
  const [x = 0, y = 0, blur = 0] = value.match(/-?[\d.]+(?=px|\s)/g)?.map(Number) ?? [];
  const color = value.match(/rgba?\([^)]*\)|#[0-9a-f]+/i)?.[0] ?? 'transparent';
  return { x, y, blur, color };
}

export const paperShadow = parseShadow(shadow.paper);
