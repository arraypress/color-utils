/**
 * Colour spaces: every space CSS Color 4 names, to and from linear sRGB (the
 * hub every conversion goes through), with the matrices and transfer
 * functions the CSS Color 4 specification gives. Channels are plain numbers,
 * unclamped: a colour outside sRGB comes back with channels below 0 or above 1.
 *
 * @module spaces
 */

/** @typedef {[number, number, number]} Triple Three channels. */

/**
 * A 3×3 matrix times a vector.
 *
 * @param {readonly (readonly number[])[]} m - The matrix, row by row.
 * @param {readonly number[]} v - The vector.
 * @returns {Triple} The product.
 */
const multiply = (m, v) => /** @type {Triple} */ (m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]));

/**
 * The sRGB transfer function, gamma-encoded to linear (sign kept, as CSS extends it).
 *
 * @param {number} c - An sRGB channel, 0-1.
 * @returns {number} Linear light.
 */
export const srgbToLinear = (c) => {
  const a = Math.abs(c);
  return a <= 0.04045 ? c / 12.92 : Math.sign(c) * ((a + 0.055) / 1.055) ** 2.4;
};

/**
 * The sRGB transfer function, linear to gamma-encoded (sign kept).
 *
 * @param {number} c - Linear light.
 * @returns {number} An sRGB channel, 0-1 when in gamut.
 */
export const linearToSrgb = (c) => {
  const a = Math.abs(c);
  return a <= 0.0031308 ? 12.92 * c : Math.sign(c) * (1.055 * a ** (1 / 2.4) - 0.055);
};

/** Linear sRGB to CIE XYZ (D65). */
const SRGB_TO_XYZ = [
  [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];
/** CIE XYZ (D65) to linear sRGB. */
const XYZ_TO_SRGB = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
];
/** Bradford chromatic adaptation, D65 to D50. */
const D65_TO_D50 = [
  [1.0479298208405488, 0.022946793341019088, -0.05019222954313557],
  [0.029627815688159344, 0.990434484573249, -0.01707382502938514],
  [-0.009243058152591178, 0.015055144896577895, 0.7518742899580008],
];
/** Bradford chromatic adaptation, D50 to D65. */
const D50_TO_D65 = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];
/** The D50 white point, as XYZ. */
const D50_WHITE = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

/**
 * An RGB space with its own primaries: its transfer function both ways and its linear channels to XYZ.
 *
 * @typedef {object} RgbSpace
 * @property {(c: number) => number} toLinear Gamma-encoded to linear.
 * @property {(c: number) => number} fromLinear Linear to gamma-encoded.
 * @property {number[][]} toXyz Linear channels to XYZ (in `white`).
 * @property {'d65' | 'd50'} white The white point its XYZ is in.
 */

/**
 * A matrix's inverse.
 *
 * @param {number[][]} m - A 3×3 matrix.
 * @returns {number[][]} Its inverse.
 */
function invert(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/** @param {number} c @returns {number} */
const identity = (c) => c;

/**
 * A power-law transfer function (sign kept).
 *
 * @param {number} gamma - The exponent from linear to encoded is its inverse.
 * @returns {{toLinear: (c: number) => number, fromLinear: (c: number) => number}} Both ways.
 */
const power = (gamma) => ({
  toLinear: (c) => Math.sign(c) * Math.abs(c) ** gamma,
  fromLinear: (c) => Math.sign(c) * Math.abs(c) ** (1 / gamma),
});

/** ProPhoto RGB's transfer function: linear below 1/512, else 1.8. */
const PROPHOTO_EDGE = 16 / 512;
/** Rec. 2020's transfer constants. */
const REC2020 = { alpha: 1.09929682680944, beta: 0.018053968510807 };

/**
 * The RGB spaces `color()` accepts, by CSS name (`xyz` is `xyz-d65`).
 *
 * @type {Readonly<Record<string, RgbSpace>>}
 */
export const RGB_SPACES = Object.freeze({
  'srgb': { toLinear: srgbToLinear, fromLinear: linearToSrgb, toXyz: SRGB_TO_XYZ, white: 'd65' },
  'srgb-linear': { toLinear: identity, fromLinear: identity, toXyz: SRGB_TO_XYZ, white: 'd65' },
  'display-p3': {
    toLinear: srgbToLinear, fromLinear: linearToSrgb, white: 'd65',
    toXyz: [[0.4865709486482162, 0.26566769316909306, 0.1982172852343625], [0.2289745640697488, 0.6917385218365064, 0.079286914093745], [0, 0.04511338185890264, 1.043944368900976]],
  },
  'a98-rgb': {
    ...power(563 / 256), white: 'd65',
    toXyz: [[0.5766690429101305, 0.1855582379065463, 0.1882286462349947], [0.29734497525053605, 0.6273635662554661, 0.07529145849399788], [0.02703136138641234, 0.07068885253582723, 0.9913375368376388]],
  },
  'prophoto-rgb': {
    toLinear: (c) => (Math.abs(c) <= PROPHOTO_EDGE ? c / 16 : Math.sign(c) * Math.abs(c) ** 1.8),
    fromLinear: (c) => (Math.abs(c) >= 1 / 512 ? Math.sign(c) * Math.abs(c) ** (1 / 1.8) : 16 * c),
    white: 'd50',
    toXyz: [[0.7977666449006423, 0.13518129740053308, 0.0313477341283922], [0.2880748288194013, 0.711835234241873, 0.00008993693872564], [0, 0, 0.8251046025104602]],
  },
  'rec2020': {
    toLinear: (c) => {
      const a = Math.abs(c);
      return a < REC2020.beta * 4.5 ? c / 4.5 : Math.sign(c) * ((a + REC2020.alpha - 1) / REC2020.alpha) ** (1 / 0.45);
    },
    fromLinear: (c) => {
      const a = Math.abs(c);
      return a > REC2020.beta ? Math.sign(c) * (REC2020.alpha * a ** 0.45 - (REC2020.alpha - 1)) : 4.5 * c;
    },
    white: 'd65',
    toXyz: [[0.6369580483012914, 0.14461690358620832, 0.1688809751641721], [0.2627002120112671, 0.6779980715188708, 0.05930171646986196], [0, 0.028072693049087428, 1.060985057710791]],
  },
  'xyz-d65': { toLinear: identity, fromLinear: identity, toXyz: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], white: 'd65' },
  'xyz-d50': { toLinear: identity, fromLinear: identity, toXyz: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], white: 'd50' },
  'xyz': { toLinear: identity, fromLinear: identity, toXyz: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], white: 'd65' },
});

/** Each space's XYZ-to-linear matrix, worked out once. @type {Map<RgbSpace, number[][]>} */
const inverses = new Map();

/**
 * XYZ in a white point as linear sRGB.
 *
 * @param {Triple} xyz - X, Y, Z.
 * @param {'d65' | 'd50'} white - The white point.
 * @returns {Triple} Linear sRGB.
 */
const xyzToLinear = (xyz, white) => multiply(XYZ_TO_SRGB, white === 'd50' ? multiply(D50_TO_D65, xyz) : xyz);

/**
 * Linear sRGB as XYZ in a white point.
 *
 * @param {Triple} linear - Linear sRGB.
 * @param {'d65' | 'd50'} white - The white point.
 * @returns {Triple} X, Y, Z.
 */
const linearToXyz = (linear, white) => (white === 'd50' ? multiply(D65_TO_D50, multiply(SRGB_TO_XYZ, linear)) : multiply(SRGB_TO_XYZ, linear));

/**
 * An RGB space's channels as linear sRGB.
 *
 * @param {RgbSpace} space - The space (from {@link RGB_SPACES}).
 * @param {Triple} channels - Its channels, 0-1 in gamut.
 * @returns {Triple} Linear sRGB.
 */
export function rgbSpaceToLinear(space, channels) {
  const linear = /** @type {Triple} */ (channels.map(space.toLinear));
  return xyzToLinear(multiply(space.toXyz, linear), space.white);
}

/**
 * Linear sRGB as an RGB space's channels.
 *
 * @param {RgbSpace} space - The space (from {@link RGB_SPACES}).
 * @param {Triple} linear - Linear sRGB.
 * @returns {Triple} The space's channels.
 */
export function linearToRgbSpace(space, linear) {
  if (!inverses.has(space)) inverses.set(space, invert(space.toXyz));
  const own = multiply(/** @type {number[][]} */ (inverses.get(space)), linearToXyz(linear, space.white));
  return /** @type {Triple} */ (own.map(space.fromLinear));
}

/** CIE Lab's constants: ε and κ. */
const LAB = { e: 216 / 24389, k: 24389 / 27 };

/**
 * CIE Lab (D50) as linear sRGB.
 *
 * @param {Triple} lab - L (0-100), a, b.
 * @returns {Triple} Linear sRGB.
 */
export function labToLinear([L, a, b]) {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const x = fx ** 3 > LAB.e ? fx ** 3 : (116 * fx - 16) / LAB.k;
  const y = L > LAB.k * LAB.e ? fy ** 3 : L / LAB.k;
  const z = fz ** 3 > LAB.e ? fz ** 3 : (116 * fz - 16) / LAB.k;
  return xyzToLinear([x * D50_WHITE[0], y * D50_WHITE[1], z * D50_WHITE[2]], 'd50');
}

/**
 * Linear sRGB as CIE Lab (D50).
 *
 * @param {Triple} linear - Linear sRGB.
 * @returns {Triple} L (0-100), a, b.
 */
export function linearToLab(linear) {
  const xyz = linearToXyz(linear, 'd50');
  const [fx, fy, fz] = xyz.map((v, i) => {
    const n = v / D50_WHITE[i];
    return n > LAB.e ? Math.cbrt(n) : (LAB.k * n + 16) / 116;
  });
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Linear sRGB as OKLab (Björn Ottosson's matrices).
 *
 * @param {Triple} linear - Linear sRGB.
 * @returns {Triple} L (0-1), a, b.
 */
export function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * OKLab as linear sRGB.
 *
 * @param {Triple} oklab - L (0-1), a, b.
 * @returns {Triple} Linear sRGB.
 */
export function oklabToLinear([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * Rectangular a, b as polar chroma and hue (degrees, 0-360).
 *
 * @param {Triple} lab - L, a, b.
 * @returns {Triple} L, C, H.
 */
export function toPolar([L, a, b]) {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return [L, Math.hypot(a, b), h < 0 ? h + 360 : h];
}

/**
 * Polar chroma and hue (degrees) as rectangular a, b.
 *
 * @param {Triple} lch - L, C, H.
 * @returns {Triple} L, a, b.
 */
export function fromPolar([L, C, H]) {
  const r = (H * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}

/**
 * HSL as sRGB.
 *
 * @param {Triple} hsl - Hue (degrees), saturation and lightness (0-1).
 * @returns {Triple} sRGB, 0-1.
 */
export function hslToSrgb([h, s, l]) {
  const hue = ((h % 360) + 360) % 360;
  /** @param {number} n */
  const f = (n) => {
    const k = (n + hue / 30) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

/**
 * sRGB as HSL.
 *
 * @param {Triple} rgb - sRGB, 0-1.
 * @returns {Triple} Hue (degrees, 0 when grey), saturation and lightness (0-1).
 */
export function srgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/**
 * HWB as sRGB.
 *
 * @param {Triple} hwb - Hue (degrees), whiteness and blackness (0-1).
 * @returns {Triple} sRGB, 0-1.
 */
export function hwbToSrgb([h, w, b]) {
  if (w + b >= 1) {
    const grey = w / (w + b);
    return [grey, grey, grey];
  }
  return /** @type {Triple} */ (hslToSrgb([h, 1, 0.5]).map((c) => c * (1 - w - b) + w));
}

/**
 * sRGB as HWB.
 *
 * @param {Triple} rgb - sRGB, 0-1.
 * @returns {Triple} Hue (degrees, 0 when grey), whiteness and blackness (0-1).
 */
export function srgbToHwb([r, g, b]) {
  const [h] = srgbToHsl([r, g, b]);
  return [h, Math.min(r, g, b), 1 - Math.max(r, g, b)];
}
