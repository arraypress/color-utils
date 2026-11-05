/**
 * A 50-950 tonal scale from one color, stepped evenly in OKLCH lightness
 * with the color's hue. Chroma is the color's own beside it and eases off
 * toward white and black (a pale tint or a near-black can't carry full
 * chroma without looking neon or muddy).
 *
 * @module scale
 */

import { toOklch, fromOklch } from './oklch.js';
import { hexToRgb, rgbToHex } from './index.js';

/** Each step's OKLCH lightness. */
export const SCALE_LIGHTNESS = Object.freeze({
  50: 0.975, 100: 0.94, 200: 0.885, 300: 0.81, 400: 0.72, 500: 0.63,
  600: 0.54, 700: 0.46, 800: 0.38, 900: 0.3, 950: 0.22,
});

/**
 * How much of the color's chroma a step keeps: all of it at the color's
 * own lightness, easing off toward white and black (to 0.3 at either
 * end): slowly toward white, so tints stay clear rather than grey, and
 * steadily toward black, so the darkest steps read as deep, not neon.
 *
 * @param {number} l - The step's lightness.
 * @param {number} from - The color's lightness.
 * @returns {number} 0.3-1.
 */
function chromaAt(l, from) {
  if (l > from) return 1 - 0.7 * ((l - from) / (1 - from)) ** 2;
  return 1 - 0.7 * ((from - l) / (from || 1));
}

/**
 * The step whose lightness is closest to a color's.
 *
 * @param {string} hex - Hex color.
 * @param {Record<string, number>} [lightness] - Steps and their lightness (default {@link SCALE_LIGHTNESS}).
 * @returns {string} The step, e.g. `'500'`.
 *
 * @example
 * scaleStep('#2563eb'); // '600'
 */
export function scaleStep(hex, lightness = SCALE_LIGHTNESS) {
  const { l } = toOklch(hex);
  let best = '', gap = Infinity;
  for (const [step, L] of Object.entries(lightness)) {
    if (Math.abs(L - l) < gap) [best, gap] = [step, Math.abs(L - l)];
  }
  return best;
}

/**
 * A tonal scale from one color.
 *
 * @param {string} hex - The color.
 * @param {object} [options]
 * @param {boolean} [options.anchor=true] - Put the color itself at its nearest step ({@link scaleStep}), so the scale contains it exactly.
 * @param {Record<string, number>} [options.lightness] - Steps and their lightness (default {@link SCALE_LIGHTNESS}).
 * @returns {Record<string, string>} Lowercase `#rrggbb` by step, lightest first.
 *
 * @example
 * scale('#2563eb'); // { 50: '#f3f6ff', …, 600: '#2563eb', …, 950: '#0d1a45' }
 */
export function scale(hex, { anchor = true, lightness = SCALE_LIGHTNESS } = {}) {
  const { l: from, c, h } = toOklch(hex);
  /** @type {Record<string, string>} */
  const out = {};
  for (const [step, l] of Object.entries(lightness)) out[step] = fromOklch({ l, c: c * chromaAt(l, from), h });
  if (anchor) {
    const { r, g, b } = hexToRgb(hex);
    out[scaleStep(hex, lightness)] = rgbToHex(r, g, b);
  }
  return out;
}
