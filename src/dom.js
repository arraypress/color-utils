/**
 * What colours a page's text really shows in: the text's colour and the
 * backgrounds behind it, read from computed styles up the tree (shadow
 * hosts and slots too) and laid one over another as Chrome paints them,
 * group opacity included, on the page's canvas (white, or Chrome's dark
 * canvas when the page opts into dark). Where the answer can't be known from
 * styles (an image or a filter in the way, gradient-filled text) it says so.
 * Browser only (pass `style` to read styles another way).
 *
 * @module dom
 */

import { cssColorsIn, parseColor } from './css.js';
import { TRANSPARENT, blendOver } from './rgba.js';

/** @import { Rgba } from './rgba.js' */

/** The canvas of a page that hasn't opted into dark: white. */
export const LIGHT_CANVAS = Object.freeze({ r: 255, g: 255, b: 255, a: 1 });

/** Chrome's canvas for a page whose colour scheme is dark (`Canvas` in dark: rgb(18 18 18)). */
export const DARK_CANVAS = Object.freeze({ r: 18, g: 18, b: 18, a: 1 });

/**
 * What's behind text: one solid colour, a gradient's colours, or something styles can't tell
 * (an image, a filter or blend mode, gradient-filled text).
 *
 * @typedef {'solid' | 'gradient' | 'image' | 'effect'} Behind
 */

/**
 * The colours text shows in.
 *
 * @typedef {object} PaintedText
 * @property {Behind} behind What's behind it.
 * @property {{text: Rgba, background: Rgba}[]} pairs The text's colour as it shows and the opaque
 *   background under it: one pair over a solid background, one per colour of a gradient, none
 *   when it can't be known.
 */

/**
 * The style properties read.
 *
 * @typedef {Pick<CSSStyleDeclaration, 'backgroundColor' | 'backgroundImage' | 'opacity' | 'filter' | 'mixBlendMode' | 'display' | 'color' | 'getPropertyValue'>} StyleRead
 */

/**
 * The page's canvas: Chrome's dark one when the root's colour scheme (or the page's
 * `<meta name="color-scheme">`) allows dark and the person prefers it, or allows only dark.
 *
 * @param {Document} doc - The page.
 * @returns {Rgba} The canvas colour.
 *
 * @example
 * canvasColor(document); // { r: 255, g: 255, b: 255, a: 1 }
 */
export function canvasColor(doc) {
  const view = /** @type {Window} */ (doc.defaultView);
  const declared = view.getComputedStyle(doc.documentElement).colorScheme;
  const scheme = declared && declared !== 'normal' ? declared : doc.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ?? '';
  const words = scheme.toLowerCase().split(/\s+/);
  const dark = words.includes('dark') && (!words.includes('light') || view.matchMedia('(prefers-color-scheme: dark)').matches);
  return { ...(dark ? DARK_CANVAS : LIGHT_CANVAS) };
}

/**
 * An element's parent as Chrome paints it: its slot when slotted into an open shadow root, its
 * parent, or its shadow root's host.
 *
 * @param {Element} element - The element.
 * @returns {Element | null} The parent, or null at the root.
 */
export function paintParent(element) {
  if (element.assignedSlot) return element.assignedSlot;
  if (element.parentElement) return element.parentElement;
  const root = /** @type {Node & {host?: Element}} */ (element.parentNode ?? {});
  return root.host ?? null;
}

/**
 * What one element paints under its content.
 *
 * @typedef {object} Layer
 * @property {Rgba} color Its background colour.
 * @property {Rgba[]} stops Its gradients' colours (none without a gradient).
 * @property {boolean} image An image is among its backgrounds.
 * @property {number} opacity Its opacity (a group: everything inside fades together).
 * @property {boolean} effect A filter or blend mode changes what shows.
 */

/**
 * Read what an element paints under its content.
 *
 * @param {StyleRead} style - Its computed style.
 * @returns {Layer} Its layer.
 */
function layerOf(style) {
  const boxless = style.display === 'contents';
  const image = style.backgroundImage ?? 'none';
  const stops = image === 'none' || boxless ? [] : cssColorsIn(image).map((text) => parseColor(text) ?? TRANSPARENT);
  return {
    color: boxless ? TRANSPARENT : parseColor(style.backgroundColor) ?? TRANSPARENT,
    stops: stops.some((stop) => stop.a > 0) ? stops : [],
    image: !boxless && /\b(?:url|image-set|-webkit-image-set|cross-fade|element|paint)\(/.test(image),
    opacity: Number(style.opacity ?? 1),
    effect: (style.filter ?? 'none') !== 'none' || (style.mixBlendMode ?? 'normal') !== 'normal',
  };
}

/** The most background candidates kept (a gradient in a gradient multiplies them). */
const MAX_CANDIDATES = 16;

/**
 * A colour faded by an opacity.
 *
 * @param {Rgba} color - The colour.
 * @param {number} opacity - 0-1.
 * @returns {Rgba} It, its alpha scaled.
 */
const faded = (color, opacity) => ({ ...color, a: color.a * opacity });

/**
 * Candidates without repeats, at most {@link MAX_CANDIDATES}.
 *
 * @template {{background: Rgba}} T
 * @param {T[]} list - The candidates.
 * @returns {T[]} The distinct ones.
 */
function distinct(list) {
  const seen = new Set();
  return list.filter((each) => {
    const { r, g, b, a } = each.background;
    const key = [r, g, b, a].map((v) => Math.round(v * 100)).join();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_CANDIDATES);
}

/**
 * The colours an element's text shows in: its text colour (`-webkit-text-fill-color`, which is
 * `color` unless set) over the backgrounds of it and its ancestors, laid from the canvas up,
 * each element with an opacity below 1 a group that fades as one over what's beneath it.
 *
 * Only ancestors count: something positioned under the text from elsewhere in the page isn't
 * seen. `display: contents` elements paint no background.
 *
 * @param {Element} element - The element whose text it is.
 * @param {object} [options]
 * @param {(element: Element) => StyleRead} [options.style] - Its and its ancestors' computed
 *   styles (default `getComputedStyle`; pass a cached one when reading many elements).
 * @param {Rgba} [options.canvas] - The page's canvas (default {@link canvasColor}).
 * @param {Rgba} [options.text] - The text's colour, when it isn't the element's own (a field's
 *   placeholder: `getComputedStyle(field, '::placeholder')`).
 * @returns {PaintedText} What's behind the text and the colour pairs.
 *
 * @example
 * const { behind, pairs } = paintedColors(paragraph);
 * if (behind === 'solid') textContrast(pairs[0].text, pairs[0].background);
 */
export function paintedColors(element, { style, canvas, text: given } = {}) {
  const doc = element.ownerDocument;
  const read = style ?? ((/** @type {Element} */ each) => /** @type {Window} */ (doc.defaultView).getComputedStyle(each));
  const own = read(element);
  const fill = own.getPropertyValue('-webkit-text-fill-color') || own.color;
  const text = given ?? parseColor(fill) ?? parseColor(own.color) ?? TRANSPARENT;
  /** @type {Layer[]} */
  const chain = [];
  for (let at = /** @type {Element | null} */ (element); at; at = paintParent(at)) chain.push(layerOf(read(at)));
  chain.reverse();
  const clipped = /text/.test(own.getPropertyValue('background-clip') || own.getPropertyValue('-webkit-background-clip'));
  if (chain.some((layer) => layer.effect) || (clipped && text.a < 1)) return { behind: 'effect', pairs: [] };
  // From the text outwards: an image or gradient shows unless something opaque inside covers it
  // (a layer with opacity below 1 lets what's beneath it show through again).
  let covered = false;
  let gradient = false;
  for (const layer of chain.toReversed()) {
    if (!covered && layer.image) return { behind: 'image', pairs: [] };
    if (!covered && layer.stops.length) gradient = true;
    if (layer.color.a >= 1) covered = true;
    if (layer.opacity < 1) covered = false;
  }
  /**
   * The pairs at chain[index] and inside it, given what's beneath it.
   *
   * @param {number} index - The layer.
   * @param {Rgba[]} beneath - What may be under it.
   * @returns {{text: Rgba, background: Rgba}[]} The pairs, as they show over `beneath`.
   */
  const paint = (index, beneath) => {
    const layer = chain[index];
    const grouped = layer.opacity < 1;
    const start = grouped ? [TRANSPARENT] : beneath;
    let local = start.map((under) => blendOver(layer.color, under));
    if (layer.stops.length) local = local.flatMap((under) => layer.stops.map((stop) => blendOver(stop, under)));
    const inside = index === chain.length - 1
      ? local.map((background) => ({ text: blendOver(text, background), background }))
      : paint(index + 1, distinct(local.map((background) => ({ background }))).map((each) => each.background));
    if (!grouped) return distinct(inside);
    return distinct(beneath.flatMap((under) => inside.map((pair) => ({
      text: blendOver(faded(pair.text, layer.opacity), under),
      background: blendOver(faded(pair.background, layer.opacity), under),
    }))));
  };
  return { behind: gradient ? 'gradient' : 'solid', pairs: paint(0, [canvas ?? canvasColor(doc)]) };
}
