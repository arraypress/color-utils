// The colours an image is made of: its pixels clustered in OKLab.

import type { Rgba } from './rgba.js';

/** A colour of an image and the share (0-1) of its visible pixels it stands for; the shares add up to 1. */
export type DominantColor = Rgba & { share: number };

/** How dominantColors looks. */
export interface DominantOptions {
  /** The most colours to give. Default 8. */
  max?: number;
  /** Colours closer than this (ΔE in OKLab) are one colour. Default 0.05. */
  distinct?: number;
  /** A colour covering less of the image than this joins the one nearest it. Default 0.01. */
  minShare?: number;
  /** The most pixels looked at; a bigger image is read at even steps. Default 65,536. */
  maxSamples?: number;
}

/**
 * The dominant colours of an image's pixels (RGBA bytes, four a pixel, not premultiplied): up to
 * `max` colours that look different from one another, most used first, each with its share.
 * Fully transparent pixels aren't counted; a translucent one counts for its alpha. Deterministic.
 */
export function dominantColors(data: ArrayLike<number>, options?: DominantOptions): DominantColor[];
