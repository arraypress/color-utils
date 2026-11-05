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

/** @param {number} c - sRGB channel, 0-1. @returns {number} Linear channel. */
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** @param {number} c - Linear channel. @returns {number} sRGB channel, 0-1. */
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

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
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * OKLab to linear sRGB, unclamped (outside 0-1 when out of gamut).
 *
 * @param {number} L @param {number} A @param {number} B
 * @returns {[number, number, number]} Linear red, green, blue.
 */
function oklabToLinear(L, A, B) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** @param {number[]} lin - Linear channels. @returns {boolean} Whether they're all displayable. */
const inGamut = (lin) => lin.every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);

/** @param {number[]} lin - Linear channels. @returns {string} Lowercase `#rrggbb`. */
const linearToHex = (lin) => rgbToHex(...lin.map((v) => toGamma(Math.max(0, Math.min(1, v))) * 255));

/** OKLCH lightness, chroma and hue as OKLab a and b. */
const lab = (/** @type {number} */ c, /** @type {number} */ h) => [c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];

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
  const [l, a, b] = toOklab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
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
  const at = (/** @type {number} */ chroma) => oklabToLinear(L, ...lab(chroma, h));
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
  return linearToHex(oklabToLinear(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t));
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
