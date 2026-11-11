// CSS colours, read as sRGB (as a browser draws them, clipped) and written in eight formats.

import type { Rgba } from './rgba.js';

/** The ways formatColor writes a colour. */
export const COLOR_FORMATS: readonly ['hex', 'rgb', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch'];

/** One of COLOR_FORMATS. */
export type ColorFormat = typeof COLOR_FORMATS[number];

/**
 * Read any absolute CSS colour (hex, named, transparent, rgb, hsl, hwb, lab, lch, oklab, oklch,
 * color() in every predefined space, `none` channels) as sRGB, clipped as Chrome draws it.
 * Null for anything else (currentcolor, system colours, color-mix() as written).
 */
export function parseColor(text: string): Rgba | null;

/** Write a colour as CSS in a format (modern syntax, alpha after a slash when below 1). */
export function formatColor(color: Rgba, format: ColorFormat): string;

/** The colours written in a longer CSS value (a gradient's stops, a shadow's colours), in order, to read with parseColor. */
export function cssColorsIn(value: string): string[];
