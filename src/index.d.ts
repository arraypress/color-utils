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

/** Calculate perceived brightness (0-255), the YIQ formula. For WCAG, see relativeLuminance. */
export function luminance(hex: string): number;

/** The WCAG 2 relative luminance of a color (0 black - 1 white). */
export function relativeLuminance(hex: string): number;

/** The WCAG 2 contrast ratio between two colors (1-21). */
export function contrastRatio(a: string, b: string): number;

/** The more readable of two text colors (default white, black) on a background, by WCAG contrast ratio. */
export function readableText(hex: string, lightColor?: string, darkColor?: string): string;

export interface ReadableOnOptions {
  /** Where to shift the color: 'black', 'white' or a hex color. Default: whichever of black/white reads better on the first surface. */
  toward?: 'black' | 'white' | (string & {});
  /** The WCAG contrast ratio to clear. Default `5` (headroom above AA's 4.5). */
  ratio?: number;
}

/**
 * The least-shifted shade of `color` (mixed toward `toward`) that clears `ratio`
 * on every surface; the color itself if it already does. Returns `toward` when
 * no shade can reach the ratio. Always lowercase `#rrggbb`.
 */
export function readableOn(color: string, surfaces: string[], options?: ReadableOnOptions): string;

export interface AccentSurfaces {
  /** The light mode's backgrounds: the page and its tightest surfaces. Empty: white. */
  light?: string[];
  /** The dark mode's backgrounds. Empty: black. */
  dark?: string[];
  /** The WCAG contrast ratio the text shades clear. Default `5`. */
  ratio?: number;
}

export interface DerivedAccent {
  /** The accent fill, normalised. */
  accent: string;
  /** Accent as text in light mode: darkened until it clears the ratio on the light surfaces. */
  accentText: string;
  /** Accent as text in dark mode: lightened until it clears the ratio on the dark surfaces. */
  accentTextDark: string;
  /** Black or white, whichever contrasts more with the accent fill. */
  onAccent: string;
}

/** Derive the light/dark accent text shades and the on-accent text color from one accent. */
export function deriveAccent(accent: string, surfaces?: AccentSurfaces): DerivedAccent;

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

export interface InitialsAvatarOptions {
  /** Background colour (hex or any CSS-color string). Default `'#141414'`. */
  bg?: string;
  /** Initials text colour. Default `'#8a8a8a'`. */
  text?: string;
  /** Accent wash drawn in the top-left corner. Default subtle yellow tint. */
  accent?: string;
  /** SVG `viewBox` size in user units. Default `400`. */
  size?: number;
  /** Override the auto-picked font size (170 for 1–2 chars, 130 for 3+). */
  fontSize?: number;
  /** Override the `aria-label`. Defaults to the initials. */
  label?: string;
}

/**
 * Build an inline `data:image/svg+xml,…` URL for a monogram avatar.
 * Drop into an `<img src=…>` as a placeholder when no artwork is
 * available. Pair with `getInitials()` from `@arraypress/text`.
 *
 * @example
 * const avatar = generateInitialsAvatar('DS');
 * // data:image/svg+xml;utf8,%3Csvg…
 */
export function generateInitialsAvatar(
  initials: string,
  options?: InitialsAvatarOptions
): string;
