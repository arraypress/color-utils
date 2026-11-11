/**
 * CSS colours, read and written: every absolute colour CSS Color 4 has
 * (hex, named colours, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`,
 * `oklab()`, `oklch()` and `color()` in each predefined space, `none`
 * channels, either syntax) read as sRGB the way a browser draws it on an sRGB
 * screen (channels outside sRGB clipped, as Chrome does), and an sRGB colour
 * written in any of eight formats. Browsers give computed colours in exactly
 * these forms (`color-mix()`, `light-dark()` and relative colours come back
 * resolved), so `parseColor(getComputedStyle(el).color)` always gives a colour.
 *
 * @module css
 */

import { COLOR_NAMES } from './names.js';
import { rgbaToHex } from './rgba.js';
import {
  RGB_SPACES, fromPolar, hslToSrgb, hwbToSrgb, labToLinear, linearToLab, linearToOklab, linearToSrgb, oklabToLinear,
  rgbSpaceToLinear, srgbToHsl, srgbToHwb, srgbToLinear, toPolar,
} from './spaces.js';

/** @import { Rgba } from './rgba.js' */
/** @typedef {import('./spaces.js').Triple} Triple */

/**
 * The CSS named colours (`rebeccapurple`, `grey` and `gray`), from {@link COLOR_NAMES} and the
 * keywords it names differently or leaves out.
 *
 * @type {ReadonlyMap<string, string>}
 */
const KEYWORDS = new Map([
  ...Object.entries(COLOR_NAMES).flatMap(([name, hex]) => {
    const keyword = name.toLowerCase().replaceAll(' ', '');
    return keyword.includes('grey') ? [[keyword, hex], [keyword.replace('grey', 'gray'), hex]] : [[keyword, hex]];
  }),
  ['lightgoldenrodyellow', COLOR_NAMES['Light Goldenrod']],
  ['aqua', COLOR_NAMES.Cyan],
  ['fuchsia', COLOR_NAMES.Magenta],
].filter(([keyword]) => keyword !== 'lightgoldenrod'));

/** The ways {@link formatColor} writes a colour. */
export const COLOR_FORMATS = Object.freeze(/** @type {const} */ (['hex', 'rgb', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch']));

/** @typedef {typeof COLOR_FORMATS[number]} ColorFormat */

/**
 * One channel as written: a number, a percentage, an angle, or `none`.
 *
 * @typedef {{value: number, unit: '' | '%' | 'deg'}} Token
 */

/** Angle units in degrees. */
const ANGLES = { deg: 1, rad: 180 / Math.PI, grad: 0.9, turn: 360 };

/**
 * Read one channel.
 *
 * @param {string} text - The channel as written.
 * @returns {Token | null} It, or null when it isn't a channel.
 */
function token(text) {
  if (text === 'none') return { value: 0, unit: '' };
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg|rad|grad|turn)?$/.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (!unit) return { value, unit: '' };
  if (unit === '%') return { value, unit: '%' };
  return { value: value * ANGLES[/** @type {keyof typeof ANGLES} */ (unit)], unit: 'deg' };
}

/**
 * A channel's number, a percentage taken as a share of `full`.
 *
 * @param {Token} t - The channel.
 * @param {number} full - What 100% is.
 * @returns {number} The number.
 */
const scaled = (t, full) => (t.unit === '%' ? (t.value / 100) * full : t.value);

/**
 * A function's arguments: three channels and an optional alpha, in the modern (`r g b / a`) or
 * legacy (`r, g, b, a`) syntax.
 *
 * @param {string} body - What's between the parentheses.
 * @returns {{channels: Token[], alpha: number} | null} Them, or null when malformed.
 */
function argumentsOf(body) {
  const legacy = body.includes(',');
  const [main, slash, extra] = legacy ? [body, undefined, undefined] : body.split('/');
  if (extra !== undefined) return null;
  const parts = main.trim().split(legacy ? /\s*,\s*/ : /\s+/).filter(Boolean);
  const alphaText = legacy ? parts[3] : slash?.trim();
  if (parts.length !== (legacy && parts.length === 4 ? 4 : 3)) return null;
  const channels = parts.slice(0, 3).map(token);
  if (channels.some((t) => t === null)) return null;
  const alpha = alphaText === undefined ? { value: 1, unit: '' } : token(alphaText);
  if (!alpha) return null;
  return { channels: /** @type {Token[]} */ (channels), alpha: Math.max(0, Math.min(1, scaled(alpha, 1))) };
}

/**
 * Linear sRGB as a colour, clipped to sRGB as a browser draws it there.
 *
 * @param {Triple} linear - Linear sRGB.
 * @param {number} alpha - Alpha.
 * @returns {Rgba} The colour.
 */
const fromLinear = (linear, alpha) => fromSrgb(/** @type {Triple} */ (linear.map(linearToSrgb)), alpha);

/**
 * sRGB channels (0-1) as a colour, clipped.
 *
 * @param {Triple} srgb - sRGB, 0-1.
 * @param {number} alpha - Alpha.
 * @returns {Rgba} The colour.
 */
const fromSrgb = ([r, g, b], alpha) => {
  const clip = (/** @type {number} */ c) => Math.max(0, Math.min(1, c)) * 255;
  return { r: clip(r), g: clip(g), b: clip(b), a: alpha };
};

/**
 * Each CSS colour function's channels as a colour.
 *
 * @type {Record<string, (c: Token[], alpha: number) => Rgba>}
 */
const FUNCTIONS = {
  rgb: (c, alpha) => fromSrgb(/** @type {Triple} */ (c.map((t) => scaled(t, 255) / 255)), alpha),
  hsl: ([h, s, l], alpha) => fromSrgb(hslToSrgb([h.value, scaled(s, 100) / 100, scaled(l, 100) / 100]), alpha),
  hwb: ([h, w, b], alpha) => fromSrgb(hwbToSrgb([h.value, scaled(w, 100) / 100, scaled(b, 100) / 100]), alpha),
  lab: ([l, a, b], alpha) => fromLinear(labToLinear([scaled(l, 100), scaled(a, 125), scaled(b, 125)]), alpha),
  lch: ([l, c, h], alpha) => fromLinear(labToLinear(fromPolar([scaled(l, 100), scaled(c, 150), h.value])), alpha),
  oklab: ([l, a, b], alpha) => fromLinear(oklabToLinear([scaled(l, 1), scaled(a, 0.4), scaled(b, 0.4)]), alpha),
  oklch: ([l, c, h], alpha) => fromLinear(oklabToLinear(fromPolar([scaled(l, 1), scaled(c, 0.4), h.value])), alpha),
};
FUNCTIONS.rgba = FUNCTIONS.rgb;
FUNCTIONS.hsla = FUNCTIONS.hsl;

/**
 * A hex colour's digits as a colour: 3, 4, 6 or 8 of them.
 *
 * @param {string} digits - The digits, without `#`.
 * @returns {Rgba | null} The colour, or null.
 */
function fromHex(digits) {
  if (!/^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(digits)) return null;
  const full = digits.length <= 4 ? [...digits].map((d) => d + d).join('') : digits;
  const [r, g, b, a = 255] = (full.match(/../g) ?? []).map((pair) => parseInt(pair, 16));
  return { r, g, b, a: a / 255 };
}

/**
 * Read a CSS colour as sRGB, as a browser draws it on an sRGB screen.
 *
 * @param {string} text - Any absolute CSS colour: `#1a73e8`, `rebeccapurple`, `transparent`,
 *   `rgb(26 115 232 / 50%)`, `rgba(0, 0, 0, 0.5)`, `hsl(214 82% 51%)`, `hwb(…)`, `lab(…)`,
 *   `lch(…)`, `oklab(…)`, `oklch(0.7 0.15 200)`, `color(display-p3 1 0 0)` (`srgb`, `srgb-linear`,
 *   `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz`, `xyz-d50`, `xyz-d65`).
 * @returns {Rgba | null} The colour (channels outside sRGB clipped), or null for anything else
 *   (`currentcolor`, system colours, `color-mix()` as written, a typo).
 *
 * @example
 * parseColor('rgba(0, 0, 0, 0.5)');      // { r: 0, g: 0, b: 0, a: 0.5 }
 * parseColor('oklch(0.7 0.15 200)');     // { r: ~0, g: ~185, b: ~195, a: 1 }
 * parseColor('color(display-p3 1 0 0)'); // { r: 255, g: 0, b: 0, a: 1 } (clipped)
 */
export function parseColor(text) {
  const value = text.trim().toLowerCase();
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (value.startsWith('#')) return fromHex(value.slice(1));
  const keyword = KEYWORDS.get(value);
  if (keyword) return /** @type {Rgba} */ (fromHex(keyword.slice(1)));
  const call = /^([a-z0-9-]+)\((.*)\)$/s.exec(value);
  if (!call) return null;
  const [, name, body] = call;
  if (name === 'color') {
    const space = /^\s*([a-z0-9-]+)\s+(.*)$/s.exec(body);
    const rgbSpace = space && RGB_SPACES[space[1]];
    const args = rgbSpace && argumentsOf(space[2]);
    if (!rgbSpace || !args || body.includes(',')) return null;
    if (rgbSpace === RGB_SPACES.srgb) return fromSrgb(/** @type {Triple} */ (args.channels.map((t) => scaled(t, 1))), args.alpha);
    return fromLinear(rgbSpaceToLinear(rgbSpace, /** @type {Triple} */ (args.channels.map((t) => scaled(t, 1)))), args.alpha);
  }
  const read = FUNCTIONS[name];
  const args = read && argumentsOf(body);
  return args ? read(args.channels, args.alpha) : null;
}

/**
 * Round to at most `places` decimals, without trailing zeros (and never `-0`).
 *
 * @param {number} value - The number.
 * @param {number} places - Decimals.
 * @returns {number} It, rounded.
 */
const round = (value, places) => Number(value.toFixed(places)) || 0;

/**
 * A hue, 0 when the colour has (almost) none.
 *
 * @param {number} hue - Degrees.
 * @param {number} chroma - How colourful; below `grey` it's grey.
 * @param {number} grey - The chroma below which there's no hue.
 * @param {number} places - Decimals.
 * @returns {number} The hue to write.
 */
const hueOf = (hue, chroma, grey, places) => (chroma < grey ? 0 : round(hue, places) % 360);

/**
 * Write a colour as CSS.
 *
 * @param {Rgba} color - The colour.
 * @param {ColorFormat} format - How: `hex` (`#1a73e8`, `#1a73e880`), `rgb` (`rgb(26 115 232)`),
 *   `hsl` (`hsl(214 82% 51%)`), `hwb` (`hwb(214 10% 9%)`), `lab` (`lab(48.77 9.69 -67.47)`), `lch`
 *   (`lch(48.77 68.16 278.17)`), `oklab` (`oklab(57.37% -0.0409 -0.1902)`), `oklch` (`oklch(57.37%
 *   0.1946 257.86)`): enough places that each reads back as the same 8-bit colour. Modern syntax; alpha after a slash when below 1, to two decimals.
 * @returns {string} The CSS.
 *
 * @example
 * formatColor({ r: 26, g: 115, b: 232, a: 1 }, 'hsl');   // 'hsl(214 82% 51%)'
 * formatColor({ r: 26, g: 115, b: 232, a: 0.5 }, 'rgb'); // 'rgb(26 115 232 / 0.5)'
 */
export function formatColor(color, format) {
  const alpha = round(color.a, 2);
  const slash = alpha < 1 ? ` / ${alpha}` : '';
  /** @type {Triple} */
  const srgb = [color.r / 255, color.g / 255, color.b / 255];
  const linear = /** @type {Triple} */ (srgb.map(srgbToLinear));
  switch (format) {
    case 'rgb': return `rgb(${round(color.r, 0)} ${round(color.g, 0)} ${round(color.b, 0)}${slash})`;
    case 'hsl': {
      const [h, s, l] = srgbToHsl(srgb);
      return `hsl(${hueOf(h, s, 0.005, 0)} ${round(s * 100, 0)}% ${round(l * 100, 0)}%${slash})`;
    }
    case 'hwb': {
      const [h, w, b] = srgbToHwb(srgb);
      return `hwb(${hueOf(h, 1 - w - b, 0.005, 0)} ${round(w * 100, 0)}% ${round(b * 100, 0)}%${slash})`;
    }
    case 'lab': {
      const [l, a, b] = linearToLab(linear);
      return `lab(${round(l, 2)} ${round(a, 2)} ${round(b, 2)}${slash})`;
    }
    case 'lch': {
      const [l, c, h] = toPolar(linearToLab(linear));
      return `lch(${round(l, 2)} ${round(c, 2)} ${hueOf(h, c, 0.05, 2)}${slash})`;
    }
    case 'oklab': {
      const [l, a, b] = linearToOklab(linear);
      return `oklab(${round(l * 100, 2)}% ${round(a, 4)} ${round(b, 4)}${slash})`;
    }
    case 'oklch': {
      const [l, c, h] = toPolar(linearToOklab(linear));
      return `oklch(${round(l * 100, 2)}% ${round(c, 4)} ${hueOf(h, c, 0.0005, 2)}${slash})`;
    }
    default: return rgbaToHex(color);
  }
}

/** A colour function or keyword inside a longer value: a gradient, a shadow. */
const COLOR_IN_VALUE = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|#[0-9a-f]{3,8}\b|\btransparent\b/gi;

/**
 * The colours written in a longer CSS value, in order: a computed gradient's stops, a computed
 * shadow's colours (which browsers write as `rgb()`, `color()`, `oklch()` and the like).
 *
 * @param {string} value - The value: `linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0) 50%)`.
 * @returns {string[]} Each colour as written, to read with {@link parseColor}.
 *
 * @example
 * cssColorsIn('rgba(0, 0, 0, 0.2) 0px 1px 2px 0px, rgb(26, 115, 232) 0px 0px 0px 2px');
 * // ['rgba(0, 0, 0, 0.2)', 'rgb(26, 115, 232)']
 */
export const cssColorsIn = (value) => value.match(COLOR_IN_VALUE) ?? [];
