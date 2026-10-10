import { fontFamily, type as tokenType } from './tokens';

/**
 * Figma text styles come from tokens.ts. The extra screen styles below are listed in
 * DESIGN.md §2 but are not Figma text styles.
 */
export const type = {
  ...tokenType,
  /** "Your week" */
  heroScreen: { fontFamily: fontFamily[700], fontSize: 40, lineHeight: 50, letterSpacing: 0 },
  /** "Plans", "People" */
  pageTitle: { fontFamily: fontFamily[700], fontSize: 36, lineHeight: 39, letterSpacing: -1.44 },
  /** "3 plans left" */
  stat: { fontFamily: fontFamily[700], fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  /** "4 social plans" on summary cards */
  statCard: { fontFamily: fontFamily[700], fontSize: 28, lineHeight: 35, letterSpacing: -0.84 },
  /** Plan names in lists */
  itemTitle: { fontFamily: fontFamily[700], fontSize: 18, lineHeight: 21, letterSpacing: 0 },
} as const;
