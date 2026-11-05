/**
 * Colour names: the nearest of the CSS named colours to any colour, in
 * words (`'Cornflower Blue'`, `'Tomato'`), measured in OKLab so "nearest"
 * is what the eye sees, with hue and chroma counted double: a near-black
 * is Black, not the darkest blue. For palette swatches and alt text.
 *
 * @module names
 */

import { toOklch } from './oklch.js';

/**
 * The CSS named colours as words, British spelling ("Grey"), aliases
 * dropped (aqua is Cyan, fuchsia Magenta).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const COLOR_NAMES = Object.freeze({
  'Alice Blue': '#f0f8ff', 'Antique White': '#faebd7', 'Aquamarine': '#7fffd4', 'Azure': '#f0ffff', 'Beige': '#f5f5dc',
  'Bisque': '#ffe4c4', 'Black': '#000000', 'Blanched Almond': '#ffebcd', 'Blue': '#0000ff', 'Blue Violet': '#8a2be2',
  'Brown': '#a52a2a', 'Burlywood': '#deb887', 'Cadet Blue': '#5f9ea0', 'Chartreuse': '#7fff00', 'Chocolate': '#d2691e',
  'Coral': '#ff7f50', 'Cornflower Blue': '#6495ed', 'Cornsilk': '#fff8dc', 'Crimson': '#dc143c', 'Cyan': '#00ffff',
  'Dark Blue': '#00008b', 'Dark Cyan': '#008b8b', 'Dark Goldenrod': '#b8860b', 'Dark Grey': '#a9a9a9', 'Dark Green': '#006400',
  'Dark Khaki': '#bdb76b', 'Dark Magenta': '#8b008b', 'Dark Olive Green': '#556b2f', 'Dark Orange': '#ff8c00', 'Dark Orchid': '#9932cc',
  'Dark Red': '#8b0000', 'Dark Salmon': '#e9967a', 'Dark Sea Green': '#8fbc8f', 'Dark Slate Blue': '#483d8b', 'Dark Slate Grey': '#2f4f4f',
  'Dark Turquoise': '#00ced1', 'Dark Violet': '#9400d3', 'Deep Pink': '#ff1493', 'Deep Sky Blue': '#00bfff', 'Dim Grey': '#696969',
  'Dodger Blue': '#1e90ff', 'Firebrick': '#b22222', 'Floral White': '#fffaf0', 'Forest Green': '#228b22', 'Gainsboro': '#dcdcdc',
  'Ghost White': '#f8f8ff', 'Gold': '#ffd700', 'Goldenrod': '#daa520', 'Grey': '#808080', 'Green': '#008000',
  'Green Yellow': '#adff2f', 'Honeydew': '#f0fff0', 'Hot Pink': '#ff69b4', 'Indian Red': '#cd5c5c', 'Indigo': '#4b0082',
  'Ivory': '#fffff0', 'Khaki': '#f0e68c', 'Lavender': '#e6e6fa', 'Lavender Blush': '#fff0f5', 'Lawn Green': '#7cfc00',
  'Lemon Chiffon': '#fffacd', 'Light Blue': '#add8e6', 'Light Coral': '#f08080', 'Light Cyan': '#e0ffff', 'Light Goldenrod': '#fafad2',
  'Light Grey': '#d3d3d3', 'Light Green': '#90ee90', 'Light Pink': '#ffb6c1', 'Light Salmon': '#ffa07a', 'Light Sea Green': '#20b2aa',
  'Light Sky Blue': '#87cefa', 'Light Slate Grey': '#778899', 'Light Steel Blue': '#b0c4de', 'Light Yellow': '#ffffe0', 'Lime': '#00ff00',
  'Lime Green': '#32cd32', 'Linen': '#faf0e6', 'Magenta': '#ff00ff', 'Maroon': '#800000', 'Medium Aquamarine': '#66cdaa',
  'Medium Blue': '#0000cd', 'Medium Orchid': '#ba55d3', 'Medium Purple': '#9370db', 'Medium Sea Green': '#3cb371', 'Medium Slate Blue': '#7b68ee',
  'Medium Spring Green': '#00fa9a', 'Medium Turquoise': '#48d1cc', 'Medium Violet Red': '#c71585', 'Midnight Blue': '#191970', 'Mint Cream': '#f5fffa',
  'Misty Rose': '#ffe4e1', 'Moccasin': '#ffe4b5', 'Navajo White': '#ffdead', 'Navy': '#000080', 'Old Lace': '#fdf5e6',
  'Olive': '#808000', 'Olive Drab': '#6b8e23', 'Orange': '#ffa500', 'Orange Red': '#ff4500', 'Orchid': '#da70d6',
  'Pale Goldenrod': '#eee8aa', 'Pale Green': '#98fb98', 'Pale Turquoise': '#afeeee', 'Pale Violet Red': '#db7093', 'Papaya Whip': '#ffefd5',
  'Peach Puff': '#ffdab9', 'Peru': '#cd853f', 'Pink': '#ffc0cb', 'Plum': '#dda0dd', 'Powder Blue': '#b0e0e6',
  'Purple': '#800080', 'Rebecca Purple': '#663399', 'Red': '#ff0000', 'Rosy Brown': '#bc8f8f', 'Royal Blue': '#4169e1',
  'Saddle Brown': '#8b4513', 'Salmon': '#fa8072', 'Sandy Brown': '#f4a460', 'Sea Green': '#2e8b57', 'Seashell': '#fff5ee',
  'Sienna': '#a0522d', 'Silver': '#c0c0c0', 'Sky Blue': '#87ceeb', 'Slate Blue': '#6a5acd', 'Slate Grey': '#708090',
  'Snow': '#fffafa', 'Spring Green': '#00ff7f', 'Steel Blue': '#4682b4', 'Tan': '#d2b48c', 'Teal': '#008080',
  'Thistle': '#d8bfd8', 'Tomato': '#ff6347', 'Turquoise': '#40e0d0', 'Violet': '#ee82ee', 'Wheat': '#f5deb3',
  'White': '#ffffff', 'White Smoke': '#f5f5f5', 'Yellow': '#ffff00', 'Yellow Green': '#9acd32',
});

/** How much more a difference in a and b counts than one in lightness, when naming. */
const CHROMA_WEIGHT = 2;

/**
 * A colour as an OKLab point, a and b weighted for naming.
 *
 * @param {string} hex - Hex colour.
 * @returns {[number, number, number]} L, a, b.
 */
function lab(hex) {
  const { l, c, h } = toOklch(hex);
  const r = (h * Math.PI) / 180;
  return [l, CHROMA_WEIGHT * c * Math.cos(r), CHROMA_WEIGHT * c * Math.sin(r)];
}

/** Every name with its OKLab point, worked out once. */
const POINTS = Object.entries(COLOR_NAMES).map(([name, hex]) => ({ name, hex, at: lab(hex) }));

/**
 * The named colours nearest a colour, nearest first.
 *
 * @param {string} hex - Hex colour (3 or 6 digit, with or without '#').
 * @param {number} [count=5] - How many.
 * @returns {{ name: string, hex: string, distance: number }[]} Each name, its colour and its distance (OKLab, a and b doubled).
 *
 * @example
 * nearestColorNames('#2563eb', 2); // [{ name: 'Royal Blue', … }, …]
 */
export function nearestColorNames(hex, count = 5) {
  const [l, a, b] = lab(hex);
  return POINTS
    .map((p) => ({ name: p.name, hex: p.hex, distance: Math.hypot(p.at[0] - l, p.at[1] - a, p.at[2] - b) }))
    .sort((x, y) => x.distance - y.distance || (x.name < y.name ? -1 : 1))
    .slice(0, Math.max(0, count));
}

/**
 * The name of the named colour nearest a colour.
 *
 * @param {string} hex - Hex colour (3 or 6 digit, with or without '#').
 * @returns {string} The name, in words.
 *
 * @example
 * colorName('#ff5c3a'); // 'Tomato'
 * colorName('#e7e9ff'); // 'Lavender'
 */
export const colorName = (hex) => nearestColorNames(hex, 1)[0].name;
