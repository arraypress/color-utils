/**
 * APCA: the Accessible Perceptual Contrast Algorithm (APCA-W3 0.0.98G-4g, the
 * version the WCAG 3 drafts use), lightness contrast `Lc` from about -108 to
 * 106. Unlike WCAG 2's ratio it depends on which colour is the text: dark on
 * light is positive, light on dark negative. Not a WCAG 2 requirement; for
 * information beside the ratio.
 *
 * @module apca
 */

import { hexToRgb } from './index.js';

/** APCA-W3 0.0.98G-4g's constants. */
const APCA = Object.freeze({
  trc: 2.4, red: 0.2126729, green: 0.7151522, blue: 0.072175,
  normBg: 0.56, normText: 0.57, revText: 0.62, revBg: 0.65,
  blackThreshold: 0.022, blackClamp: 1.414, scale: 1.14, offset: 0.027, minDeltaY: 0.0005, lowClip: 0.1,
});

/**
 * A colour's screen luminance as APCA estimates it (a simple 2.4 power, no linear part).
 *
 * @param {string} hex - Hex colour.
 * @returns {number} Luminance, 0-1.
 */
function screenY(hex) {
  const { r, g, b } = hexToRgb(hex);
  return APCA.red * (r / 255) ** APCA.trc + APCA.green * (g / 255) ** APCA.trc + APCA.blue * (b / 255) ** APCA.trc;
}

/**
 * Soft-clamp near-black luminance (flare).
 *
 * @param {number} y - Luminance.
 * @returns {number} It, lifted near black.
 */
const clampBlack = (y) => (y > APCA.blackThreshold ? y : y + (APCA.blackThreshold - y) ** APCA.blackClamp);

/**
 * The APCA lightness contrast of text on a background.
 *
 * @param {string} text - The text's hex colour (opaque: lay a translucent one on its background first).
 * @param {string} background - The background's hex colour.
 * @returns {number} Lc: positive for dark text on light, negative for light on dark, 0 when too
 *   close to tell. About 75 is body text's preferred minimum, 60 for larger text, 45 for headlines.
 *
 * @example
 * apcaContrast('#888888', '#ffffff'); // ~63.06
 * apcaContrast('#ffffff', '#888888'); // ~-68.54
 */
export function apcaContrast(text, background) {
  const t = clampBlack(screenY(text));
  const b = clampBlack(screenY(background));
  if (Math.abs(b - t) < APCA.minDeltaY) return 0;
  if (b > t) {
    const sapc = (b ** APCA.normBg - t ** APCA.normText) * APCA.scale;
    return sapc < APCA.lowClip ? 0 : (sapc - APCA.offset) * 100;
  }
  const sapc = (b ** APCA.revBg - t ** APCA.revText) * APCA.scale;
  return sapc > -APCA.lowClip ? 0 : (sapc + APCA.offset) * 100;
}
