/**
 * CSS colours as Chromium turns them into sRGB: `hsl()`, `hwb()`, `lab()`,
 * `lch()`, `oklab()` and `oklch()`, and sRGB back into `lab()` and `oklab()`,
 * in single precision with Chromium's own
 * constants and order of operations (`ui/gfx/color_conversions.cc`,
 * `skia/ext/skcms_ext.cc` and skcms, read at Chromium 156). CSS Color 4's
 * reference maths in double precision (`spaces.js`) gives the same colour to
 * within a few tenths of an 8-bit step, which is one step off wherever a
 * channel lands near a half: Chromium's D50 white is `0.9642 1 0.8251`, its
 * sRGB matrix is the ICC profile's 16.16 fixed-point one, its Bradford
 * adaptation is worked out in floats, and `hsl(215 80% 50%)`'s red is
 * 25.499998, not 25.5. With these, `parseColor` gives the pixel Chrome draws
 * (checked on 1.8 million random colours in Chromium 156: none differ).
 *
 * @module chromium
 */

/** @typedef {import('./spaces.js').Triple} Triple */
/** @typedef {Triple[]} Matrix A 3×3 matrix, row by row. */

/** To single precision, as every value Chromium holds is. */
const f = Math.fround;

/**
 * A matrix times a vector, each product and sum in single precision (skcms' `mv_mul`).
 *
 * @param {Matrix} m - The matrix.
 * @param {Triple} v - The vector.
 * @returns {Triple} The product.
 */
const apply = (m, v) => /** @type {Triple} */ (m.map((row) => f(f(f(row[0] * v[0]) + f(row[1] * v[1])) + f(row[2] * v[2]))));

/**
 * Two matrices' product in single precision (`skcms_Matrix3x3_concat`).
 *
 * @param {Matrix} a - The left matrix.
 * @param {Matrix} b - The right matrix.
 * @returns {Matrix} `a × b`.
 */
const concat = (a, b) => a.map((row) => /** @type {Triple} */ ([0, 1, 2].map((c) => f(f(f(row[0] * b[0][c]) + f(row[1] * b[1][c])) + f(row[2] * b[2][c])))));

/**
 * A matrix's inverse: worked out in double precision, kept in single (`skcms_Matrix3x3_invert`).
 *
 * @param {Matrix} m - The matrix.
 * @returns {Matrix} Its inverse.
 */
function invert(m) {
  const [[a00, a10, a20], [a01, a11, a21], [a02, a12, a22]] = m;
  const det = [a00 * a11 - a01 * a10, a00 * a12 - a02 * a10, a01 * a12 - a02 * a11];
  const scale = 1 / (det[0] * a22 - det[1] * a21 + det[2] * a20);
  const [b0, b1, b2, b3, b4, b5] = [...det, a20, a21, a22].map((value) => value * scale);
  return [
    [f(a11 * b5 - a12 * b4), f(a12 * b3 - a10 * b5), f(a10 * b4 - a11 * b3)],
    [f(a02 * b4 - a01 * b5), f(a00 * b5 - a02 * b3), f(a01 * b3 - a00 * b4)],
    [f(b2), f(-b1), f(b0)],
  ];
}

/**
 * A matrix's numbers in single precision.
 *
 * @param {number[][]} m - The matrix as written in Chromium's source.
 * @returns {Matrix} It.
 */
const floats = (m) => m.map((row) => /** @type {Triple} */ (row.map(f)));

/** Linear sRGB to XYZ (D50): Skia's `SkNamedGamut::kSRGB`, the sRGB ICC profile's 16.16 fixed-point matrix; and its inverse. */
const SRGB_TO_XYZ_D50 = floats([[0x6FA2, 0x6299, 0x24A0], [0x38F5, 0xB785, 0x0F84], [0x0390, 0x18DA, 0xB6CF]].map((row) => row.map((fixed) => fixed / 65536)));
const XYZ_D50_TO_SRGB = invert(SRGB_TO_XYZ_D50);

/** Skia's `SkNamedTransferFn::kSRGB`: encoded to linear is `(a·x + b)^g` above `d`, `c·x` at or below it. */
const DECODE = { g: f(2.4), a: f(1 / 1.055), b: f(0.055 / 1.055), c: f(1 / 12.92), d: f(0.04045) };

/**
 * The sRGB transfer function, linear to encoded, as Chromium inverts Skia's `SkNamedTransferFn::kSRGB`
 * (`TransferFunction_invert` and `TransferFunction_eval` in `skcms_ext.cc`): `sign · (a·|x| + b)^g + e`
 * above `d`, `sign · c·|x|` at or below it, its seven numbers worked out in single precision.
 */
const ENCODE = (() => {
  const src = DECODE;
  const a = f(src.a ** -src.g);
  const inv = { g: f(1 / src.g), a, b: 0, c: f(1 / src.c), d: f(src.c * src.d), e: f(-src.b / src.a) };
  // What 1 encodes to must be 1: the offset is moved so that it is.
  const one = f(f(f(src.a + src.b) ** src.g));
  inv.e = f(1 - f(f(f(inv.a * one) + inv.b) ** inv.g));
  return inv;
})();

/**
 * Linear light as an sRGB channel (sign kept, unclamped).
 *
 * @param {number} x - Linear light, single precision.
 * @returns {number} The channel, 0-1 in gamut.
 */
function encode(x) {
  const sign = x < 0 ? -1 : 1;
  const size = Math.abs(x);
  if (size <= ENCODE.d) return f(sign * f(ENCODE.c * size));
  return f(sign * f(f(Math.max(f(f(ENCODE.a * size) + ENCODE.b), 0) ** ENCODE.g) + ENCODE.e));
}

/**
 * XYZ (D50) as sRGB (`XYZD50ToSRGB`).
 *
 * @param {Triple} xyz - X, Y, Z.
 * @returns {Triple} sRGB, 0-1 in gamut.
 */
const xyzToSrgb = (xyz) => /** @type {Triple} */ (apply(XYZ_D50_TO_SRGB, xyz).map(encode));

/**
 * sRGB as XYZ (D50) (`SRGBToXYZD50`).
 *
 * @param {Triple} srgb - sRGB, 0-1.
 * @returns {Triple} X, Y, Z.
 */
const srgbToXyz = (srgb) => apply(SRGB_TO_XYZ_D50, /** @type {Triple} */ (srgb.map((c) => {
  const size = Math.abs(f(c));
  return f(Math.sign(c) * (size <= DECODE.d ? f(DECODE.c * size) : f(f(f(DECODE.a * size) + DECODE.b) ** DECODE.g)));
})));

/** Chromium's D50 white for Lab: four places. */
const LAB_WHITE = [f(0.9642), 1, f(0.8251)];

/**
 * `lab()` as sRGB, as Chromium draws it (`LabToXYZD50`, then `XYZD50ToSRGB`).
 *
 * @param {Triple} lab - L (0-100), a, b.
 * @returns {Triple} sRGB, 0-1 in gamut (unclamped, single precision).
 *
 * @example
 * chromiumLab([71.56, -23.48, -43.98]).map((c) => c * 255); // [4.488, 190.007, 255.001]: Chrome's 4, where CSS Color 4's maths gives 4.795
 */
export function chromiumLab([l, a, b]) {
  const y = f(f(f(l) + 16) / 116);
  const x = f(y + f(f(a) / 500));
  const z = f(y - f(f(b) / 200));
  /** @param {number} t @returns {number} */
  const curve = (t) => (t <= f(24 / 116) ? f(f(108 / 841) * f(t - f(16 / 116))) : f(f(t * t) * t));
  return xyzToSrgb([f(curve(x) * LAB_WHITE[0]), f(curve(y) * LAB_WHITE[1]), f(curve(z) * LAB_WHITE[2])]);
}

/**
 * sRGB as `lab()`'s numbers, as Chromium converts it (`SRGBToXYZD50`, then `XYZD50ToLab`): the
 * numbers that {@link chromiumLab} turns back into the colour, which CSS Color 4's (a D50 white
 * to more places, other matrices) don't quite, for a dark channel.
 *
 * @param {Triple} srgb - sRGB, 0-1.
 * @returns {Triple} L (0-100), a, b.
 *
 * @example
 * chromiumToLab([26 / 255, 115 / 255, 232 / 255]); // [48.7735, 9.6978, -67.4727], as Chrome's DevTools show it
 */
export function chromiumToLab(srgb) {
  const [x, y, z] = srgbToXyz(srgb).map((value, at) => {
    const t = f(value / LAB_WHITE[at]);
    return t <= f(f(f(24 / 116) * f(24 / 116)) * f(24 / 116)) ? f(f(f(841 / 108) * t) + f(16 / 116)) : f(Math.cbrt(t));
  });
  return [f(f(116 * y) - 16), f(500 * f(x - y)), f(200 * f(y - z))];
}

/** OKLab to LMS, and LMS to XYZ (D65): Chromium's constants, the second inverted as skcms inverts. */
const OKLAB_TO_LMS = floats([
  [0.99999999845051981432, 0.39633779217376785678, 0.21580375806075880339],
  [1.0000000088817607767, -0.1055613423236563494, -0.063854174771705903402],
  [1.0000000546724109177, -0.089484182094965759684, -1.2914855378640917399],
]);
const XYZ_D65_TO_LMS = floats([
  [0.8190224432164319, 0.3619062562801221, -0.12887378261216414],
  [0.0329836671980271, 0.9292868468965546, 0.03614466816999844],
  [0.048177199566046255, 0.26423952494422764, 0.6335478258136937],
]);
const LMS_TO_XYZ_D65 = invert(XYZ_D65_TO_LMS);

/** XYZ from D65 to D50: Bradford, as `skcms_AdaptToXYZD50(0.3127, 0.3290)` works it out in single precision. */
const D65_TO_D50 = (() => {
  const [wx, wy] = [f(0.3127), f(0.329)];
  /** @type {Triple} */
  const d65 = [f(wx / wy), 1, f(f(f(1 - wx) - wy) / wy)];
  /** @type {Triple} */
  const d50 = [f(0.96422), 1, f(0.82521)];
  const toCone = floats([[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]]);
  const fromCone = floats([[0.9869929, -0.1470543, 0.1599627], [0.4323053, 0.5183603, 0.0492912], [-0.0085287, 0.0400428, 0.9684867]]);
  const [from, to] = [apply(toCone, d65), apply(toCone, d50)];
  return concat(fromCone, concat([[f(to[0] / from[0]), 0, 0], [0, f(to[1] / from[1]), 0], [0, 0, f(to[2] / from[2])]], toCone));
})();

/**
 * `oklab()` as sRGB, as Chromium draws it (`OklabToXYZD50`, then `XYZD50ToSRGB`).
 *
 * @param {Triple} oklab - L (0-1), a, b.
 * @returns {Triple} sRGB, 0-1 in gamut (unclamped, single precision).
 *
 * @example
 * chromiumOklab([0.5673, -0.1148, 0.0319]).map((c) => c * 255); // [4.429, 139.999, 100.028]
 */
export function chromiumOklab([l, a, b]) {
  const lms = apply(OKLAB_TO_LMS, [f(l), f(a), f(b)]);
  const cubed = /** @type {Triple} */ (lms.map((x) => f(f(x * x) * x)));
  return xyzToSrgb(apply(D65_TO_D50, apply(LMS_TO_XYZ_D65, cubed)));
}

/**
 * sRGB as `oklab()`'s numbers, as Chromium converts it (`SRGBToXYZD50`, then `XYZD50ToOklab`): the
 * numbers that {@link chromiumOklab} turns back into the colour.
 *
 * @param {Triple} srgb - sRGB, 0-1.
 * @returns {Triple} L (0-1), a, b.
 *
 * @example
 * chromiumToOklab([26 / 255, 115 / 255, 232 / 255]); // [0.57368, -0.04091, -0.19024]
 */
export function chromiumToOklab(srgb) {
  const lms = apply(XYZ_D65_TO_LMS, apply(invert(D65_TO_D50), srgbToXyz(srgb)));
  return apply(invert(OKLAB_TO_LMS), /** @type {Triple} */ (lms.map((value) => f(Math.cbrt(value)))));
}

/**
 * Lightness, chroma and hue as lightness, a and b, in single precision (`LchToLab`).
 *
 * @param {Triple} lch - L, C, hue (degrees).
 * @returns {Triple} L, a, b.
 */
export function chromiumPolar([l, c, h]) {
  const angle = f(f(h) * f(Math.PI / 180));
  return [f(l), f(f(c) * f(Math.cos(angle))), f(f(c) * f(Math.sin(angle)))];
}

/**
 * `hsl()` as sRGB, as Chromium draws it (`HSLToSRGB`).
 *
 * @param {Triple} hsl - Hue (degrees, 0-360), saturation and lightness (0-1).
 * @returns {Triple} sRGB, 0-1 (single precision).
 *
 * @example
 * chromiumHsl([215, 0.8, 0.5])[0] * 255; // 25.499998…: Chrome draws 25, where double precision's 25.5 rounds to 26
 */
export function chromiumHsl([h, s, l]) {
  const [hue, sat, light] = [f(h), f(s), f(l)];
  if (!sat) return [light, light, light];
  /** @param {number} n @returns {number} */
  const channel = (n) => {
    const k = f(f(n + f(hue / 30)) % 12);
    const a = f(sat * Math.min(light, f(1 - light)));
    return f(light - f(a * Math.max(-1, Math.min(f(k - 3), f(9 - k), 1))));
  };
  return [channel(0), channel(8), channel(4)];
}

/**
 * `hwb()` as sRGB, as Chromium draws it (`HWBToSRGB`).
 *
 * @param {Triple} hwb - Hue (degrees, 0-360), whiteness and blackness (0-1).
 * @returns {Triple} sRGB, 0-1 (single precision).
 *
 * @example
 * chromiumHwb([200, 0.1, 0.2])[1] * 255; // 144.50002…: Chrome draws 145
 */
export function chromiumHwb([h, w, b]) {
  const [white, black] = [f(w), f(b)];
  const both = f(white + black);
  if (both >= 1) {
    const grey = f(white / both);
    return [grey, grey, grey];
  }
  return /** @type {Triple} */ (chromiumHsl([h, 1, 0.5]).map((c) => f(c + f(white - f(both * c)))));
}
