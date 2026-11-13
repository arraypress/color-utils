/**
 * The colours an image is made of: its pixels gathered into the few colours
 * that cover most of it, each with its share, most used first. The pixels are
 * counted in a coarse grid of sRGB, the grid's cells are clustered in OKLab
 * (where distance is how different two colours look), clusters too alike to
 * tell apart are merged, and one too small to count joins its nearest. No
 * randomness: the same pixels always give the same colours.
 *
 * @module dominant
 */

import { linearToOklab, linearToSrgb, oklabToLinear, srgbToLinear } from './spaces.js';

/** @import { Rgba } from './rgba.js' */
/** @typedef {import('./spaces.js').Triple} Triple */

/**
 * A colour of an image, and how much of it.
 *
 * @typedef {Rgba & {share: number}} DominantColor
 *   `share`: the part of the image's (non-transparent) pixels it stands for, 0-1; the shares add up to 1.
 */

/**
 * How {@link dominantColors} looks.
 *
 * @typedef {object} DominantOptions
 * @property {number} [max] The most colours to give. Default 8.
 * @property {number} [distinct] Colours closer than this (ΔE in OKLab) are one colour. Default 0.05:
 *   two colours most people would call the same shade. Colours within 8 steps of each other on
 *   every channel can share a cell of the grid, and then are one colour whatever this is.
 * @property {number} [minShare] A colour covering less of the image than this joins the one nearest
 *   it. Default 0.01.
 * @property {number} [maxSamples] The most pixels looked at; a bigger image is read at even steps
 *   across it. Default 65,536.
 */

/** How many bits of each channel name a cell of the grid the pixels are counted in. */
const CELL_BITS = 5;

/** The most rounds of moving clusters to the middle of their cells. */
const ROUNDS = 24;

/**
 * A weighted point in OKLab: a cell of the grid, or a cluster.
 *
 * @typedef {{lab: Triple, weight: number}} Point
 */

/**
 * The squared distance between two colours in OKLab.
 *
 * @param {Triple} a - One.
 * @param {Triple} b - The other.
 * @returns {number} ΔE².
 */
const distance2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * Two points as one: their weights together, at their weighted middle.
 *
 * @param {Point} a - One.
 * @param {Point} b - The other.
 * @returns {Point} Both.
 */
function joined(a, b) {
  const weight = a.weight + b.weight;
  return { lab: /** @type {Triple} */ (a.lab.map((value, at) => (value * a.weight + b.lab[at] * b.weight) / weight)), weight };
}

/**
 * The pixels as weighted points: counted in a grid of sRGB (each cell at the mean of its pixels,
 * so a flat colour stays exactly itself), a pixel weighing its alpha, a fully transparent one nothing.
 *
 * @param {ArrayLike<number>} data - RGBA bytes, four a pixel.
 * @param {number} maxSamples - The most pixels read.
 * @returns {Point[]} The cells that hold any pixel, in the grid's order.
 */
function cells(data, maxSamples) {
  const pixels = Math.floor(data.length / 4);
  const samples = Math.min(pixels, Math.max(1, Math.floor(maxSamples)));
  /** @type {Map<number, [number, number, number, number]>} */
  const grid = new Map();
  for (let n = 0; n < samples; n++) {
    // Even steps across the whole image, whatever its width.
    const at = Math.floor((n * pixels) / samples) * 4;
    const weight = data[at + 3] / 255;
    if (!(weight > 0)) continue;
    const shift = 8 - CELL_BITS;
    const key = ((data[at] >> shift) << (2 * CELL_BITS)) | ((data[at + 1] >> shift) << CELL_BITS) | (data[at + 2] >> shift);
    const cell = grid.get(key) ?? [0, 0, 0, 0];
    cell[0] += data[at] * weight;
    cell[1] += data[at + 1] * weight;
    cell[2] += data[at + 2] * weight;
    cell[3] += weight;
    grid.set(key, cell);
  }
  return [...grid.entries()].sort(([a], [b]) => a - b).map(([, [r, g, b, weight]]) => ({
    lab: linearToOklab([srgbToLinear(r / weight / 255), srgbToLinear(g / weight / 255), srgbToLinear(b / weight / 255)]),
    weight,
  }));
}

/**
 * The index of the centre nearest a colour (the first, when two are as near).
 *
 * @param {Triple} lab - The colour.
 * @param {Triple[]} centres - The centres.
 * @returns {number} Which.
 */
function nearest(lab, centres) {
  let best = 0;
  let least = Infinity;
  for (let at = 0; at < centres.length; at++) {
    const d = distance2(lab, centres[at]);
    if (d < least) {
      least = d;
      best = at;
    }
  }
  return best;
}

/**
 * Points gathered into at most `count` clusters (k-means in OKLab). The first centre is the
 * heaviest point; each next is the point whose weight times its squared distance from the
 * centres so far is greatest (a colour both common and unlike those chosen), so the start, and
 * with it the answer, is always the same.
 *
 * @param {Point[]} points - The points.
 * @param {number} count - The most clusters.
 * @returns {Point[]} The clusters that hold any point.
 */
function clustered(points, count) {
  /** @type {Triple[]} */
  let centres = [points.reduce((best, point) => (point.weight > best.weight ? point : best)).lab];
  while (centres.length < Math.min(count, points.length)) {
    let far = null;
    let most = 0;
    for (const point of points) {
      const score = point.weight * distance2(point.lab, centres[nearest(point.lab, centres)]);
      if (score > most) {
        most = score;
        far = point;
      }
    }
    if (!far) break;
    centres.push(far.lab);
  }
  /** @type {(Point | null)[]} */
  let clusters = [];
  for (let round = 0; round < ROUNDS; round++) {
    clusters = centres.map(() => null);
    for (const point of points) {
      const at = nearest(point.lab, centres);
      const cluster = clusters[at];
      clusters[at] = cluster ? joined(cluster, point) : point;
    }
    const next = clusters.map((cluster, at) => cluster?.lab ?? centres[at]);
    const settled = next.every((lab, at) => distance2(lab, centres[at]) < 1e-12);
    centres = next;
    if (settled) break;
  }
  return /** @type {Point[]} */ (clusters.filter(Boolean));
}

/**
 * Clusters with those too alike merged (the closest pair first, until none is closer than
 * `distinct`), then those too small joined to the one nearest them (which keeps its colour).
 *
 * @param {Point[]} clusters - The clusters.
 * @param {number} distinct - ΔE below which two are one.
 * @param {number} minWeight - The least weight a cluster may have.
 * @returns {Point[]} The clusters left.
 */
function settled(clusters, distinct, minWeight) {
  let left = [...clusters];
  for (;;) {
    let pair = null;
    let least = distinct ** 2;
    for (let i = 0; i < left.length; i++) {
      for (let j = i + 1; j < left.length; j++) {
        const d = distance2(left[i].lab, left[j].lab);
        if (d < least) {
          least = d;
          pair = [i, j];
        }
      }
    }
    if (!pair) break;
    const [i, j] = pair;
    left = [...left.slice(0, i), joined(left[i], left[j]), ...left.slice(i + 1, j), ...left.slice(j + 1)];
  }
  const kept = left.filter((cluster) => cluster.weight >= minWeight);
  if (!kept.length) return left.length ? [left.reduce((best, cluster) => (cluster.weight > best.weight ? cluster : best))] : [];
  const small = left.filter((cluster) => cluster.weight < minWeight);
  const centres = kept.map((cluster) => cluster.lab);
  for (const cluster of small) {
    const at = nearest(cluster.lab, centres);
    kept[at] = { lab: kept[at].lab, weight: kept[at].weight + cluster.weight };
  }
  return kept;
}

/**
 * The dominant colours of an image: up to eight colours that look different from one another,
 * each with the share of the image it covers, most used first. Fully transparent pixels aren't
 * counted, and a translucent one counts for its alpha. Deterministic: the same pixels give the
 * same colours.
 *
 * @param {ArrayLike<number>} data - The image's pixels as RGBA bytes, four a pixel, row by row
 *   (`ImageData.data`); not premultiplied.
 * @param {DominantOptions} [options] - How many colours at most, how alike two may be, how small
 *   one may be, and how many pixels are read.
 * @returns {DominantColor[]} The colours, opaque (`a: 1`), 8-bit channels, with their `share`; most
 *   used first. Empty when no pixel is visible.
 *
 * @example
 * const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
 * dominantColors(data);            // [{ r: 242, g: 239, b: 233, a: 1, share: 0.46 }, { r: 31, g: 64, b: 104, a: 1, share: 0.21 }, …]
 * dominantColors(data, { max: 5 }); // at most five
 */
export function dominantColors(data, { max = 8, distinct = 0.05, minShare = 0.01, maxSamples = 65_536 } = {}) {
  const points = cells(data, maxSamples);
  const count = Math.max(1, Math.floor(max));
  if (!points.length) return [];
  const total = points.reduce((sum, point) => sum + point.weight, 0);
  const clusters = settled(clustered(points, count), distinct, total * minShare)
    .sort((a, b) => b.weight - a.weight || a.lab[0] - b.lab[0] || a.lab[1] - b.lab[1] || a.lab[2] - b.lab[2]);
  return clusters.map(({ lab, weight }) => {
    const [r, g, b] = oklabToLinear(lab).map((channel) => Math.round(Math.max(0, Math.min(1, linearToSrgb(channel))) * 255));
    return { r, g, b, a: 1, share: weight / total };
  });
}
