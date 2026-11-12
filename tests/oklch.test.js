import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toOklch, fromOklch, formatOklch, mixOklab, mixOklch,
  scale, scaleStep, SCALE_LIGHTNESS,
  WCAG, wcagLevel, pickReadable,
  relativeLuminance, contrastRatio, hexToRgb,
} from '../src/index.js';

/** Every 17th sRGB colour on each channel: 4,096 colours. */
const sweep = () => {
  const out = [];
  for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17)
    out.push('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
  return out;
};

describe('toOklch / fromOklch', () => {
  it('matches the reference values', () => {
    const { l, c, h } = toOklch('#2563eb');
    assert.equal(l.toFixed(3), '0.546');
    assert.equal(c.toFixed(3), '0.215');
    assert.equal(h.toFixed(1), '262.9');
    assert.deepEqual(toOklch('#ffffff').l.toFixed(4), '1.0000');
    assert.equal(toOklch('#000000').l, 0);
  });

  it('round-trips every colour in a sweep exactly', () => {
    for (const hex of sweep()) assert.equal(fromOklch(toOklch(hex)), hex);
  });

  it('brings an out-of-gamut colour in by chroma, keeping lightness and hue', () => {
    const want = { l: 0.9, c: 0.4, h: 260 };
    const got = toOklch(fromOklch(want));
    assert.ok(Math.abs(got.l - want.l) < 0.01, `lightness ${got.l}`);
    assert.ok(Math.abs(got.h - want.h) < 2, `hue ${got.h}`);
    assert.ok(got.c < want.c && got.c > 0.03, `chroma ${got.c}`);
  });

  it('clamps lightness and accepts negative chroma as grey', () => {
    assert.equal(fromOklch({ l: 2, c: 0, h: 0 }), '#ffffff');
    assert.equal(fromOklch({ l: -1, c: 0, h: 0 }), '#000000');
    assert.equal(fromOklch({ l: 0.5, c: -1, h: 0 }), fromOklch({ l: 0.5, c: 0, h: 0 }));
  });

  it('accepts 3-digit hex and no #', () => {
    assert.deepEqual(toOklch('fff'), toOklch('#ffffff'));
  });
});

describe('formatOklch', () => {
  it('writes a CSS oklch() value', () => {
    assert.equal(formatOklch('#2563eb'), 'oklch(54.6% 0.215 262.9)');
    assert.match(formatOklch('#808080'), /^oklch\(\d+(\.\d)?% 0 0\)$/);
  });
});

describe('mixOklab / mixOklch', () => {
  it('returns the ends at 0 and 1', () => {
    assert.equal(mixOklab('#ff0000', '#0000ff', 0), '#ff0000');
    assert.equal(mixOklab('#ff0000', '#0000ff', 1), '#0000ff');
    assert.equal(mixOklch('#c9502a', '#a9bdf2', 0), '#c9502a');
    assert.equal(mixOklch('#c9502a', '#a9bdf2', 1), '#a9bdf2');
  });

  it('keeps an OKLCH mix of far hues vivid', () => {
    const mid = toOklch(mixOklch('#ff6600', '#0066ff'));
    const flat = toOklch(mixOklab('#ff6600', '#0066ff'));
    assert.ok(mid.c > flat.c * 2, `${mid.c} vs ${flat.c}`);
  });

  it('takes the other colour’s hue when mixing with grey', () => {
    const h = toOklch(mixOklch('#808080', '#2563eb', 0.5)).h;
    assert.ok(Math.abs(h - toOklch('#2563eb').h) < 3);
  });
});

describe('scale', () => {
  const colors = ['#2563eb', '#d4ff3a', '#ff5c3a', '#0f766e', '#1a1a1a', '#7c3aed', '#000000', '#ffffff', '#ffd400'];

  it('has the eleven steps, lightest first', () => {
    assert.deepEqual(Object.keys(scale('#2563eb')), Object.keys(SCALE_LIGHTNESS));
    assert.deepEqual(Object.keys(SCALE_LIGHTNESS), ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']);
  });

  it('darkens step by step for any colour', () => {
    for (const c of colors) {
      const lum = Object.values(scale(c)).map(relativeLuminance);
      for (let i = 1; i < lum.length; i++) assert.ok(lum[i] < lum[i - 1], `${c} step ${i}`);
    }
  });

  it('contains the colour at its nearest step, lowercased', () => {
    assert.equal(scale('#2563EB')[scaleStep('#2563eb')], '#2563eb');
    assert.equal(scaleStep('#2563eb'), '600');
    assert.equal(scaleStep('#ff5c3a'), '400');
    assert.notEqual(scale('#2563eb', { anchor: false })['600'], undefined);
  });

  it('keeps the hue on every chromatic step', () => {
    const hue = toOklch('#2563eb').h;
    for (const hex of Object.values(scale('#2563eb'))) assert.ok(Math.abs(toOklch(hex).h - hue) < 6, hex);
  });

  it('takes its own lightness steps', () => {
    const s = scale('#2563eb', { lightness: { light: 0.9, dark: 0.3 }, anchor: false });
    assert.deepEqual(Object.keys(s), ['light', 'dark']);
    assert.ok(Math.abs(toOklch(s.light).l - 0.9) < 0.01);
  });

  it('is deterministic', () => {
    assert.deepEqual(scale('#7c3aed'), scale('#7c3aed'));
  });
});

describe('wcagLevel / pickReadable', () => {
  it('names the level a ratio clears', () => {
    assert.equal(wcagLevel(21), 'AAA');
    assert.equal(wcagLevel(WCAG.AA), 'AA');
    assert.equal(wcagLevel(3.2), 'AA Large');
    assert.equal(wcagLevel(2.9), 'Fail');
  });

  it('picks the first candidate that clears the ratio', () => {
    const s = scale('#ffd400');
    const pick = pickReadable([s['500'], s['600'], s['700'], s['800']], '#ffffff');
    assert.ok(contrastRatio(pick, '#ffffff') >= 4.5);
    assert.equal(pickReadable(['#000000', '#ffffff'], '#ffffff'), '#000000');
  });

  it('falls back to the most contrast when none clears', () => {
    assert.equal(pickReadable(['#eeeeee', '#999999'], '#ffffff', 21), '#999999');
  });

  it('returns candidates as given', () => {
    assert.equal(pickReadable(['#ABC'], '#000000'), '#ABC');
    assert.deepEqual(hexToRgb('#ABC'), { r: 170, g: 187, b: 204 });
  });
});

describe('mixOklab stays in sRGB by losing chroma', () => {
  it('a mix that falls outside sRGB keeps its hue and lightness (it isn’t clipped channel by channel)', () => {
    // 70% of the way from green to blue in OKLab is oklch(0.576 0.189 240.5), outside sRGB: clipped
    // it was #0081dc, 9° off in hue and lighter.
    const { l, h } = toOklch(mixOklab('#00ff00', '#0000ff', 0.7));
    assert.ok(Math.abs(h - 240.5) < 1.5, `hue ${h}`);
    assert.ok(Math.abs(l - 0.576) < 0.005, `lightness ${l}`);
    assert.equal(mixOklab('#ffffff', '#2563eb', 0), '#ffffff');
    assert.equal(mixOklab('#ffffff', '#2563eb', 1), '#2563eb');
  });
});
