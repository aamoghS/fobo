// Generates src/styles/tokens.ts from src/styles/tokens.css so React Native can use the same tokens.
// Run: npm run tokens
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));
const outPath = fileURLToPath(new URL('../src/styles/tokens.ts', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const root = css.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';
const vars = new Map<string, string>();
for (const [, name, value] of root.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars.set(name, value.trim());

const resolve = (value: string): string =>
  value.replace(/var\(--([\w-]+)\)/g, (_, ref: string) => resolve(vars.get(ref) ?? ''));

const color: Record<string, string> = {};
const space: Record<string, number> = {};
const radius: Record<string, number> = {};
const shadow: Record<string, string> = {};

for (const [name, raw] of vars) {
  const value = resolve(raw);
  if (name.startsWith('space-')) space[name.slice(6)] = parseFloat(value);
  else if (name === 'margin') space.margin = parseFloat(value);
  else if (name.startsWith('r-')) radius[camel(name.slice(2))] = parseFloat(value);
  else if (name.startsWith('shadow-')) shadow[camel(name.slice(7))] = value;
  else if (name === 'font' || name === 'opsz') continue;
  else color[camel(name)] = value;
}

// .t-* classes: `font: <weight> <size>px/<line> var(--font); letter-spacing: <n>px;`
const fontFamily: Record<string, string> = {
  '500': 'DMSans_500Medium',
  '700': 'DMSans_700Bold',
  '900': 'DMSans_900Black',
};
const type: Record<string, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing: number }> = {};
for (const [, name, body] of css.matchAll(/\.t-([\w-]+)\s*{([^}]*)}/g)) {
  const font = body.match(/font:\s*(\d+)\s+([\d.]+)px\/([\d.]+)(px)?/);
  if (!font) continue;
  const [, weight, size, line, isPx] = font;
  const fontSize = parseFloat(size);
  type[camel(name)] = {
    fontFamily: fontFamily[weight],
    fontSize,
    lineHeight: isPx ? parseFloat(line) : Math.round(fontSize * parseFloat(line) * 100) / 100,
    letterSpacing: parseFloat(body.match(/letter-spacing:\s*(-?[\d.]+)px/)?.[1] ?? '0'),
  };
}

const out = `// Generated from tokens.css by scripts/gen-tokens.ts. Do not edit by hand.

export const color = ${JSON.stringify(color, null, 2)} as const;

export const space = ${JSON.stringify(space, null, 2)} as const;

export const radius = ${JSON.stringify(radius, null, 2)} as const;

export const shadow = ${JSON.stringify(shadow, null, 2)} as const;

export const fontFamily = ${JSON.stringify(fontFamily, null, 2)} as const;

export const type = ${JSON.stringify(type, null, 2)} as const;
`;

writeFileSync(outPath, out);
console.log(`Wrote ${outPath}`);
