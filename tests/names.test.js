import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { colorName, nearestColorNames, COLOR_NAMES } from '../src/index.js';

describe('colorName / nearestColorNames', () => {
  it('names every named colour as itself', () => {
    for (const [name, hex] of Object.entries(COLOR_NAMES)) assert.equal(colorName(hex), name);
  });

  it('names brand colours by the nearest one', () => {
    assert.equal(colorName('#2563eb'), 'Royal Blue');
    assert.equal(colorName('#ff5c3a'), 'Tomato');
    assert.equal(colorName('#0f766e'), 'Teal');
    assert.equal(colorName('#fff'), 'White');
  });

  it('keeps near-neutrals neutral', () => {
    assert.equal(colorName('#121212'), 'Black');
    assert.match(colorName('#808285'), /Grey/);
  });

  it('ranks names nearest first, with British spelling and no aliases', () => {
    const near = nearestColorNames('#6a8ff0', 4);
    assert.equal(near.length, 4);
    assert.equal(near[0].name, 'Cornflower Blue');
    for (let i = 1; i < near.length; i++) assert.ok(near[i].distance >= near[i - 1].distance);
    const names = Object.keys(COLOR_NAMES);
    assert.ok(!names.some((n) => /Gray|\bAqua\b|Fuchsia/.test(n)));
    assert.equal(new Set(Object.values(COLOR_NAMES)).size, names.length);
  });
});
