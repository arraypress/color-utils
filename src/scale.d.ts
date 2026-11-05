// A 50-950 tonal scale in OKLCH.

/** The scale's steps. */
export type ScaleStep = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';

/** Each step's OKLCH lightness (50: 0.975 … 950: 0.22). */
export const SCALE_LIGHTNESS: Readonly<Record<ScaleStep, number>>;

/** Options for {@link scale}. */
export interface ScaleOptions {
  /** Put the color itself at its nearest step, so the scale contains it exactly. Default `true`. */
  anchor?: boolean;
  /** Steps and their lightness. Default {@link SCALE_LIGHTNESS}. */
  lightness?: Readonly<Record<string, number>>;
}

/** A tonal scale from one color: lowercase `#rrggbb` by step, lightest first. */
export function scale(hex: string, options?: ScaleOptions): Record<ScaleStep, string>;

/** The step whose lightness is closest to the color's. */
export function scaleStep(hex: string, lightness?: Readonly<Record<string, number>>): string;
