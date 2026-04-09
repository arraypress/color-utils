/**
 * Parse hex color to RGB components.
 */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  };
}

/**
 * Convert RGB to hex string.
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate perceived brightness (0-255) using WCAG formula.
 */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Returns true if the color is light (brightness > threshold).
 */
export function isLight(hex, threshold = 160) {
  return luminance(hex) > threshold;
}

/**
 * Returns true if the color is dark.
 */
export function isDark(hex, threshold = 160) {
  return !isLight(hex, threshold);
}

/**
 * Get the best contrast text color (black or white) for a background.
 */
export function contrastText(hex, lightColor = '#ffffff', darkColor = '#000000') {
  return isLight(hex) ? darkColor : lightColor;
}

/**
 * Lighten a hex color by an amount (0-255).
 */
export function lighten(hex, amount = 20) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

/**
 * Darken a hex color by an amount (0-255).
 */
export function darken(hex, amount = 20) {
  return lighten(hex, -amount);
}

/**
 * Adjust a hex color by a signed amount (positive = lighten, negative = darken).
 */
export function adjust(hex, amount) {
  return lighten(hex, amount);
}

/**
 * Mix two colors by a ratio (0 = first color, 1 = second color).
 */
export function mix(hex1, hex2, ratio = 0.5) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    Math.round(c1.r + (c2.r - c1.r) * ratio),
    Math.round(c1.g + (c2.g - c1.g) * ratio),
    Math.round(c1.b + (c2.b - c1.b) * ratio),
  );
}

/**
 * Add alpha to a hex color, returning rgba() string.
 */
export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
