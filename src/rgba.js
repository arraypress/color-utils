/**
 * Colours with alpha, as browsers draw them: `{r, g, b, a}` with channels
 * 0-255 (fractions allowed, so nothing is lost before the end) and alpha 0-1.
 * Laying a translucent colour over another, writing one as hex, and how far
 * apart two colours look (ΔE in OKLab).
 *
 * @module rgba
 */

import { rgbToHex } from './index.js';
import { linearToOklab, srgbToLinear } from './spaces.js';

/**
 * A colour in sRGB with alpha.
 *
 * @typedef {object} Rgba
 * @property {number} r Red, 0-255.
 * @property {number} g Green, 0-255.
 * @property {number} b Blue, 0-255.
 * @property {number} a Alpha, 0 (transparent) to 1 (opaque).
 */

/** Nothing: transparent black, what a box without a background paints. */
export const TRANSPARENT = Object.freeze({ r: 0, g: 0, b: 0, a: 0 });

/**
 * A colour laid over another (source-over), as it shows.
 *
 * @param {Rgba} top - The colour on top.
 * @param {Rgba} bottom - What's behind it.
 * @returns {Rgba} What shows: opaque when either is.
 *
 * @example
 * blendOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 }); // { r: 127.5, g: 127.5, b: 127.5, a: 1 }
 */
export function blendOver(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { ...TRANSPARENT };
  /** @param {'r' | 'g' | 'b'} key */
  const mix = (key) => (top[key] * top.a + bottom[key] * bottom.a * (1 - top.a)) / a;
  return { r: mix('r'), g: mix('g'), b: mix('b'), a };
}

/**
 * A colour as hex: `#rrggbb`, or `#rrggbbaa` when it's translucent. Channels are rounded.
 *
 * @param {Rgba} color - The colour.
 * @returns {string} Lowercase hex.
 *
 * @example
 * rgbaToHex({ r: 26, g: 115, b: 232, a: 1 });   // '#1a73e8'
 * rgbaToHex({ r: 26, g: 115, b: 232, a: 0.5 }); // '#1a73e880'
 */
export function rgbaToHex({ r, g, b, a }) {
  const hex = rgbToHex(r, g, b);
  const alpha = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return alpha < 255 ? hex + alpha.toString(16).padStart(2, '0') : hex;
}

/**
 * A colour in OKLab.
 *
 * @param {Rgba} color - The colour (alpha ignored).
 * @returns {[number, number, number]} L (0-1), a, b.
 */
export const rgbaToOklab = ({ r, g, b }) => linearToOklab([srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)]);

/**
 * How different two colours look: the distance between them in OKLab (ΔEOK).
 * About 0.02 is the smallest difference most people notice side by side; 0 is
 * the same colour. Alpha is ignored: compare like with like.
 *
 * @param {Rgba} one - A colour.
 * @param {Rgba} other - Another.
 * @returns {number} The distance, 0 to about 1 (black to white is 1).
 *
 * @example
 * deltaEOK({ r: 51, g: 51, b: 51, a: 1 }, { r: 52, g: 52, b: 52, a: 1 }); // ~0.003
 */
export function deltaEOK(one, other) {
  const [l1, a1, b1] = rgbaToOklab(one);
  const [l2, a2, b2] = rgbaToOklab(other);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
