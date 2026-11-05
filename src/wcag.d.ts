// WCAG levels and picking a readable color.

/** WCAG 2's thresholds: body text AA (4.5) and AAA (7), large text or graphics (3). */
export const WCAG: Readonly<{ AA: 4.5; AAA: 7; LARGE: 3 }>;

/** A WCAG level a contrast ratio clears. */
export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

/** The best WCAG level a contrast ratio clears. */
export function wcagLevel(ratio: number): WcagLevel;

/** The first candidate that clears `ratio` (default 4.5) on `ground`; else the one with the most contrast. */
export function pickReadable(candidates: string[], ground: string, ratio?: number): string;
