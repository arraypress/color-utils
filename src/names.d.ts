// Colour names: the nearest CSS named colour, in words.

/** A named colour near another, with its OKLab distance. */
export interface NamedColor {
  /** In words, British spelling (`'Slate Grey'`). */
  name: string;
  /** Lowercase `#rrggbb`. */
  hex: string;
  /** Distance from the colour asked about, in OKLab with a and b doubled (0 is identical). */
  distance: number;
}

/** The CSS named colours as words (aliases dropped), by name. */
export const COLOR_NAMES: Readonly<Record<string, string>>;
/** The named colours nearest a colour, nearest first (default 5). */
export function nearestColorNames(hex: string, count?: number): NamedColor[];
/** The name of the named colour nearest a colour. */
export function colorName(hex: string): string;
