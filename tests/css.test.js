import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOR_FORMATS, cssColorsIn, formatColor, parseColor, rgbaToHex, RGB_SPACES, rgbSpaceToLinear, linearToRgbSpace,
  hslToSrgb, srgbToHsl, hwbToSrgb, srgbToHwb, labToLinear, linearToLab, toPolar, fromPolar,
} from '../src/index.js';

/** Round a parsed colour's channels and alpha to 8 bits, as a canvas stores them. */
const bytes = (/** @type {string} */ css) => {
  const c = parseColor(css);
  assert.ok(c, `${css} parses`);
  return [c.r, c.g, c.b].map(Math.round).concat(Math.round(c.a * 255));
};

/**
 * What Chrome 145 draws each colour as on an sRGB canvas (fillStyle, fillRect, getImageData),
 * the reference parseColor matches: every space, out-of-gamut colours clipped, `none` as 0.
 */
const CHROME_DRAWS = [
  ['oklch(0.7 0.15 200)', [0, 185, 195, 255]],
  ['oklab(0.6 -0.1 0.05)', [67, 147, 96, 255]],
  ['lab(50 40 30)', [187, 88, 70, 255]],
  ['lch(70 50 120)', [145, 183, 88, 255]],
  ['color(display-p3 0.2 0.6 0.4)', [0, 156, 97, 255]],
  ['color(srgb-linear 0.2 0.5 0.8)', [124, 188, 231, 255]],
  ['color(a98-rgb 0.5 0.4 0.3)', [137, 102, 74, 255]],
  ['color(prophoto-rgb 0.5 0.4 0.3)', [171, 115, 90, 255]],
  ['color(rec2020 0.3 0.6 0.2)', [0, 170, 42, 255]],
  ['color(xyz-d65 0.3 0.3 0.3)', [162, 145, 143, 255]],
  ['color(xyz 0.3 0.3 0.3)', [162, 145, 143, 255]],
  ['color(xyz-d50 0.2 0.25 0.3)', [78, 147, 165, 255]],
  ['color(display-p3 1 0 0)', [255, 0, 0, 255]],
  ['oklch(0.9 0.4 260)', [0, 192, 255, 255]],
  ['lab(30 -60 -60)', [0, 93, 166, 255]],
  ['oklch(0.5 0 none)', [99, 99, 99, 255]],
  ['hsl(200 50% 40%)', [51, 119, 153, 255]],
  ['hwb(30 20% 10%)', [230, 140, 51, 255]],
];

/**
 * What Chromium 156 draws on an sRGB canvas where CSS Color 4's maths in double precision is a
 * step off (a channel near a half): Chromium works in single precision with its own D50 white
 * and matrices. Found among 40,000 random colours of each function, of which the double-precision
 * maths got 33 (hsl), 304 (hwb), 975 (lab), 1,026 (lch), 910 (oklab) and 978 (oklch) wrong.
 *
 * @type {[string, number[]][]}
 */
const CHROME_DRAWS_NEAR_A_HALF = [
  ['hwb(200 10% 20%)', [26, 145, 204]], ['hsl(215 80% 50%)', [25, 111, 230]], ['hsl(254 100% 50%)', [59, 0, 255]],
  ['hsl(130 60% 50%)', [51, 204, 77]], ['hsl(256 100% 95%)', [236, 230, 255]], ['hsl(110 100% 86%)', [196, 255, 184]], ['hsl(4 25% 24%)', [76, 48, 46]], ['hsl(220 50% 20%)', [26, 42, 77]],
  ['hwb(76 34% 10%)', [191, 230, 87]], ['hwb(130 5% 50%)', [13, 128, 32]], ['hwb(158 64% 16%)', [163, 214, 196]], ['hwb(310 70% 14%)', [219, 179, 213]], ['hwb(310 65% 13%)', [222, 166, 213]],
  ['lab(64.8 53.6 32.2)', [250, 112, 103]], ['lab(75.7 16.5 20.4)', [225, 175, 150]], ['lab(39.9 -32.1 9.7)', [18, 107, 77]], ['lab(83.7 54.4 35)', [255, 164, 146]], ['lab(88 -28.6 -28.6)', [113, 238, 255]],
  ['lch(92.9 65 139)', [149, 255, 148]], ['lch(93.2 30.5 217)', [160, 250, 255]], ['lch(57.6 14.1 44)', [160, 132, 122]], ['lch(6.2 74.3 348)', [87, 0, 42]], ['lch(99.6 70.4 249)', [34, 255, 255]],
  ['oklab(0.8 -0.09 -0.09)', [77, 206, 251]], ['oklab(0.7 0.03 -0.16)', [141, 143, 255]], ['oklab(0.66 0.01 -0.13)', [122, 138, 225]], ['oklab(0.88 -0.16 0.02)', [48, 249, 205]], ['oklab(0.09 0.05 0.15)', [25, 0, 0]],
  ['oklch(0.91 0.21 152)', [83, 255, 152]], ['oklch(0.98 0.02 150)', [239, 253, 241]], ['oklch(0.92 0.01 215)', [221, 230, 233]], ['oklch(0.96 0.11 119)', [233, 253, 168]], ['oklch(0.89 0.01 313)', [221, 217, 224]],
];

/**
 * Colours whose spelling up to 1.7.0 Chromium 156's canvas read back as another colour (33 hsl,
 * 106 hwb, 197 lab, 251 lch, 1,288 oklab and 1,066 oklch of the 140,608 colours on a grid of 5),
 * with what Chrome read that spelling as, and the spelling now, which Chrome reads back exactly
 * (none of 140,608, 636,056 on a grid of 3 or a million random colours differs, in any format).
 *
 * @type {[import('../src/index.js').ColorFormat, number[], string, number[], string][]}
 */
const FORMAT_FIXED = [
  ['hsl', [25, 5, 250], 'hsl(245 96% 50%)', [26, 5, 250], 'hsl(244.9 96.1% 50%)'],
  ['hsl', [60, 25, 230], 'hsl(250 80% 50%)', [59, 25, 230], 'hsl(250.2 80.4% 50%)'],
  ['hsl', [195, 255, 0], 'hsl(74 100% 50%)', [196, 255, 0], 'hsl(74.1 100% 50%)'],
  ['hsl', [250, 5, 25], 'hsl(355 96% 50%)', [250, 5, 26], 'hsl(355.1 96.1% 50%)'],
  ['hsl', [255, 60, 20], 'hsl(10 100% 54%)', [255, 59, 20], 'hsl(10.2 100% 53.9%)'],
  ['hwb', [0, 0, 25], 'hwb(240 0% 90%)', [0, 0, 26], 'hwb(240 0% 90.2%)'],
  ['hwb', [10, 20, 25], 'hwb(200 4% 90%)', [10, 20, 26], 'hwb(200 3.9% 90.2%)'],
  ['hwb', [25, 0, 5], 'hwb(348 0% 90%)', [26, 0, 5], 'hwb(348 0% 90.2%)'],
  ['hwb', [25, 20, 10], 'hwb(40 4% 90%)', [26, 20, 10], 'hwb(40 3.9% 90.2%)'],
  ['hwb', [255, 60, 20], 'hwb(10 8% 0%)', [255, 59, 20], 'hwb(10.2 7.8% 0%)'],
  ['lab', [5, 190, 255], 'lab(71.56 -23.48 -43.98)', [4, 190, 255], 'lab(71.56 -23.46 -43.98)'],
  ['lab', [5, 250, 25], 'lab(86.32 -77.62 77.51)', [4, 250, 25], 'lab(86.32 -77.6 77.51)'],
  ['lab', [10, 230, 55], 'lab(80.19 -71.54 65.53)', [9, 230, 55], 'lab(80.19 -71.52 65.53)'],
  ['lab', [10, 245, 235], 'lab(87.27 -51.13 -9.64)', [9, 245, 235], 'lab(87.27 -51.11 -9.64)'],
  ['lab', [15, 255, 245], 'lab(90.47 -52.52 -10.09)', [14, 255, 245], 'lab(90.47 -52.5 -10.09)'],
  ['lch', [5, 210, 140], 'lch(74.71 61.52 158.95)', [4, 210, 140], 'lch(74.71 61.51 158.94)'],
  ['lch', [5, 250, 15], 'lch(86.3 110.63 134.68)', [4, 250, 15], 'lch(86.3 110.62 134.67)'],
  ['lch', [10, 225, 220], 'lch(80.95 48.26 193.3)', [9, 225, 220], 'lch(80.95 48.24 193.31)'],
  ['lch', [10, 250, 130], 'lch(86.97 82.48 148.74)', [9, 250, 130], 'lch(86.97 82.47 148.73)'],
  ['lch', [15, 255, 250], 'lch(90.59 52.93 193.65)', [14, 255, 250], 'lch(90.59 52.91 193.66)'],
  ['oklab', [5, 140, 100], 'oklab(56.73% -0.1148 0.0319)', [4, 140, 100], 'oklab(56.73% -0.1147 0.032)'],
  ['oklab', [5, 245, 255], 'oklab(88.2% -0.1405 -0.0514)', [4, 245, 255], 'oklab(88.198% -0.14044 -0.05138)'],
  ['oklab', [10, 235, 125], 'oklab(82.418% -0.18924 0.09867)', [9, 235, 125], 'oklab(82.42% -0.1892 0.0987)'],
  ['oklab', [15, 240, 195], 'oklab(85.18% -0.1617 0.0214)', [14, 240, 195], 'oklab(85.18% -0.1616 0.0214)'],
  ['oklab', [255, 240, 0], 'oklab(93.71% -0.0515 0.192)', [255, 240, 1], 'oklab(93.71% -0.0514 0.1921)'],
  ['oklch', [5, 160, 160], 'oklch(63.93% 0.1085 194.78)', [4, 160, 160], 'oklch(63.93% 0.1084 194.78)'],
  ['oklch', [5, 245, 180], 'oklch(86% 0.1796 165.33)', [4, 245, 180], 'oklch(86% 0.1795 165.32)'],
  ['oklch', [10, 230, 175], 'oklch(82.16% 0.1662 167.61)', [9, 230, 175], 'oklch(82.16% 0.1661 167.6)'],
  ['oklch', [15, 230, 75], 'oklch(80.53% 0.2459 145.68)', [14, 230, 75], 'oklch(80.53% 0.2459 145.67)'],
  ['oklch', [250, 240, 5], 'oklch(93.29% 0.199 106.6)', [250, 240, 6], 'oklch(93.29% 0.199 106.59)'],
];

describe('parseColor', () => {
  it('reads every space as Chrome draws it on an sRGB canvas', () => {
    for (const [css, drawn] of CHROME_DRAWS) assert.deepEqual(bytes(/** @type {string} */ (css)), drawn, /** @type {string} */ (css));
  });

  it('gives Chrome’s pixel where a channel lands near a half: Chromium’s own single-precision conversions', () => {
    for (const [css, drawn] of CHROME_DRAWS_NEAR_A_HALF) assert.deepEqual(bytes(css).slice(0, 3), drawn, css);
    assert.deepEqual(bytes('hwb(200 10% 20%)'), [26, 145, 204, 255], 'green is 144.50002 in Chromium, 144.5 exactly on paper');
  });

  it('Chrome’s computed forms: legacy commas, modern slashes, percentages, three decimals of alpha', () => {
    assert.deepEqual(parseColor('rgb(31, 31, 31)'), { r: 31, g: 31, b: 31, a: 1 });
    assert.deepEqual(parseColor('rgba(170, 187, 204, 0.533)'), { r: 170, g: 187, b: 204, a: 0.533 });
    assert.deepEqual(parseColor('rgb(10 20 30 / 25%)'), { r: 10, g: 20, b: 30, a: 0.25 });
    assert.deepEqual(parseColor('rgb(100% 50% 0%)'), { r: 255, g: 127.5, b: 0, a: 1 });
    assert.deepEqual(parseColor('color(srgb 1 0.5 0 / 0.5)'), { r: 255, g: 127.5, b: 0, a: 0.5 });
    assert.deepEqual(bytes('oklch(0.627966 0.257704 29.2346)'), [255, 0, 0, 255], 'Chrome’s relative oklch(from red …)');
    assert.deepEqual(bytes('oklab(0.539974 0.0962086 -0.0928316)'), [140, 83, 162, 255], 'Chrome’s color-mix(in oklab, red, blue)');
    assert.equal(parseColor('oklch(0.7 0.15 200 / 0.5)')?.a, 0.5);
    assert.equal(parseColor('color(display-p3 0.2 0.3 0.4 / 50%)')?.a, 0.5);
    assert.deepEqual(bytes('oklch(70% 0.15 200)'), bytes('oklch(0.7 0.15 200)'), 'lightness as a percentage');
    assert.deepEqual(bytes('oklch(0.7 37.5% 200)'), bytes('oklch(0.7 0.15 200)'), 'chroma as a percentage of 0.4');
    assert.deepEqual(bytes('lab(50% 32% 24%)'), bytes('lab(50 40 30)'), 'a and b as percentages of 125');
    assert.deepEqual(bytes('lch(70 33.333% 120)'), bytes('lch(70 50 120)'), 'chroma as a percentage of 150');
    assert.deepEqual(bytes('oklab(60% -25% 12.5%)'), bytes('oklab(0.6 -0.1 0.05)'), 'a and b as percentages of 0.4');
    assert.deepEqual(bytes('color(display-p3 20% 60% 40%)'), bytes('color(display-p3 0.2 0.6 0.4)'));
    assert.deepEqual(parseColor('rgb(1e2 0 0)'), { r: 100, g: 0, b: 0, a: 1 }, 'exponents');
  });

  it('hues in any angle unit; hsl and hwb in both syntaxes', () => {
    for (const hue of ['200', '200deg', '3.4906585rad', '222.2222grad', '0.5555556turn']) assert.deepEqual(bytes(`hsl(${hue} 50% 40%)`), [51, 119, 153, 255], hue);
    assert.deepEqual(bytes('hsla(200, 50%, 40%, 0.5)'), [51, 119, 153, 128]);
    assert.deepEqual(bytes('hsl(200 50 40)'), [51, 119, 153, 255], 'modern hsl without %');
    assert.deepEqual(bytes('hsl(-160 50% 40%)'), [51, 119, 153, 255], 'a negative hue goes round');
    assert.deepEqual(bytes('hwb(0 60% 60%)'), [128, 128, 128, 255], 'whiteness and blackness past 100% make a grey');
  });

  it('hex in four lengths, named colours with either grey, transparent', () => {
    assert.deepEqual(parseColor('#1A73E8'), { r: 26, g: 115, b: 232, a: 1 });
    assert.deepEqual(parseColor('#abc'), { r: 170, g: 187, b: 204, a: 1 });
    assert.deepEqual(parseColor('#abc8'), { r: 170, g: 187, b: 204, a: 0x88 / 255 });
    assert.deepEqual(parseColor('#1a73e880'), { r: 26, g: 115, b: 232, a: 128 / 255 });
    assert.equal(parseColor('#12345'), null);
    assert.equal(parseColor('#ggg'), null);
    assert.deepEqual(parseColor('RebeccaPurple'), { r: 102, g: 51, b: 153, a: 1 });
    assert.deepEqual(parseColor('darkslategray'), parseColor('darkslategrey'));
    assert.deepEqual(parseColor('lightgoldenrodyellow'), { r: 250, g: 250, b: 210, a: 1 });
    assert.equal(parseColor('lightgoldenrod'), null, 'not a CSS keyword');
    assert.deepEqual(parseColor('aqua'), parseColor('cyan'));
    assert.deepEqual(parseColor('fuchsia'), parseColor('magenta'));
    assert.deepEqual(parseColor(' transparent '), { r: 0, g: 0, b: 0, a: 0 });
  });

  it('nothing for what isn’t an absolute colour, or is malformed', () => {
    for (const text of ['currentcolor', 'Canvas', 'color-mix(in srgb, red, blue)', 'var(--x)', '', 'red blue', 'rgb(1 2)', 'rgb(1 2 3 4)',
      'rgb(1, 2, 3, 4, 5)', 'rgb(1 2 3 / 4 / 5)', 'rgb(a b c)', 'color(unknown 1 0 0)', 'color(srgb, 1, 0, 0)', 'nope(1 2 3)', 'rgb(1 2 3 / x)']) {
      assert.equal(parseColor(text), null, text);
    }
  });

  it('alpha is kept within 0-1', () => {
    assert.equal(parseColor('rgb(0 0 0 / 150%)')?.a, 1);
    assert.equal(parseColor('rgb(0 0 0 / -1)')?.a, 0);
  });
});

describe('formatColor', () => {
  const blue = { r: 26, g: 115, b: 232, a: 1 };
  it('writes every format; Chrome’s own conversions of rgb(26 115 232) agree to the places shown', () => {
    // Chrome: oklch(0.57368 0.194587 257.863), oklab(0.57368 -0.0409133 -0.190237), lab(48.7735 9.69777 -67.4727), lch(48.7735 68.1661 278.179).
    assert.deepEqual(COLOR_FORMATS.map((format) => formatColor(blue, format)), [
      '#1a73e8', 'rgb(26 115 232)', 'hsl(214.1 81.7% 50.6%)', 'hwb(214.1 10.2% 9%)', 'lab(48.77 9.7 -67.47)', 'lch(48.77 68.17 278.18)',
      'oklab(57.37% -0.0409 -0.1902)', 'oklch(57.37% 0.1946 257.86)',
    ]);
  });

  it('a translucent colour keeps its alpha in every format', () => {
    const half = { ...blue, a: 0.5 };
    assert.equal(formatColor(half, 'hex'), '#1a73e880');
    for (const format of COLOR_FORMATS.filter((f) => f !== 'hex')) assert.match(formatColor(half, format), / \/ 0\.5\)$/, format);
    assert.equal(formatColor({ ...blue, a: 0.53 }, 'rgb'), 'rgb(26 115 232 / 0.53)');
  });

  it('alpha in two decimals when that reads back as the same 8-bit alpha, else three: every one of the 256 reads back', () => {
    assert.equal(formatColor({ ...blue, a: 128 / 255 }, 'rgb'), 'rgb(26 115 232 / 0.5)');
    assert.equal(formatColor({ ...blue, a: 129 / 255 }, 'rgb'), 'rgb(26 115 232 / 0.506)', '0.51 would be 130');
    assert.equal(formatColor({ ...blue, a: 0.533 }, 'oklch'), 'oklch(57.37% 0.1946 257.86 / 0.533)', '0.53 would be 135, not 136');
    for (let alpha = 0; alpha < 256; alpha++) {
      for (const format of COLOR_FORMATS) {
        const css = formatColor({ ...blue, a: alpha / 255 }, format);
        assert.equal(Math.round(/** @type {NonNullable<ReturnType<typeof parseColor>>} */ (parseColor(css)).a * 255), alpha, css);
      }
    }
  });

  it('greys have no hue; no -0', () => {
    const grey = { r: 119, g: 119, b: 119, a: 1 };
    assert.equal(formatColor(grey, 'hsl'), 'hsl(0 0% 46.7%)');
    assert.equal(formatColor(grey, 'hwb'), 'hwb(0 46.7% 53.3%)');
    assert.equal(formatColor(grey, 'lch'), 'lch(50.03 0 0)');
    assert.equal(formatColor(grey, 'oklch'), 'oklch(56.93% 0 0)');
    assert.equal(formatColor(grey, 'lab'), 'lab(50.03 0 0)');
    assert.equal(formatColor({ r: 0, g: 0, b: 0, a: 1 }, 'oklab'), 'oklab(0% 0 0)');
  });

  it('what it writes reads back as the same 8-bit colour, in every format', () => {
    let seed = 7;
    const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % 256; };
    const colors = Array.from({ length: 4000 }, () => ({ r: next(), g: next(), b: next(), a: 1 }));
    // Ones whole numbers (hsl, hwb) and four places (oklab, oklch) got wrong, and a near-grey whose hue matters.
    colors.push({ r: 84, g: 232, b: 57, a: 1 }, { r: 8, g: 246, b: 111, a: 1 }, { r: 0, g: 250, b: 19, a: 1 }, { r: 104, g: 105, b: 105, a: 1 }, { r: 158, g: 157, b: 158, a: 1 });
    for (const color of colors) {
      for (const format of COLOR_FORMATS) {
        const css = formatColor(color, format);
        const back = parseColor(css);
        assert.deepEqual(back && [back.r, back.g, back.b].map(Math.round), [color.r, color.g, color.b], `${format} ${color.r},${color.g},${color.b} → ${css}`);
      }
    }
  });

  it('colours whose spelling Chrome read back as another colour are written so that it reads them back (Chromium 156’s canvas)', () => {
    for (const [format, colour, before, chromeReadBefore, now] of FORMAT_FIXED) {
      const [r, g, b] = colour;
      assert.equal(formatColor({ r, g, b, a: 1 }, format), now, `${format} ${colour}`);
      assert.deepEqual(bytes(now).slice(0, 3), colour, `${now} reads back`);
      assert.deepEqual(bytes(before).slice(0, 3), chromeReadBefore, `${before} is the other colour, as in Chrome`);
      assert.equal(formatColor({ r, g, b, a: 0.5 }, format), now.replace(')', ' / 0.5)'), 'the same with alpha');
    }
  });

  it('no channel reads back within a thousandth of a half, where Chrome’s rounding could go either way', () => {
    for (let r = 0; r < 256; r += 15) {
      for (let g = 0; g < 256; g += 15) {
        for (let b = 0; b < 256; b += 15) {
          for (const format of COLOR_FORMATS) {
            const css = formatColor({ r, g, b, a: 1 }, format);
            const back = /** @type {NonNullable<ReturnType<typeof parseColor>>} */ (parseColor(css));
            [back.r - r, back.g - g, back.b - b].forEach((off) => assert.ok(Math.abs(off) < 0.499, `${css} for ${r},${g},${b} is ${off} off`));
          }
        }
      }
    }
    assert.equal(formatColor({ r: 26, g: 111, b: 230, a: 1 }, 'hsl'), 'hsl(215 80.3% 50.2%)', 'hsl(215 80% 50%) is drawn 25,111,230 and reported 26,111,230');
  });

  it('as few places as read back: whole numbers where they do', () => {
    assert.equal(formatColor({ r: 255, g: 0, b: 0, a: 1 }, 'hsl'), 'hsl(0 100% 50%)');
    assert.equal(formatColor({ r: 255, g: 255, b: 255, a: 1 }, 'hwb'), 'hwb(0 100% 0%)');
    assert.equal(formatColor({ r: 84, g: 232, b: 57, a: 1 }, 'hsl'), 'hsl(110.7 79.2% 56.7%)');
    assert.equal(formatColor({ r: 104, g: 105, b: 105, a: 1 }, 'hsl'), 'hsl(180 0.5% 41%)', 'a near-grey keeps the hue it needs');
  });
});

describe('parseColor reads a colour as Chrome does (each checked in Chromium)', () => {
  /** @param {string} css @returns {number[] | null} */
  const bytes = (css) => {
    const color = parseColor(css);
    return color && [color.r, color.g, color.b].map(Math.round);
  };

  it('chroma and saturation below 0 are 0; lightness is kept in its range', () => {
    assert.deepEqual(bytes('oklch(0.5 -0.1 30)'), [99, 99, 99]);
    assert.deepEqual(bytes('lch(50 -20 0)'), [119, 119, 119]);
    assert.deepEqual(bytes('hsl(0 -50% 50%)'), [128, 128, 128]);
    assert.deepEqual(bytes('hsl(0, -50%, 50%)'), [128, 128, 128]);
    assert.deepEqual(bytes('lab(-10 50 0)'), [57, 0, 3]);
    assert.deepEqual(bytes('oklab(1.2 0.1 0)'), [255, 227, 252]);
    assert.deepEqual(bytes('oklab(-0.2 0.1 0)'), [1, 0, 0]);
    assert.deepEqual(bytes('lch(120 50 20)'), [255, 218, 224]);
    assert.deepEqual(bytes('hsl(0 150% 50%)'), [255, 0, 0]);
    assert.deepEqual(bytes('hwb(0 -20% 0%)'), [255, 0, 0]);
  });

  it('what Chrome calls invalid is null: an empty argument, a number ending in a point, legacy arguments mixed or without their %', () => {
    for (const invalid of ['rgb(0,,0,0)', 'rgb(1. 2 3)', 'rgb(10, 20%, 30)', 'hsl(120, 100, 50)', 'rgb(none, 0, 0)', 'lab(50, 20, 30)', '#12345', '#1234567']) {
      assert.equal(parseColor(invalid), null, invalid);
    }
    assert.deepEqual(bytes('rgb(10 20% 30)'), [10, 51, 30]);
    assert.deepEqual(bytes('hsl(120 100 50)'), [0, 255, 0]);
    assert.deepEqual(bytes('hsl(120deg, 100%, 50%)'), [0, 255, 0]);
    assert.deepEqual(parseColor('rgba(0, 0, 0, 50%)'), { r: 0, g: 0, b: 0, a: 0.5 });
  });
});

describe('colour spaces', () => {
  it('Chrome’s own conversions of rgb(250 200 20) and rgb(10 20 30), every RGB space', () => {
    /** From color-mix(in <space>, <colour> 100%, white) in Chrome 145. */
    const chrome = {
      'rgb(250 200 20)': { 'display-p3': [0.949506, 0.791835, 0.281681], 'srgb-linear': [0.955974, 0.57758, 0.00699541], 'a98-rgb': [0.927928, 0.779149, 0.204629],
        'prophoto-rgb': [0.818765, 0.752006, 0.262632], 'rec2020': [0.889578, 0.772402, 0.238715], 'xyz-d65': [0.60209, 0.616843, 0.0939484], 'xyz-d50': [0.640321, 0.627169, 0.0743682] },
      'rgb(10 20 30)': { 'display-p3': [0.047784, 0.0773748, 0.114247], 'prophoto-rgb': [0.0568869, 0.0623608, 0.0861112], 'rec2020': [0.0214686, 0.0305511, 0.0553108] },
    };
    for (const [css, spaces] of Object.entries(chrome)) {
      const c = /** @type {NonNullable<ReturnType<typeof parseColor>>} */ (parseColor(css));
      const linear = rgbSpaceToLinear(RGB_SPACES.srgb, [c.r / 255, c.g / 255, c.b / 255]);
      for (const [space, want] of Object.entries(spaces)) {
        linearToRgbSpace(RGB_SPACES[space], linear).forEach((got, i) => assert.ok(Math.abs(got - want[i]) < 2e-4, `${css} in ${space}: ${got} vs ${want[i]}`));
      }
    }
  });

  it('round trips: every RGB space, Lab, LCH, HSL and HWB', () => {
    /** @type {[number, number, number]} */
    const linear = [0.2, 0.5, 0.8];
    for (const space of Object.values(RGB_SPACES)) {
      rgbSpaceToLinear(space, linearToRgbSpace(space, linear)).forEach((v, i) => assert.ok(Math.abs(v - linear[i]) < 1e-6));
    }
    labToLinear(fromPolar(toPolar(linearToLab(linear)))).forEach((v, i) => assert.ok(Math.abs(v - linear[i]) < 1e-6));
    for (const rgb of /** @type {[number, number, number][]} */ ([[0.2, 0.5, 0.8], [0.9, 0.1, 0.1], [0.3, 0.9, 0.2], [0.5, 0.5, 0.5]])) {
      hslToSrgb(srgbToHsl(rgb)).forEach((v, i) => assert.ok(Math.abs(v - rgb[i]) < 1e-9));
      hwbToSrgb(srgbToHwb(rgb)).forEach((v, i) => assert.ok(Math.abs(v - rgb[i]) < 1e-9));
    }
    assert.deepEqual(toPolar([0.5, 0, -0.1]).map((v) => Number(v.toFixed(6))), [0.5, 0.1, 270], 'hues below 0 go round');
  });

  it('hex helpers agree', () => {
    assert.equal(rgbaToHex({ r: 26, g: 115, b: 232, a: 1 }), '#1a73e8');
  });
});

describe('cssColorsIn', () => {
  it('a computed gradient’s stops and a shadow’s colours, in order', () => {
    assert.deepEqual(cssColorsIn('linear-gradient(90deg, rgb(0, 0, 0) 0%, color(display-p3 1 0 0 / 0.5) 50%, oklch(0.7 0.15 200)), url("a.png")'),
      ['rgb(0, 0, 0)', 'color(display-p3 1 0 0 / 0.5)', 'oklch(0.7 0.15 200)']);
    assert.deepEqual(cssColorsIn('rgba(0, 0, 0, 0.2) 0px 1px 2px 0px, #1a73e8 0px 0px 0px 2px inset, transparent 0 0'), ['rgba(0, 0, 0, 0.2)', '#1a73e8', 'transparent']);
    assert.deepEqual(cssColorsIn('none'), []);
    assert.deepEqual(cssColorsIn('url("#gradient")'), [], 'a fragment isn’t a hex colour');
    assert.deepEqual(cssColorsIn(`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><path fill='rgb(255,0,0)' stroke='#00f'/></svg>"), linear-gradient(rgb(1, 2, 3), #abc)`),
      ['rgb(1, 2, 3)', '#abc'], 'an inline SVG’s fills aren’t the value’s colours');
    assert.deepEqual(cssColorsIn('url(sprite.svg#fade), url(a.svg#bad)'), [], 'nor an address’s fragment');
    assert.deepEqual(cssColorsIn('#abcde #abcdef0 #abcd'), ['#abcd'], 'only 3, 4, 6 or 8 digits are a colour');
  });
});
