/**
 * OKLCH and OKLab: colour you can mix, lighten and rotate perceptually.
 *
 * In sRGB "the same lightness" means very different things for yellow and
 * blue; in OKLCH a lightness is a lightness, so a tint keeps its hue and a
 * scale steps evenly. Out-of-gamut results are brought back by reducing
 * chroma (never by clipping channels), so a derived colour keeps the hue it
 * was asked for.
 *
 * @module oklch
 */

import { hexToRgb, rgbToHex } from './index.js';
import { fromPolar, linearToOklab, linearToSrgb, oklabToLinear, srgbToLinear, toPolar } from './spaces.js';

/** How far outside 0-1 a linear channel may sit and still count as in gamut. */
const GAMUT_EPSILON = 0.0005;

/**
 * A hex color in OKLab.
 *
 * @param {string} hex - Hex color (3 or 6 digit, with or without '#').
 * @returns {[number, number, number]} L (0-1), a, b.
 */
function toOklab(hex) {
  const { r, g, b } = hexToRgb(hex);
  return linearToOklab([srgbToLinear(r / 255), srgbToLinear(g / 255), srgbToLinear(b / 255)]);
}

/** @param {number[]} lin - Linear channels. @returns {boolean} Whether they're all displayable. */
const inGamut = (lin) => lin.every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);

/** @param {number[]} lin - Linear channels. @returns {string} Lowercase `#rrggbb`. */
const linearToHex = (lin) => rgbToHex(...lin.map((v) => linearToSrgb(Math.max(0, Math.min(1, v))) * 255));

/**
 * A hex color in OKLCH.
 *
 * @param {string} hex - Hex color (3 or 6 digit, with or without '#').
 * @returns {{ l: number, c: number, h: number }} Lightness 0-1, chroma (about 0-0.37), hue in degrees (0-360).
 *
 * @example
 * toOklch('#2563eb'); // { l: 0.546, c: 0.215, h: 262.9 } (rounded)
 */
export function toOklch(hex) {
  const [l, c, h] = toPolar(toOklab(hex));
  return { l, c, h };
}

/**
 * An OKLCH color as hex. When it falls outside sRGB, chroma is reduced
 * (lightness and hue kept) to the most that fits, found by bisection.
 *
 * @param {{ l: number, c: number, h: number }} lch - Lightness 0-1, chroma, hue in degrees.
 * @returns {string} Lowercase `#rrggbb`.
 *
 * @example
 * fromOklch({ l: 0.7, c: 0.12, h: 30 }); // a soft coral
 * fromOklch({ l: 0.9, c: 0.4, h: 260 }); // the most saturated pale blue sRGB has
 */
export function fromOklch({ l, c, h }) {
  const L = Math.max(0, Math.min(1, l));
  const at = (/** @type {number} */ chroma) => oklabToLinear(fromPolar([L, chroma, h]));
  if (inGamut(at(Math.max(0, c)))) return linearToHex(at(Math.max(0, c)));
  let lo = 0, hi = c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(at(mid))) lo = mid;
    else hi = mid;
  }
  return linearToHex(at(lo));
}

/**
 * A color as a CSS `oklch()` value.
 *
 * @param {string} hex - Hex color.
 * @returns {string} `oklch(54.6% 0.215 262.9)`: lightness to a tenth of a percent, chroma to 3 places, hue to a tenth.
 *
 * @example
 * formatOklch('#2563eb'); // 'oklch(54.6% 0.215 262.9)'
 */
export function formatOklch(hex) {
  const { l, c, h } = toOklch(hex);
  const round = (/** @type {number} */ v, /** @type {number} */ p) => Number(v.toFixed(p));
  return `oklch(${round(l * 100, 1)}% ${round(c, 3)} ${c < 0.0005 ? 0 : round(h, 1)})`;
}

/**
 * Mix two colors in OKLab: perceptually even, no muddy or dark midpoints.
 *
 * @param {string} a - First hex color.
 * @param {string} b - Second hex color.
 * @param {number} [t=0.5] - 0 gives `a`, 1 gives `b`.
 * @returns {string} Lowercase `#rrggbb`.
 *
 * @example
 * mixOklab('#ffffff', '#2563eb', 0.1); // a pale blue tint
 */
export function mixOklab(a, b, t = 0.5) {
  const p = toOklab(a), q = toOklab(b);
  return linearToHex(oklabToLinear([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]));
}

/**
 * Mix two colors in OKLCH: lightness and chroma linearly, hue the short way
 * round. Far-apart hues stay vivid instead of passing through grey (orange
 * to blue goes by way of pink). A near-grey takes the other color's hue.
 *
 * @param {string} a - First hex color.
 * @param {string} b - Second hex color.
 * @param {number} [t=0.5] - 0 gives `a`, 1 gives `b`.
 * @returns {string} Lowercase `#rrggbb`.
 *
 * @example
 * mixOklch('#c9502a', '#a9bdf2', 0.5); // a clear rose, not a muddy mauve
 */
export function mixOklch(a, b, t = 0.5) {
  const p = toOklch(a), q = toOklch(b);
  const ph = p.c < 0.02 ? q.h : p.h;
  const qh = q.c < 0.02 ? p.h : q.h;
  const dh = ((qh - ph + 540) % 360) - 180;
  return fromOklch({ l: p.l + (q.l - p.l) * t, c: p.c + (q.c - p.c) * t, h: (ph + dh * t + 360) % 360 });
}
