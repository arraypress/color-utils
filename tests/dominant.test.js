import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deltaEOK, dominantColors, rgbaToOklab } from '../src/index.js';

/** @typedef {[number, number, number, number?]} Pixel R, G, B and alpha (255 when left out). */

/**
 * An image of flat blocks: each colour as many pixels as given, one block after another.
 *
 * @param {[Pixel, number][]} blocks - A colour and how many pixels of it.
 * @returns {Uint8ClampedArray} RGBA bytes.
 */
function blocks(blocks) {
  const data = new Uint8ClampedArray(blocks.reduce((sum, [, count]) => sum + count, 0) * 4);
  let at = 0;
  for (const [[r, g, b, a = 255], count] of blocks) {
    for (let n = 0; n < count; n++, at += 4) data.set([r, g, b, a], at);
  }
  return data;
}

/** A repeatable stream of numbers from 0 to 1 (no Math.random: the tests' images are always the same). */
function stream(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** @param {{r: number, g: number, b: number}} colour @returns {string} `r,g,b`. */
const rgb = ({ r, g, b }) => `${r},${g},${b}`;

describe('dominantColors', () => {
  it('flat blocks: each block’s exact colour with its exact share, most used first', () => {
    const found = dominantColors(blocks([[[52, 168, 83], 150], [[26, 115, 232], 500], [[251, 188, 4], 100], [[32, 33, 36], 250]]));
    assert.deepEqual(found.map(rgb), ['26,115,232', '32,33,36', '52,168,83', '251,188,4']);
    assert.deepEqual(found.map((colour) => colour.share), [0.5, 0.25, 0.15, 0.1]);
    assert.ok(found.every((colour) => colour.a === 1));
  });

  it('a one-colour image is that colour, all of it; no pixels, or none visible, is no colours', () => {
    assert.deepEqual(dominantColors(blocks([[[200, 30, 60], 4096]])), [{ r: 200, g: 30, b: 60, a: 1, share: 1 }]);
    assert.deepEqual(dominantColors(new Uint8ClampedArray(0)), []);
    assert.deepEqual(dominantColors(blocks([[[255, 0, 0, 0], 100]])), []);
  });

  it('fully transparent pixels aren’t counted, whatever their colour; a translucent pixel counts for its alpha', () => {
    const found = dominantColors(blocks([[[255, 0, 255, 0], 5000], [[26, 115, 232], 300], [[251, 188, 4, 128], 200]]));
    assert.deepEqual(found.map(rgb), ['26,115,232', '251,188,4']);
    const half = 200 * (128 / 255);
    assert.ok(Math.abs(found[0].share - 300 / (300 + half)) < 1e-12);
    assert.ok(Math.abs(found[1].share - half / (300 + half)) < 1e-12);
  });

  it('colours too alike to tell apart are one colour (between the two, nearer the commoner); distinct ones stay apart', () => {
    const found = dominantColors(blocks([[[26, 115, 232], 600], [[40, 125, 240], 200], [[255, 255, 255], 200]]));
    assert.equal(found.length, 2);
    assert.equal(found[0].share, 0.8);
    assert.ok(deltaEOK(found[0], { r: 26, g: 115, b: 232, a: 1 }) < deltaEOK(found[0], { r: 40, g: 125, b: 240, a: 1 }));
    assert.ok(deltaEOK(found[0], { r: 26, g: 115, b: 232, a: 1 }) < 0.015);
    assert.equal(rgb(found[1]), '255,255,255');
    // The same two blues with nothing merged: both are given.
    assert.deepEqual(dominantColors(blocks([[[26, 115, 232], 600], [[40, 125, 240], 200]]), { distinct: 0 }).map(rgb), ['26,115,232', '40,125,240']);
  });

  it('at most eight (or as many as asked for), however many colours the image has; a speck joins its nearest colour', () => {
    /** @type {[Pixel, number][]} */
    const sixteen = Array.from({ length: 16 }, (_, n) => [[(n % 4) * 85, Math.floor(n / 4) * 85, 128], 100 + n]);
    assert.equal(dominantColors(blocks(sixteen)).length, 8);
    assert.equal(dominantColors(blocks(sixteen), { max: 5 }).length, 5);
    assert.equal(dominantColors(blocks(sixteen), { max: 16, distinct: 0 }).length, 16);
    const shares = dominantColors(blocks(sixteen)).map((colour) => colour.share);
    assert.ok(Math.abs(shares.reduce((sum, share) => sum + share, 0) - 1) < 1e-12, 'the shares add up to 1');
    assert.deepEqual(shares, [...shares].sort((a, b) => b - a), 'most used first');
    // 5 red pixels among 995 (0.5%) are too few to be a colour of the image; they count with the nearest.
    const speck = dominantColors(blocks([[[20, 20, 20], 600], [[240, 240, 240], 395], [[255, 0, 0], 5]]));
    assert.deepEqual(speck.map(rgb), ['20,20,20', '240,240,240']);
    assert.ok(Math.abs(speck.reduce((sum, colour) => sum + colour.share, 0) - 1) < 1e-12);
    assert.equal(dominantColors(blocks([[[20, 20, 20], 600], [[240, 240, 240], 395], [[255, 0, 0], 5]]), { minShare: 0 }).length, 3);
  });

  it('a gradient from black to white: eight greys spread from dark to light, none tinted', () => {
    const data = new Uint8ClampedArray(256 * 16 * 4);
    for (let n = 0; n < 256 * 16; n++) data.set([n % 256, n % 256, n % 256, 255], n * 4);
    const found = dominantColors(data);
    assert.equal(found.length, 8);
    for (const colour of found) assert.ok(colour.r === colour.g && colour.g === colour.b, rgb(colour));
    const lightness = found.map((colour) => rgbaToOklab(colour)[0]).sort((a, b) => a - b);
    assert.ok(lightness[0] < 0.2 && lightness[7] > 0.85, `from dark to light: ${lightness.map((l) => l.toFixed(2))}`);
    for (let at = 1; at < 8; at++) assert.ok(lightness[at] - lightness[at - 1] > 0.05, 'each a visible step from the next');
  });

  it('a photo-like mix: six colours under noise and specks are found, each near its true colour and share', () => {
    /** @type {[[number, number, number], number][]} */
    const truth = [[[214, 198, 172], 0.34], [[58, 92, 64], 0.22], [[24, 38, 66], 0.16], [[176, 74, 48], 0.12], [[238, 238, 232], 0.1], [[120, 150, 190], 0.06]];
    const next = stream(7);
    const size = 40_000;
    const data = new Uint8ClampedArray(size * 4);
    for (let n = 0; n < size; n++) {
      const roll = next();
      let sum = 0;
      const [colour] = truth.find(([, share]) => (sum += share) > roll) ?? truth[0];
      // One pixel in 200 is a random speck; the rest are their colour, give or take 9 a channel.
      const pixel = next() < 0.005 ? [next() * 255, next() * 255, next() * 255] : colour.map((channel) => channel + (next() + next() + next() - 1.5) * 12);
      data.set([...pixel, 255], n * 4);
    }
    const found = dominantColors(data);
    assert.ok(found.length >= 6 && found.length <= 8, `${found.length} colours`);
    for (const [[r, g, b], share] of truth) {
      const match = found.reduce((best, colour) => (deltaEOK(colour, { r, g, b, a: 1 }) < deltaEOK(best, { r, g, b, a: 1 }) ? colour : best));
      assert.ok(deltaEOK(match, { r, g, b, a: 1 }) < 0.03, `${r},${g},${b} found as ${rgb(match)}`);
      assert.ok(Math.abs(match.share - share) < 0.03, `${r},${g},${b}: share ${match.share.toFixed(3)} for ${share}`);
    }
    assert.deepEqual(found.slice(0, 3).map((colour) => truth.findIndex(([[r, g, b]]) => deltaEOK(colour, { r, g, b, a: 1 }) < 0.03)), [0, 1, 2], 'most used first');
  });

  it('the same pixels always give the same colours; a big image is read at even steps and gives what the small one does', () => {
    const next = stream(3);
    const data = Uint8ClampedArray.from({ length: 20_000 * 4 }, (_, at) => (at % 4 === 3 ? 255 : Math.floor(next() * 4) * 80));
    assert.deepEqual(dominantColors(data), dominantColors(data));
    assert.deepEqual(dominantColors(Array.from(data)), dominantColors(data), 'a plain array of bytes is read the same');
    /** @type {[Pixel, number][]} */
    const small = [[[26, 115, 232], 500], [[32, 33, 36], 250], [[52, 168, 83], 150], [[251, 188, 4], 100]];
    const big = dominantColors(blocks(small.map(([colour, count]) => [colour, count * 1000])));
    assert.deepEqual(big.map(rgb), dominantColors(blocks(small)).map(rgb));
    big.forEach((colour, at) => assert.ok(Math.abs(colour.share - [0.5, 0.25, 0.15, 0.1][at]) < 0.001, `share ${colour.share}`));
    assert.deepEqual(dominantColors(blocks(small), { maxSamples: 100 }).map(rgb), ['26,115,232', '32,33,36', '52,168,83', '251,188,4'], 'a hundred pixels are enough for four flat colours');
  });
});
