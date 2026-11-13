// CSS colours as Chromium converts them to sRGB and back: single precision, its own constants.

import type { Triple } from './spaces.js';

/** `lab()` (L 0-100, a, b) as sRGB (0-1 in gamut, unclamped), as Chromium draws it. */
export function chromiumLab(lab: Triple): Triple;
/** sRGB (0-1) as `lab()`'s numbers, as Chromium converts it. */
export function chromiumToLab(srgb: Triple): Triple;
/** `oklab()` (L 0-1, a, b) as sRGB (0-1 in gamut, unclamped), as Chromium draws it. */
export function chromiumOklab(oklab: Triple): Triple;
/** sRGB (0-1) as `oklab()`'s numbers, as Chromium converts it. */
export function chromiumToOklab(srgb: Triple): Triple;
/** L, chroma, hue (degrees) as L, a, b, in single precision. */
export function chromiumPolar(lch: Triple): Triple;
/** `hsl()` (hue 0-360, saturation and lightness 0-1) as sRGB (0-1), as Chromium draws it. */
export function chromiumHsl(hsl: Triple): Triple;
/** `hwb()` (hue 0-360, whiteness and blackness 0-1) as sRGB (0-1), as Chromium draws it. */
export function chromiumHwb(hwb: Triple): Triple;
