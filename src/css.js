/**
 * CSS colours, read and written: every absolute colour CSS Color 4 has
 * (hex, named colours, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`,
 * `oklab()`, `oklch()` and `color()` in each predefined space, `none`
 * channels, either syntax) read as sRGB the way a browser draws it on an sRGB
 * screen (channels outside sRGB clipped, as Chrome does; `hsl()` to `oklch()`
 * by Chromium's own single-precision conversions, `chromium.js`), and an sRGB
 * colour written in any of eight formats, each as Chrome reads back exactly.
 * Browsers give computed colours in exactly these forms (`color-mix()`, `light-dark()` and relative colours come back
 * resolved), so `parseColor(getComputedStyle(el).color)` always gives a colour.
 *
 * @module css
 */

import { chromiumHsl, chromiumHwb, chromiumLab, chromiumOklab, chromiumPolar, chromiumToLab, chromiumToOklab } from './chromium.js';
import { COLOR_NAMES } from './names.js';
import { rgbaToHex } from './rgba.js';
import {
  RGB_SPACES, linearToSrgb, rgbSpaceToLinear, srgbToHsl, srgbToHwb, toPolar,
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
 * @typedef {{value: number, unit: '' | '%' | 'deg', none?: boolean}} Token
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
  if (text === 'none') return { value: 0, unit: '', none: true };
  const match = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(%|deg|rad|grad|turn)?$/.exec(text);
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
 * legacy (`r, g, b, a`) syntax. The legacy syntax is as strict as browsers are: no empty or
 * `none` argument.
 *
 * @param {string} body - What's between the parentheses.
 * @returns {{channels: Token[], alpha: number, legacy: boolean} | null} Them, or null when malformed.
 */
function argumentsOf(body) {
  const legacy = body.includes(',');
  const [main, slash, extra] = legacy ? [body, undefined, undefined] : body.split('/');
  if (extra !== undefined) return null;
  const parts = legacy ? main.split(',').map((part) => part.trim()) : main.trim().split(/\s+/);
  const alphaText = legacy ? parts[3] : slash?.trim();
  if (parts.length !== (legacy && parts.length === 4 ? 4 : 3)) return null;
  const channels = parts.slice(0, 3).map(token);
  const alpha = alphaText === undefined ? { value: 1, unit: '' } : token(alphaText);
  if (!alpha || channels.some((t) => t === null)) return null;
  const read = /** @type {Token[]} */ (channels);
  if (legacy && [...read, alpha].some((t) => t.none)) return null;
  return { channels: read, alpha: Math.max(0, Math.min(1, scaled(/** @type {Token} */ (alpha), 1))), legacy };
}

/**
 * A channel that can't be negative (a saturation, a chroma) or outside a range (a lightness),
 * kept within it as browsers keep it when they read the colour.
 *
 * @param {number} value - The channel.
 * @param {number} [most] - Its upper limit. Default none.
 * @returns {number} It, within 0 and `most`.
 */
const within = (value, most = Infinity) => Math.max(0, Math.min(most, value));

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
 * sRGB channels (0-1) from Chromium's own conversion ({@link module:chromium}) as a colour: clipped,
 * and scaled to 0-255 in single precision as Chromium does before it rounds to a pixel, so
 * `Math.round` gives the pixel it draws (`hsl(215 80% 50%)`'s red is 25.499998: 25).
 *
 * @param {Triple} srgb - sRGB, 0-1, single precision.
 * @param {number} alpha - Alpha.
 * @returns {Rgba} The colour.
 */
const drawn = ([r, g, b], alpha) => {
  const clip = (/** @type {number} */ c) => Math.fround(Math.max(0, Math.min(1, c)) * 255);
  return { r: clip(r), g: clip(g), b: clip(b), a: alpha };
};

/**
 * A hue within 0-360, as browsers take any angle.
 *
 * @param {number} degrees - The hue.
 * @returns {number} It, 0 or more and below 360.
 */
const turn = (degrees) => ((degrees % 360) + 360) % 360;

/**
 * Each CSS colour function's channels as a colour. Lightness is kept within its range and
 * chroma and saturation at 0 or more, as CSS Color 4 has it at parse time (and Chrome does:
 * `oklch(0.5 -0.1 30)` is a grey, not the opposite hue). `hsl()`, `hwb()`, `lab()`, `lch()`,
 * `oklab()` and `oklch()` are converted as Chromium converts them, so each gives the pixel
 * Chrome draws, not one a step off where a channel lands near a half.
 *
 * @type {Record<string, (c: Token[], alpha: number) => Rgba>}
 */
const FUNCTIONS = {
  rgb: (c, alpha) => fromSrgb(/** @type {Triple} */ (c.map((t) => scaled(t, 255) / 255)), alpha),
  hsl: ([h, s, l], alpha) => drawn(chromiumHsl([turn(h.value), within(scaled(s, 100) / 100), scaled(l, 100) / 100]), alpha),
  hwb: ([h, w, b], alpha) => drawn(chromiumHwb([turn(h.value), scaled(w, 100) / 100, scaled(b, 100) / 100]), alpha),
  lab: ([l, a, b], alpha) => drawn(chromiumLab([within(scaled(l, 100), 100), scaled(a, 125), scaled(b, 125)]), alpha),
  lch: ([l, c, h], alpha) => drawn(chromiumLab(chromiumPolar([within(scaled(l, 100), 100), within(scaled(c, 150)), h.value])), alpha),
  oklab: ([l, a, b], alpha) => drawn(chromiumOklab([within(scaled(l, 1), 1), scaled(a, 0.4), scaled(b, 0.4)]), alpha),
  oklch: ([l, c, h], alpha) => drawn(chromiumOklab(chromiumPolar([within(scaled(l, 1), 1), within(scaled(c, 0.4)), h.value])), alpha),
};
FUNCTIONS.rgba = FUNCTIONS.rgb;
FUNCTIONS.hsla = FUNCTIONS.hsl;

/**
 * Whether a function's legacy (comma) arguments are ones browsers take: `rgb()` with numbers or
 * percentages (not both), `hsl()` with percentages for saturation and lightness; nothing newer
 * has a legacy syntax.
 *
 * @param {string} name - The function.
 * @param {Token[]} channels - Its three channels.
 * @returns {boolean} True when it's valid.
 */
function legacyValid(name, channels) {
  if (name === 'rgb' || name === 'rgba') return channels.every((t) => t.unit === '%') || channels.every((t) => t.unit === '');
  if (name === 'hsl' || name === 'hsla') return channels[0].unit !== '%' && channels[1].unit === '%' && channels[2].unit === '%';
  return false;
}

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
  if (!args || (args.legacy && !legacyValid(name, args.channels))) return null;
  return read(args.channels, args.alpha);
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
 * How near a half a channel read back may land and still count as read back. Chrome draws
 * `hsl(215 80% 50%)`'s red (25.499998) as 25 but reports it as 26 (its computed style adds a
 * sliver before rounding), and its cosines and powers come from each system's maths library, so a
 * channel within a thousandth of a half is one Chrome may round either way: such a spelling isn't used.
 */
const HALF_MARGIN = 0.001;

/**
 * Whether CSS reads back as a colour's 8-bit channels, in Chrome: read as Chromium converts it
 * ({@link parseColor}), each channel clear of the half where rounding could go either way.
 *
 * @param {string} css - The CSS written.
 * @param {Rgba} color - The colour it was written from.
 * @returns {boolean} True when it's the same colour on screen.
 */
function readsBack(css, color) {
  const back = parseColor(css);
  return back !== null && (/** @type {const} */ (['r', 'g', 'b'])).every((key) => Math.abs(back[key] - Math.round(Math.max(0, Math.min(255, color[key])))) < 0.5 - HALF_MARGIN);
}

/**
 * An alpha as CSS: two decimals when that reads back as the same 8-bit alpha, else three (as
 * Chrome writes a computed colour's): `0.5` for 128 of 255, `0.506` for 129.
 *
 * @param {number} alpha - Alpha, 0-1.
 * @returns {number} It, rounded.
 */
function alphaOf(alpha) {
  const two = round(alpha, 2);
  return Math.round(two * 255) === Math.round(alpha * 255) ? two : round(alpha, 3);
}

/**
 * Write a colour as CSS.
 *
 * @param {Rgba} color - The colour.
 * @param {ColorFormat} format - How: `hex` (`#1a73e8`, `#1a73e880`), `rgb` (`rgb(26 115 232)`),
 *   `hsl` (`hsl(214.1 81.7% 50.6%)`), `hwb` (`hwb(214.1 10.2% 9%)`), `lab` (`lab(48.77 9.69 -67.47)`), `lch`
 *   (`lch(48.77 68.16 278.17)`), `oklab` (`oklab(57.37% -0.0409 -0.1902)`), `oklch` (`oklch(57.37%
 *   0.1946 257.86)`): as few places as read back as the same 8-bit colour (`hsl(0 100% 50%)` for red, a
 *   decimal or two for most colours; one more place than shown for the few `oklab`/`oklch` colours that
 *   need it), each checked as Chromium reads it. Modern syntax; alpha after a slash when below 1, to two
 *   decimals, or three when it takes them to read back as the same 8-bit alpha.
 * @returns {string} The CSS.
 *
 * @example
 * formatColor({ r: 255, g: 0, b: 0, a: 1 }, 'hsl');      // 'hsl(0 100% 50%)'
 * formatColor({ r: 26, g: 115, b: 232, a: 0.5 }, 'rgb'); // 'rgb(26 115 232 / 0.5)'
 */
export function formatColor(color, format) {
  const alpha = alphaOf(color.a);
  const slash = alpha < 1 ? ` / ${alpha}` : '';
  /** @type {Triple} */
  const srgb = [color.r / 255, color.g / 255, color.b / 255];
  /**
   * The first of a format's spellings, shortest first, that reads back as the colour (the last
   * when none does): each number of places, a near-grey as a grey (no hue, no chroma) before its
   * real hue and chroma (or a and b).
   *
   * @param {readonly number[]} places - Decimal places, in turn.
   * @param {number} chroma - How colourful the colour is, in the format's terms.
   * @param {number} grey - The chroma below which it may be written as a grey.
   * @param {(places: number, grey: boolean) => string} write - The colour to that many places;
   *   `grey` when its hue and chroma (or a and b) are to be 0.
   * @returns {string} The CSS.
   */
  const shortest = (places, chroma, grey, write) => {
    const spellings = places.flatMap((p) => (chroma < grey ? [write(p, true), write(p, false)] : [write(p, false)]));
    return spellings.find((css) => readsBack(css, color)) ?? spellings[spellings.length - 1];
  };
  /** @param {number} hue @param {number} p @param {boolean} grey @returns {number} */
  const hueOf = (hue, p, grey) => (grey ? 0 : round(hue, p) % 360);
  switch (format) {
    case 'rgb': return `rgb(${round(color.r, 0)} ${round(color.g, 0)} ${round(color.b, 0)}${slash})`;
    case 'hsl': {
      const [h, s, l] = srgbToHsl(srgb);
      return shortest([0, 1, 2, 3], s, 0.005, (p, grey) => `hsl(${hueOf(h, p, grey)} ${round(s * 100, p)}% ${round(l * 100, p)}%${slash})`);
    }
    case 'hwb': {
      const [h, w, b] = srgbToHwb(srgb);
      return shortest([0, 1, 2, 3], 1 - w - b, 0.005, (p, grey) => `hwb(${hueOf(h, p, grey)} ${round(w * 100, p)}% ${round(b * 100, p)}%${slash})`);
    }
    case 'lab': {
      const [l, a, b] = chromiumToLab(srgb);
      return shortest([2, 3, 4], Math.hypot(a, b), 0.05, (p, grey) => `lab(${round(l, p)} ${grey ? 0 : round(a, p)} ${grey ? 0 : round(b, p)}${slash})`);
    }
    case 'lch': {
      const [l, c, h] = toPolar(chromiumToLab(srgb));
      return shortest([2, 3, 4], c, 0.05, (p, grey) => `lch(${round(l, p)} ${grey ? 0 : round(c, p)} ${hueOf(h, p, grey)}${slash})`);
    }
    case 'oklab': {
      const [l, a, b] = chromiumToOklab(srgb);
      return shortest([2, 3, 4], Math.hypot(a, b), 0.0005, (p, grey) => `oklab(${round(l * 100, p)}% ${grey ? 0 : round(a, p + 2)} ${grey ? 0 : round(b, p + 2)}${slash})`);
    }
    case 'oklch': {
      const [l, c, h] = toPolar(chromiumToOklab(srgb));
      return shortest([2, 3, 4], c, 0.0005, (p, grey) => `oklch(${round(l * 100, p)}% ${grey ? 0 : round(c, p + 2)} ${hueOf(h, p, grey)}${slash})`);
    }
    default: return rgbaToHex(color);
  }
}

/** A colour function or keyword inside a longer value: a gradient, a shadow. */
const COLOR_IN_VALUE = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\btransparent\b/gi;

/** What isn't the value's own colours: quoted strings and `url(…)` (an inline SVG's fills, an address's `#fragment`). */
const NOT_COLORS = /\burl\(\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^)]*)\s*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/gi;

/**
 * The colours written in a longer CSS value, in order: a computed gradient's stops, a computed
 * shadow's colours (which browsers write as `rgb()`, `color()`, `oklch()` and the like). What's
 * inside a `url(…)` or a quoted string isn't the value's colour, and is left out.
 *
 * @param {string} value - The value: `linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0) 50%)`.
 * @returns {string[]} Each colour as written, to read with {@link parseColor}.
 *
 * @example
 * cssColorsIn('rgba(0, 0, 0, 0.2) 0px 1px 2px 0px, rgb(26, 115, 232) 0px 0px 0px 2px');
 * // ['rgba(0, 0, 0, 0.2)', 'rgb(26, 115, 232)']
 * cssColorsIn(`url("data:image/svg+xml,<svg fill='rgb(255,0,0)'/>")`); // []
 */
export const cssColorsIn = (value) => value.replace(NOT_COLORS, ' ').match(COLOR_IN_VALUE) ?? [];
