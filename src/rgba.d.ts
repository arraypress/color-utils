// Colours with alpha, as browsers draw them.

/** A colour in sRGB with alpha: channels 0-255 (fractions allowed), alpha 0-1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Transparent black. */
export const TRANSPARENT: Readonly<Rgba>;

/** A colour laid over another (source-over), as it shows. */
export function blendOver(top: Rgba, bottom: Rgba): Rgba;

/** `#rrggbb`, or `#rrggbbaa` when translucent; channels rounded. */
export function rgbaToHex(color: Rgba): string;

/** A colour in OKLab (L 0-1, a, b); alpha ignored. */
export function rgbaToOklab(color: Rgba): [number, number, number];

/** How different two colours look: their distance in OKLab (about 0.02 is just noticeable). Alpha ignored. */
export function deltaEOK(one: Rgba, other: Rgba): number;
