/**
 * WCAG levels: what a contrast ratio is good for, and picking the first
 * color from a list that reads on a ground.
 *
 * @module wcag
 */

import { contrastRatio } from './index.js';

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
