// Colour spaces, to and from linear sRGB (CSS Color 4's matrices). Channels unclamped.

/** Three channels. */
export type Triple = [number, number, number];

/** An RGB space with its own primaries. */
export interface RgbSpace {
  /** Gamma-encoded to linear. */
  toLinear(c: number): number;
  /** Linear to gamma-encoded. */
  fromLinear(c: number): number;
  /** Linear channels to XYZ in `white`. */
  toXyz: number[][];
  /** The white point its XYZ is in. */
  white: 'd65' | 'd50';
}

/** The RGB spaces `color()` accepts: srgb, srgb-linear, display-p3, a98-rgb, prophoto-rgb, rec2020, xyz, xyz-d50, xyz-d65. */
export const RGB_SPACES: Readonly<Record<string, RgbSpace>>;

/** The sRGB transfer function, encoded (0-1) to linear. */
export function srgbToLinear(c: number): number;
/** The sRGB transfer function, linear to encoded (0-1). */
export function linearToSrgb(c: number): number;
/** An RGB space's channels as linear sRGB. */
export function rgbSpaceToLinear(space: RgbSpace, channels: Triple): Triple;
/** Linear sRGB as an RGB space's channels. */
export function linearToRgbSpace(space: RgbSpace, linear: Triple): Triple;
/** CIE Lab (D50: L 0-100, a, b) as linear sRGB. */
export function labToLinear(lab: Triple): Triple;
/** Linear sRGB as CIE Lab (D50). */
export function linearToLab(linear: Triple): Triple;
/** Linear sRGB as OKLab (L 0-1, a, b). */
export function linearToOklab(linear: Triple): Triple;
/** OKLab as linear sRGB. */
export function oklabToLinear(oklab: Triple): Triple;
/** L, a, b as L, chroma, hue (degrees 0-360). */
export function toPolar(lab: Triple): Triple;
/** L, chroma, hue (degrees) as L, a, b. */
export function fromPolar(lch: Triple): Triple;
/** HSL (hue degrees, s and l 0-1) as sRGB 0-1. */
export function hslToSrgb(hsl: Triple): Triple;
/** sRGB 0-1 as HSL (hue 0 when grey). */
export function srgbToHsl(rgb: Triple): Triple;
/** HWB (hue degrees, w and b 0-1) as sRGB 0-1. */
export function hwbToSrgb(hwb: Triple): Triple;
/** sRGB 0-1 as HWB (hue 0 when grey). */
export function srgbToHwb(rgb: Triple): Triple;
