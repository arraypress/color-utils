import type { Rgba } from './rgba.js';

// WCAG levels and picking a readable color.

/** WCAG 2's thresholds: body text AA (4.5) and AAA (7), large text or graphics (3). */
export const WCAG: Readonly<{ AA: 4.5; AAA: 7; LARGE: 3 }>;

/** A WCAG level a contrast ratio clears. */
export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

/** The best WCAG level a contrast ratio clears. */
export function wcagLevel(ratio: number): WcagLevel;

/** The first candidate that clears `ratio` (default 4.5) on `ground`; else the one with the most contrast. */
export function pickReadable(candidates: string[], ground: string, ratio?: number): string;

/** Whether text is large for WCAG 2: 24px or more, or 18.67px and bold (700). */
export function isLargeText(size: number, weight: number): boolean;

/** The ratio text needs at a WCAG 2 level: AA 4.5 (large 3), AAA 7 (large 4.5). */
export function requiredRatio(level: 'AA' | 'AAA', large: boolean): number;

/** Text's WCAG 2 ratio (unrounded) and APCA Lc on its background, translucent text laid on it first. */
export function textContrast(text: Rgba, background: Rgba): { ratio: number; apca: number };

/** The nearest colour (OKLCH lightness moved, hue kept) that clears `ratio` (default 4.5) on a background, as `#rrggbb`; null when none does. */
export function nearestReadable(text: string, background: string, ratio?: number): string | null;
