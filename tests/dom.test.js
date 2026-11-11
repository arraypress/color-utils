import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DARK_CANVAS, LIGHT_CANVAS, canvasColor, paintParent, paintedColors } from '../src/index.js';

/**
 * A fake element: its parent, and the computed style properties paintedColors reads (Chrome's
 * defaults for the rest).
 *
 * @param {Record<string, string>} [style] - Computed values by property (`backgroundColor`, `-webkit-text-fill-color`…).
 * @param {any} [parent] - Its parent.
 */
function el(style = {}, parent = null) {
  const computed = {
    backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', opacity: '1', filter: 'none', mixBlendMode: 'normal', display: 'block', color: 'rgb(0, 0, 0)',
    ...style,
    /** @param {string} name */
    getPropertyValue: (name) => style[name] ?? '',
  };
  return /** @type {any} */ ({ computed, parentElement: parent, parentNode: parent, assignedSlot: null, ownerDocument: null });
}

/** paintedColors over fakes, on a white canvas, as 8-bit numbers. */
const painted = (/** @type {any} */ element, canvas = LIGHT_CANVAS) => {
  const { behind, pairs } = paintedColors(element, { style: (/** @type {any} */ each) => each.computed, canvas });
  const bytes = (/** @type {{r: number, g: number, b: number}} */ c) => [c.r, c.g, c.b].map(Math.round).join(' ');
  return { behind, pairs: pairs.map((pair) => `${bytes(pair.text)} on ${bytes(pair.background)}`) };
};

describe('paintedColors', () => {
  it('text on its nearest opaque background', () => {
    const body = el({ backgroundColor: 'rgb(255, 255, 255)' });
    const card = el({ backgroundColor: 'rgb(30, 30, 30)' }, body);
    assert.deepEqual(painted(el({ color: 'rgb(200, 200, 200)' }, card)), { behind: 'solid', pairs: ['200 200 200 on 30 30 30'] });
  });

  it('translucent backgrounds and text are laid on what’s beneath, down to the canvas', () => {
    const veil = el({ backgroundColor: 'rgba(0, 0, 0, 0.5)' });
    assert.deepEqual(painted(el({ color: 'rgba(255, 255, 255, 0.5)' }, veil)).pairs, ['191 191 191 on 128 128 128']);
    assert.deepEqual(painted(el({ color: 'rgb(255, 255, 255)' }), DARK_CANVAS).pairs, ['255 255 255 on 18 18 18'], 'nothing behind: the canvas');
  });

  it('opacity makes a group: the text and its background fade together over what’s beneath', () => {
    const page = el({ backgroundColor: 'rgb(255, 255, 255)' });
    const faded = el({ backgroundColor: 'rgb(0, 0, 0)', opacity: '0.5' }, page);
    // Red text on black, the whole box at 50% over white: the red shows as pink, the black as grey.
    assert.deepEqual(painted(el({ color: 'rgb(255, 0, 0)' }, faded)).pairs, ['255 128 128 on 128 128 128']);
    // The element's own opacity counts too.
    assert.deepEqual(painted(el({ color: 'rgb(0, 0, 0)', opacity: '0.5' }, page)).pairs, ['128 128 128 on 255 255 255']);
  });

  it('a given text colour (a placeholder’s) instead of the element’s own', () => {
    const { pairs } = paintedColors(el({ color: 'rgb(0, 0, 0)' }), { style: (/** @type {any} */ each) => each.computed, canvas: LIGHT_CANVAS, text: { r: 117, g: 117, b: 117, a: 1 } });
    assert.deepEqual(pairs[0].text, { r: 117, g: 117, b: 117, a: 1 });
  });

  it('-webkit-text-fill-color is what’s drawn, when set', () => {
    assert.deepEqual(painted(el({ color: 'rgb(0, 0, 0)', '-webkit-text-fill-color': 'rgb(0, 0, 255)' })).pairs, ['0 0 255 on 255 255 255']);
  });

  it('a gradient behind: one pair per colour, each laid on what’s under the gradient', () => {
    const hero = el({ backgroundColor: 'rgb(255, 255, 255)', backgroundImage: 'linear-gradient(rgb(0, 0, 0), rgba(0, 0, 0, 0.5) 50%, oklch(0.7 0.15 200))' });
    assert.deepEqual(painted(el({ color: 'rgb(255, 255, 255)' }, hero)), {
      behind: 'gradient', pairs: ['255 255 255 on 0 0 0', '255 255 255 on 128 128 128', '255 255 255 on 0 185 195'],
    });
  });

  it('a gradient covered by an opaque box inside is just that box; a fully transparent one is nothing', () => {
    const hero = el({ backgroundImage: 'linear-gradient(rgb(0, 0, 0), rgb(255, 0, 0))' });
    const card = el({ backgroundColor: 'rgb(240, 240, 240)' }, hero);
    assert.deepEqual(painted(el({}, card)), { behind: 'solid', pairs: ['0 0 0 on 240 240 240'] });
    const clear = el({ backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0))' });
    assert.deepEqual(painted(el({}, clear)), { behind: 'solid', pairs: ['0 0 0 on 255 255 255'] });
  });

  it('an image behind can’t be known, unless something opaque inside covers it (and isn’t faded)', () => {
    const photo = el({ backgroundImage: 'url("https://example.com/a.jpg")' });
    assert.deepEqual(painted(el({}, photo)), { behind: 'image', pairs: [] });
    assert.deepEqual(painted(el({ backgroundImage: 'image-set("a.png" 1x)' })), { behind: 'image', pairs: [] });
    const card = el({ backgroundColor: 'rgb(255, 255, 255)' }, photo);
    assert.equal(painted(el({}, card)).behind, 'solid');
    const glass = el({ backgroundColor: 'rgb(255, 255, 255)', opacity: '0.9' }, photo);
    assert.equal(painted(el({}, glass)).behind, 'image', 'the photo shows through a faded card');
    const tint = el({ backgroundColor: 'rgba(255, 255, 255, 0.8)' }, photo);
    assert.equal(painted(el({}, tint)).behind, 'image', 'and through a translucent one');
  });

  it('filters, blend modes and gradient-filled text can’t be known', () => {
    const inverted = el({ filter: 'invert(1)', backgroundColor: 'rgb(255, 255, 255)' });
    assert.equal(painted(el({}, inverted)).behind, 'effect');
    assert.equal(painted(el({ mixBlendMode: 'difference' })).behind, 'effect');
    assert.equal(painted(el({ '-webkit-text-fill-color': 'rgba(0, 0, 0, 0)', 'background-clip': 'text', backgroundImage: 'linear-gradient(red, blue)' })).behind, 'effect');
    assert.equal(painted(el({ '-webkit-background-clip': 'text', '-webkit-text-fill-color': 'rgba(0, 0, 0, 0)' })).behind, 'effect');
    assert.equal(painted(el({ 'background-clip': 'text' })).behind, 'solid', 'clipped to text but drawn in an opaque colour');
  });

  it('display: contents paints no background', () => {
    const wrapper = el({ display: 'contents', backgroundColor: 'rgb(0, 0, 0)', backgroundImage: 'url(x.png)' });
    assert.deepEqual(painted(el({}, wrapper)), { behind: 'solid', pairs: ['0 0 0 on 255 255 255'] });
  });

  it('reads the real computed styles by default', () => {
    const style = el({ color: 'rgb(1, 2, 3)', backgroundColor: 'rgb(4, 5, 6)' }).computed;
    const doc = /** @type {any} */ ({ defaultView: { getComputedStyle: () => style, matchMedia: () => ({ matches: false }) }, documentElement: {}, querySelector: () => null });
    const element = /** @type {any} */ ({ ownerDocument: doc, parentElement: null, parentNode: null, assignedSlot: null });
    assert.deepEqual(paintedColors(element).pairs.map((pair) => pair.background), [{ r: 4, g: 5, b: 6, a: 1 }]);
  });
});

describe('paintParent', () => {
  it('a slot first, then the parent, then a shadow root’s host', () => {
    const host = /** @type {any} */ ({ id: 'host' });
    const slot = /** @type {any} */ ({ id: 'slot' });
    const parent = /** @type {any} */ ({ id: 'parent' });
    assert.equal(paintParent(/** @type {any} */ ({ assignedSlot: slot, parentElement: parent })), slot);
    assert.equal(paintParent(/** @type {any} */ ({ assignedSlot: null, parentElement: parent })), parent);
    assert.equal(paintParent(/** @type {any} */ ({ assignedSlot: null, parentElement: null, parentNode: { host } })), host);
    assert.equal(paintParent(/** @type {any} */ ({ assignedSlot: null, parentElement: null, parentNode: null })), null);
  });
});

describe('canvasColor', () => {
  /** A fake page: its root's colour-scheme, its meta tag, and whether dark is preferred. */
  const page = (/** @type {string} */ scheme, /** @type {string | null} */ meta, prefersDark = false) => /** @type {any} */ ({
    documentElement: {},
    defaultView: { getComputedStyle: () => ({ colorScheme: scheme }), matchMedia: () => ({ matches: prefersDark }) },
    querySelector: () => (meta === null ? null : { getAttribute: () => meta }),
  });
  it('white unless the page opts into dark: only dark, or light and dark when dark is preferred', () => {
    assert.deepEqual(canvasColor(page('normal', null, true)), LIGHT_CANVAS);
    assert.deepEqual(canvasColor(page('dark', null)), DARK_CANVAS);
    assert.deepEqual(canvasColor(page('only dark', null)), DARK_CANVAS);
    assert.deepEqual(canvasColor(page('light dark', null, true)), DARK_CANVAS);
    assert.deepEqual(canvasColor(page('light dark', null, false)), LIGHT_CANVAS);
    assert.deepEqual(canvasColor(page('only light', null, true)), LIGHT_CANVAS);
  });
  it('the meta tag when the root says nothing; the root’s style wins over it', () => {
    assert.deepEqual(canvasColor(page('normal', 'dark')), DARK_CANVAS);
    assert.deepEqual(canvasColor(page('normal', 'Light Dark', true)), DARK_CANVAS);
    assert.deepEqual(canvasColor(page('light', 'dark')), LIGHT_CANVAS);
  });
});
