/**
 * WCAG levels: what a contrast ratio is good for, what text needs, text's
 * contrast with what's behind it, picking the first color from a list that
 * reads on a ground, and the nearest colour that reads.
 *
 * @module wcag
 */

import { apcaContrast } from './apca.js';
import { contrastRatio, hexToRgb, rgbToHex } from './index.js';
import { fromOklch, toOklch } from './oklch.js';
import { blendOver, rgbaToHex } from './rgba.js';

/** @import { Rgba } from './rgba.js' */

/** WCAG 2's thresholds: body text AA and AAA, and large text or graphics (1.4.3, 1.4.6, 1.4.11). */
export const WCAG = Object.freeze({ AA: 4.5, AAA: 7, LARGE: 3 });

/**
 * What a contrast ratio passes.
 *
 * @param {number} ratio - A WCAG contrast ratio (1-21).
 * @returns {'AAA' | 'AA' | 'AA Large' | 'Fail'} The best level it clears.
 *
 * @example
 * wcagLevel(contrastRatio('#ffffff', '#2563eb')); // 'AA'
 */
export function wcagLevel(ratio) {
  if (ratio >= WCAG.AAA) return 'AAA';
  if (ratio >= WCAG.AA) return 'AA';
  if (ratio >= WCAG.LARGE) return 'AA Large';
  return 'Fail';
}

/**
 * The first color that clears a ratio on a ground; if none does, the one
 * with the most contrast.
 *
 * @param {string[]} candidates - Hex colors, in order of preference.
 * @param {string} ground - The hex background.
 * @param {number} [ratio=4.5] - The WCAG ratio to clear.
 * @returns {string} One of the candidates, as given.
 *
 * @example
 * pickReadable(['#ffd400', '#b39500', '#786300'], '#ffffff'); // '#786300'
 */
export function pickReadable(candidates, ground, ratio = WCAG.AA) {
  const hit = candidates.find((c) => contrastRatio(c, ground) >= ratio);
  if (hit) return hit;
  return candidates.reduce((best, c) => (contrastRatio(c, ground) > contrastRatio(best, ground) ? c : best), candidates[0]);
}

/**
 * Whether text counts as large for WCAG 2: at least 18pt (24 CSS px), or 14pt (18.67 px) when bold.
 *
 * @param {number} size - Its size, CSS px.
 * @param {number} weight - Its weight (700 is bold).
 * @returns {boolean} It's large.
 *
 * @example
 * isLargeText(24, 400);    // true
 * isLargeText(18.67, 700); // true
 * isLargeText(18.67, 600); // false
 */
export const isLargeText = (size, weight) => size >= 24 || (size >= 56 / 3 - 0.005 && weight >= 700);

/**
 * The ratio text needs at a WCAG 2 level (1.4.3 AA, 1.4.6 AAA).
 *
 * @param {'AA' | 'AAA'} level - The level.
 * @param {boolean} large - The text is large ({@link isLargeText}).
 * @returns {number} 3, 4.5 or 7.
 *
 * @example
 * requiredRatio('AA', false); // 4.5
 * requiredRatio('AAA', true); // 4.5
 */
export function requiredRatio(level, large) {
  if (level === 'AAA') return large ? WCAG.AA : WCAG.AAA;
  return large ? WCAG.LARGE : WCAG.AA;
}

/**
 * Text's contrast with its background: the WCAG 2 ratio and APCA's Lc, translucent text laid on
 * the background first (as it shows).
 *
 * @param {Rgba} text - The text's colour.
 * @param {Rgba} background - What's behind it (opaque).
 * @returns {{ratio: number, apca: number}} The ratio (1-21, unrounded: WCAG doesn't round, 4.499
 *   fails 4.5) and Lc.
 *
 * @example
 * textContrast({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 }); // { ratio: ~3.95, apca: ~… }
 */
export function textContrast(text, background) {
  const shown = rgbaToHex({ ...blendOver(text, background), a: 1 });
  const ground = rgbaToHex({ ...background, a: 1 });
  return { ratio: contrastRatio(shown, ground), apca: apcaContrast(shown, ground) };
}

/** How finely {@link nearestReadable} steps through OKLCH lightness. */
const LIGHTNESS_STEP = 0.001;

/**
 * The colour nearest a text colour that reads on a background: its OKLCH lightness moved as
 * little as it takes (up or down, whichever is closer), its hue kept, its chroma kept as far as
 * sRGB allows. Each candidate is checked as the hex it's returned as.
 *
 * @param {string} text - The text's hex colour.
 * @param {string} background - The background's hex colour.
 * @param {number} [ratio=4.5] - The WCAG ratio to clear.
 * @returns {string | null} Lowercase `#rrggbb` (the text itself when it already reads), or null
 *   when no lightness clears the ratio (7:1 on a mid grey).
 *
 * @example
 * nearestReadable('#999999', '#ffffff');      // '#767676'
 * nearestReadable('#1a73e8', '#0b1220', 7);   // a lighter blue, same hue
 */
export function nearestReadable(text, background, ratio = WCAG.AA) {
  if (contrastRatio(text, background) >= ratio) {
    const { r, g, b } = hexToRgb(text);
    return rgbToHex(r, g, b);
  }
  const { l, c, h } = toOklch(text);
  /** @param {number} direction - -1 darker, 1 lighter. @returns {{hex: string, shift: number} | null} */
  const search = (direction) => {
    for (let shift = LIGHTNESS_STEP; l + direction * shift >= -LIGHTNESS_STEP && l + direction * shift <= 1 + LIGHTNESS_STEP; shift += LIGHTNESS_STEP) {
      const hex = fromOklch({ l: l + direction * shift, c, h });
      if (contrastRatio(hex, background) >= ratio) return { hex, shift };
    }
    return null;
  };
  const found = [search(-1), search(1)].filter((each) => each !== null).sort((a, b) => a.shift - b.shift);
  return found[0]?.hex ?? null;
}
