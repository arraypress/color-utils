import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  apcaContrast, blendOver, contrastRatio, deltaEOK, isLargeText, nearestReadable, requiredRatio, rgbaToHex, textContrast, toOklch, TRANSPARENT,
} from '../src/index.js';

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

describe('blendOver', () => {
  it('translucent over opaque, opaque over anything, nothing over nothing', () => {
    assert.deepEqual(blendOver({ r: 0, g: 0, b: 0, a: 0.5 }, WHITE), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
    assert.deepEqual(blendOver({ r: 255, g: 0, b: 0, a: 1 }, WHITE), { r: 255, g: 0, b: 0, a: 1 });
    assert.deepEqual(blendOver(TRANSPARENT, TRANSPARENT), { r: 0, g: 0, b: 0, a: 0 });
  });
  it('translucent over translucent stays translucent, weighted by each alpha', () => {
    const shown = blendOver({ r: 255, g: 0, b: 0, a: 0.5 }, { r: 0, g: 0, b: 255, a: 0.5 });
    assert.equal(shown.a, 0.75);
    assert.equal(Math.round(shown.r), 170);
    assert.equal(Math.round(shown.b), 85);
  });
});

describe('rgbaToHex', () => {
  it('six digits when opaque, eight when not; rounded and clamped', () => {
    assert.equal(rgbaToHex({ r: 127.5, g: 0, b: 255, a: 1 }), '#8000ff');
    assert.equal(rgbaToHex({ r: 0, g: 0, b: 0, a: 0.5 }), '#00000080');
    assert.equal(rgbaToHex({ r: 0, g: 0, b: 0, a: 0 }), '#00000000');
    assert.equal(rgbaToHex({ r: 0, g: 0, b: 0, a: 1.2 }), '#000000');
  });
});

describe('deltaEOK', () => {
  it('0 for the same colour, about 0.003 a step apart in grey, 1 for black to white, alpha ignored', () => {
    assert.equal(deltaEOK(WHITE, WHITE), 0);
    const step = deltaEOK({ r: 51, g: 51, b: 51, a: 1 }, { r: 52, g: 52, b: 52, a: 1 });
    assert.ok(step > 0.002 && step < 0.004, String(step));
    assert.ok(Math.abs(deltaEOK(BLACK, WHITE) - 1) < 1e-6);
    assert.equal(deltaEOK({ ...WHITE, a: 0.2 }, WHITE), 0);
  });
  it('counts hue and chroma, not just lightness', () => {
    const red = { r: 200, g: 40, b: 40, a: 1 };
    const sameLightnessGrey = { r: 98, g: 98, b: 98, a: 1 };
    assert.ok(Math.abs(toOklch('#c82828').l - toOklch('#626262').l) < 0.06);
    assert.ok(deltaEOK(red, sameLightnessGrey) > 0.15);
  });
});

describe('apcaContrast', () => {
  it('APCA-W3 0.0.98G-4g’s own reference values', () => {
    assert.equal(apcaContrast('#888888', '#ffffff'), 63.056469930209424);
    assert.equal(apcaContrast('#ffffff', '#888888'), -68.54146436644962);
    assert.equal(apcaContrast('#000000', '#aaaaaa'), 58.146262578561334);
    assert.equal(apcaContrast('#aaaaaa', '#000000'), -56.24113336839742);
  });
  it('0 for the same colour, and for colours too close to tell either way', () => {
    assert.equal(apcaContrast('#777777', '#777777'), 0);
    assert.equal(apcaContrast('#777777', '#7a7a7a'), 0);
    assert.equal(apcaContrast('#7a7a7a', '#777777'), 0);
  });
  it('near-black is soft-clamped: black and #050505 on white differ by little', () => {
    assert.ok(Math.abs(apcaContrast('#000000', '#ffffff') - apcaContrast('#050505', '#ffffff')) < 0.5);
    assert.equal(Math.round(apcaContrast('#000000', '#ffffff') * 10) / 10, 106);
  });
});

describe('isLargeText and requiredRatio', () => {
  it('18pt, or 14pt bold (18.67px)', () => {
    assert.equal(isLargeText(24, 400), true);
    assert.equal(isLargeText(23.9, 700), true);
    assert.equal(isLargeText(23.9, 400), false);
    assert.equal(isLargeText(18.666, 700), true);
    assert.equal(isLargeText(18.6, 700), false);
    assert.equal(isLargeText(20, 600), false);
  });
  it('AA 4.5 and 3; AAA 7 and 4.5', () => {
    assert.deepEqual([requiredRatio('AA', false), requiredRatio('AA', true), requiredRatio('AAA', false), requiredRatio('AAA', true)], [4.5, 3, 7, 4.5]);
  });
});

describe('textContrast', () => {
  it('ratio and Lc of what shows: translucent text laid on its background first, the ratio unrounded', () => {
    assert.deepEqual(textContrast(BLACK, WHITE), { ratio: 21, apca: apcaContrast('#000000', '#ffffff') });
    const half = textContrast({ ...BLACK, a: 0.5 }, WHITE);
    assert.equal(half.ratio, contrastRatio('#808080', '#ffffff'));
    assert.equal(half.apca, apcaContrast('#808080', '#ffffff'));
    assert.ok(textContrast({ r: 119, g: 119, b: 119, a: 1 }, WHITE).ratio < 4.5, '#777 on white is 4.48: fails');
  });
});

describe('nearestReadable', () => {
  it('moves only lightness, the shorter way, and the result clears the ratio', () => {
    const fixed = /** @type {string} */ (nearestReadable('#999999', '#ffffff'));
    assert.equal(fixed, '#767676');
    assert.ok(contrastRatio(fixed, '#ffffff') >= 4.5);
    const blue = /** @type {string} */ (nearestReadable('#1a73e8', '#0b1220', 7));
    assert.ok(contrastRatio(blue, '#0b1220') >= 7);
    assert.ok(toOklch(blue).l > toOklch('#1a73e8').l, 'lighter on a dark ground');
    assert.ok(Math.abs(toOklch(blue).h - toOklch('#1a73e8').h) < 2, 'hue kept');
    assert.ok(contrastRatio(nearestReadable('#5a5a5a', '#6e6e6e', 3) ?? '', '#6e6e6e') >= 3);
  });
  it('the nearer side wins: on a mid grey, a light grey goes lighter and a dark one darker', () => {
    // On #777777 a 3:1 text is at least #d4d4d4-ish or at most #2e2e2e-ish.
    const up = /** @type {string} */ (nearestReadable('#b0b0b0', '#777777', 3));
    assert.ok(toOklch(up).l > toOklch('#b0b0b0').l, up);
    const down = /** @type {string} */ (nearestReadable('#505050', '#777777', 3));
    assert.ok(toOklch(down).l < toOklch('#505050').l, down);
  });
  it('the colour itself when it already reads, normalised; null when nothing can', () => {
    assert.equal(nearestReadable('#000', '#fff'), '#000000');
    assert.equal(nearestReadable('#777777', '#777777', 7), null);
  });
});
