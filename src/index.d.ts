/**
 * @arraypress/color-utils — TypeScript definitions.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Parse hex color to RGB components. Accepts 3 or 6 digit hex with or without #. */
export function hexToRgb(hex: string): RGB;

/** Convert RGB components to hex string. Values are clamped to 0-255. */
export function rgbToHex(r: number, g: number, b: number): string;

/** Calculate perceived brightness (0-255) using WCAG formula. */
export function luminance(hex: string): number;

/** Returns true if the color is light (brightness > threshold). */
export function isLight(hex: string, threshold?: number): boolean;

/** Returns true if the color is dark. */
export function isDark(hex: string, threshold?: number): boolean;

/** Get the best contrast text color (black or white) for a background. */
export function contrastText(hex: string, lightColor?: string, darkColor?: string): string;

/** Lighten a hex color by an amount (0-255). */
export function lighten(hex: string, amount?: number): string;

/** Darken a hex color by an amount (0-255). */
export function darken(hex: string, amount?: number): string;

/** Adjust a hex color by a signed amount (positive = lighten, negative = darken). */
export function adjust(hex: string, amount: number): string;

/** Mix two colors by a ratio (0 = first color, 1 = second color). */
export function mix(hex1: string, hex2: string, ratio?: number): string;

/** Add alpha to a hex color, returning rgba() string. */
export function withAlpha(hex: string, alpha: number): string;
