// OKLCH and OKLab: perceptual colour, gamut-mapped by chroma.

/** A color in OKLCH. */
export interface Oklch {
  /** Lightness, 0 (black) to 1 (white). */
  l: number;
  /** Chroma: 0 is grey; sRGB reaches about 0.37. */
  c: number;
  /** Hue in degrees, 0-360. */
  h: number;
}

/** A hex color in OKLCH. */
export function toOklch(hex: string): Oklch;

/** An OKLCH color as lowercase `#rrggbb`, its chroma reduced to the most sRGB can show when it doesn't fit. */
export function fromOklch(lch: Oklch): string;

/** A color as a CSS `oklch()` value, e.g. `oklch(54.6% 0.215 262.9)`. */
export function formatOklch(hex: string): string;

/** Mix two colors in OKLab (0 gives `a`, 1 gives `b`; default 0.5). */
export function mixOklab(a: string, b: string, t?: number): string;

/** Mix two colors in OKLCH, hue the short way round (0 gives `a`, 1 gives `b`; default 0.5). */
export function mixOklch(a: string, b: string, t?: number): string;
