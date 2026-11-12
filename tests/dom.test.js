import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DARK_CANVAS, LIGHT_CANVAS, canvasColor, computedColor, paintParent, paintedColors } from '../src/index.js';

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

  it('an opacity group over a gradient: each gradient colour seen through the group once, never mixed with another', () => {
    const hero = el({ backgroundImage: 'linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))' });
    const glass = el({ opacity: '0.5' }, hero);
    assert.deepEqual(painted(el({ color: 'rgb(255, 0, 0)' }, glass)).pairs, ['128 0 0 on 0 0 0', '255 128 128 on 255 255 255']);
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
    const icon = { backgroundImage: 'url("arrow.svg")', 'background-repeat': 'no-repeat' };
    assert.equal(painted(el({ ...icon, 'background-size': '12px' })).behind, 'solid', 'a link’s 12px arrow beside its text');
    assert.equal(painted(el({ ...icon, 'background-size': '16px 16px' })).behind, 'solid');
    const drawn = { ...icon, 'background-size': '16px', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><path fill='rgb(255,0,0)'/></svg>")` };
    assert.deepEqual(painted(el({ ...drawn, color: 'rgb(200, 0, 0)' }, el({ backgroundColor: 'rgb(255, 255, 255)' }))), { behind: 'solid', pairs: ['200 0 0 on 255 255 255'] },
      'an inline SVG icon’s fill isn’t a gradient behind the text');
    assert.equal(painted(el({ ...icon, 'background-size': '64px 64px' })).behind, 'image', 'bigger than an icon');
    assert.equal(painted(el({ ...icon, 'background-size': 'auto' })).behind, 'image', 'its own size, unknown');
    assert.equal(painted(el({ ...icon, 'background-size': 'cover' })).behind, 'image');
    assert.equal(painted(el({ backgroundImage: 'url("a.png")', 'background-repeat': 'repeat', 'background-size': '12px' })).behind, 'image', 'tiled, it fills the box');
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

describe('computedColor', () => {
  /**
   * A fake place in a page: what Chrome's `CSS.supports` and computed style say for the colours it
   * knows, and what was put in and taken out of it.
   *
   * @param {Record<string, string>} computes - What each supported value computes to.
   */
  const place = (computes) => {
    /** @type {{style: Map<string, [string, string]>, removed: boolean}[]} */
    const probes = [];
    const parent = /** @type {any} */ ({
      probes,
      append: (/** @type {any} */ probe) => { probes.push(probe); },
      ownerDocument: {
        createElement: () => {
          const probe = { style: Object.assign(new Map(), { setProperty(/** @type {string} */ name, /** @type {string} */ css, /** @type {string} */ priority) { this.set(name, [css, priority]); } }), removed: false, remove() { this.removed = true; } };
          return probe;
        },
        defaultView: {
          CSS: { supports: (/** @type {string} */ _property, /** @type {string} */ css) => css in computes },
          getComputedStyle: (/** @type {any} */ probe) => ({ color: computes[probe.style.get('color')[0]] }),
        },
      },
    });
    return parent;
  };

  it('a colour written outright is read as it is: nothing is put in the page', () => {
    const parent = place({});
    assert.deepEqual(computedColor(' #1a73e8 ', parent), { r: 26, g: 115, b: 232, a: 1 });
    assert.equal(parent.probes.length, 0);
  });

  it('one Chrome has to work out is read from an element put in the place for a moment, over the page’s own rules', () => {
    const parent = place({ 'light-dark(#1f1f1f, #e3e3e3)': 'rgb(227, 227, 227)', AccentColor: 'rgb(0, 117, 255)', 'color-mix(in srgb, red, transparent 80%)': 'color(srgb 1 0 0 / 0.2)' });
    assert.deepEqual(computedColor('light-dark(#1f1f1f, #e3e3e3)', parent), { r: 227, g: 227, b: 227, a: 1 });
    assert.deepEqual(computedColor('AccentColor', parent), { r: 0, g: 117, b: 255, a: 1 });
    assert.deepEqual(computedColor('color-mix(in srgb, red, transparent 80%)', parent), { r: 255, g: 0, b: 0, a: 0.2 });
    assert.equal(parent.probes.length, 3);
    assert.ok(parent.probes.every((/** @type {any} */ probe) => probe.removed && probe.style.get('display').join() === 'none,important' && probe.style.get('color')[1] === 'important'));
  });

  it('null for what isn’t a colour, and for one that depends on the element it’s used on', () => {
    const parent = place({ inherit: 'rgb(1, 2, 3)', 'rgb(from currentcolor r g b)': 'rgb(0, 0, 0)' });
    for (const value of ['', '16px', 'var(--brand)', 'currentColor', 'inherit', 'rgb(from currentcolor r g b)']) assert.equal(computedColor(value, parent), null, value);
    assert.equal(parent.probes.length, 0);
  });
});

describe('paintedColors with styles read another way', () => {
  it('a style with no opacity (\'\' or missing) is opaque, not invisible', () => {
    const page = el({ backgroundColor: 'rgb(255, 255, 255)' });
    assert.deepEqual(painted(el({ opacity: '' }, page)).pairs, ['0 0 0 on 255 255 255']);
    const bare = el({}, page);
    delete bare.computed.opacity;
    assert.deepEqual(painted(bare).pairs, ['0 0 0 on 255 255 255']);
  });
});
