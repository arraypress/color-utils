/**
 * Parse a hex color string to its RGB components.
 * Supports both 3-character shorthand (#f00) and 6-character (#ff0000) formats.
 *
 * @param {string} hex - Hex color string (with or without '#' prefix).
 * @returns {{ r: number, g: number, b: number }} RGB components (0-255 each).
 *
 * @example
 * hexToRgb('#ff6600');  // { r: 255, g: 102, b: 0 }
 * hexToRgb('f00');      // { r: 255, g: 0, b: 0 }
 * hexToRgb('#abc');     // { r: 170, g: 187, b: 204 }
 */
export function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  };
}

/**
 * Convert RGB components to a hex color string.
 * Values are clamped to the 0-255 range and rounded.
 *
 * @param {number} r - Red component (0-255).
 * @param {number} g - Green component (0-255).
 * @param {number} b - Blue component (0-255).
 * @returns {string} Hex color string with '#' prefix (e.g. '#ff6600').
 *
 * @example
 * rgbToHex(255, 102, 0);   // '#ff6600'
 * rgbToHex(0, 0, 0);       // '#000000'
 * rgbToHex(300, -10, 128);  // '#ff0080' (clamped)
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate the perceived brightness of a hex color using the WCAG luminance formula.
 * Returns a value between 0 (black) and 255 (white).
 *
 * @param {string} hex - Hex color string (with or without '#' prefix).
 * @returns {number} Perceived brightness (0-255).
 *
 * @example
 * luminance('#ffffff');  // 255
 * luminance('#000000');  // 0
 * luminance('#808080');  // ~128
 */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Check whether a hex color is perceptually light (brightness above threshold).
 *
 * @param {string} hex - Hex color string (with or without '#' prefix).
 * @param {number} [threshold=160] - Brightness threshold (0-255).
 * @returns {boolean} True if the color is light.
 *
 * @example
 * isLight('#ffffff');  // true
 * isLight('#000000');  // false
 * isLight('#999999');  // true (luminance ~153, but depends on threshold)
 */
export function isLight(hex, threshold = 160) {
  return luminance(hex) > threshold;
}

/**
 * Check whether a hex color is perceptually dark (brightness at or below threshold).
 *
 * @param {string} hex - Hex color string (with or without '#' prefix).
 * @param {number} [threshold=160] - Brightness threshold (0-255).
 * @returns {boolean} True if the color is dark.
 *
 * @example
 * isDark('#000000');  // true
 * isDark('#ffffff');  // false
 * isDark('#333333');  // true
 */
export function isDark(hex, threshold = 160) {
  return !isLight(hex, threshold);
}

/**
 * Get the best contrast text color (black or white) for a given background color.
 * Returns the dark color for light backgrounds and the light color for dark backgrounds.
 *
 * @param {string} hex - Background hex color string.
 * @param {string} [lightColor='#ffffff'] - Color to use on dark backgrounds.
 * @param {string} [darkColor='#000000'] - Color to use on light backgrounds.
 * @returns {string} The best contrast text color hex string.
 *
 * @example
 * contrastText('#000000');            // '#ffffff'
 * contrastText('#ffffff');            // '#000000'
 * contrastText('#336699', '#fff', '#111');  // '#fff'
 */
export function contrastText(hex, lightColor = '#ffffff', darkColor = '#000000') {
  return isLight(hex) ? darkColor : lightColor;
}

/**
 * Lighten a hex color by adding a fixed amount to each RGB channel.
 *
 * @param {string} hex - Hex color string to lighten.
 * @param {number} [amount=20] - Amount to add to each channel (0-255).
 * @returns {string} Lightened hex color string.
 *
 * @example
 * lighten('#333333', 20);   // '#474747'
 * lighten('#000000', 100);  // '#646464'
 */
export function lighten(hex, amount = 20) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

/**
 * Darken a hex color by subtracting a fixed amount from each RGB channel.
 *
 * @param {string} hex - Hex color string to darken.
 * @param {number} [amount=20] - Amount to subtract from each channel (0-255).
 * @returns {string} Darkened hex color string.
 *
 * @example
 * darken('#ffffff', 20);   // '#ebebeb'
 * darken('#808080', 50);   // '#4e4e4e'
 */
export function darken(hex, amount = 20) {
  return lighten(hex, -amount);
}

/**
 * Adjust a hex color by a signed amount. Positive values lighten, negative values darken.
 *
 * @param {string} hex - Hex color string to adjust.
 * @param {number} amount - Signed adjustment amount (-255 to 255).
 * @returns {string} Adjusted hex color string.
 *
 * @example
 * adjust('#808080', 30);   // '#9e9e9e' (lighter)
 * adjust('#808080', -30);  // '#626262' (darker)
 */
export function adjust(hex, amount) {
  return lighten(hex, amount);
}

/**
 * Mix two hex colors together by a ratio.
 *
 * @param {string} hex1 - First hex color string.
 * @param {string} hex2 - Second hex color string.
 * @param {number} [ratio=0.5] - Mix ratio (0 = entirely first color, 1 = entirely second color).
 * @returns {string} Blended hex color string.
 *
 * @example
 * mix('#000000', '#ffffff');       // '#808080'
 * mix('#ff0000', '#0000ff', 0.5); // '#800080'
 * mix('#ff0000', '#0000ff', 0);   // '#ff0000'
 * mix('#ff0000', '#0000ff', 1);   // '#0000ff'
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
 * Add an alpha channel to a hex color, returning an rgba() CSS string.
 *
 * @param {string} hex - Hex color string.
 * @param {number} alpha - Alpha value (0 = fully transparent, 1 = fully opaque).
 * @returns {string} CSS rgba() color string.
 *
 * @example
 * withAlpha('#ff0000', 0.5);  // 'rgba(255, 0, 0, 0.5)'
 * withAlpha('#000', 0.8);     // 'rgba(0, 0, 0, 0.8)'
 */
export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Initials avatar ─────────────────────────

/**
 * Tiny XML escaper for the few characters that can break an
 * inline SVG attribute value. Kept local because the avatar
 * generator is the only thing in this library that emits XML.
 */
function _escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build an inline `data:image/svg+xml,…` URL containing a centred
 * monogram on a coloured tile. Drop the result straight into an
 * `<img src=…>` and the browser renders it without any extra
 * network requests. Useful as the "no artwork yet" fallback for
 * product cards, author tiles, testimonial avatars — anywhere a
 * cover image is missing and you'd otherwise have a styled `<div>`
 * with the initials inside.
 *
 * Pair with `getInitials()` from `@arraypress/text` for the
 * initials, and with `contrastText()` from this library if you
 * want the foreground colour to auto-derive from the background.
 *
 * The output is a real image (not a div with text), so it slots
 * into the same `.card-image img` styling rules as real artwork —
 * `object-fit: cover` and friends work uniformly.
 *
 * @param {string} initials - 1–4 character monogram. Pass an empty
 *   string and you'll get a tile with a placeholder dot.
 * @param {Object} [options]
 * @param {string} [options.bg='#141414'] - Background colour (hex
 *   or any CSS colour string the browser can parse inside an SVG).
 * @param {string} [options.text='#8a8a8a'] - Initials text colour.
 * @param {string} [options.accent='rgba(255,242,0,0.08)'] - Subtle
 *   accent wash drawn in the top-left of the tile, blended onto
 *   the background via a radial gradient.
 * @param {number} [options.size=400] - Square SVG `viewBox` size in
 *   user units. The output is resolution-independent; this only
 *   affects the natural width/height an `<img>` will reserve when
 *   no CSS dimensions are set.
 * @param {number} [options.fontSize] - Override the auto-picked
 *   font size. Defaults to `170` for 1–2 character monograms and
 *   `130` for 3+ characters so longer strings still fit the tile.
 * @param {string} [options.label] - Override the `aria-label` for
 *   accessibility. Defaults to the initials themselves.
 *
 * @returns {string} `data:image/svg+xml;utf8,…` URL.
 *
 * @example
 * import { getInitials } from '@arraypress/text';
 * import { generateInitialsAvatar } from '@arraypress/color-utils';
 *
 * const initials = getInitials('David Sherlock');
 * const avatarUrl = generateInitialsAvatar(initials);
 * // <img src={avatarUrl} alt="..." />
 *
 * @example
 * // Theme-aware tile — derive a readable text colour from the bg.
 * import { contrastText, generateInitialsAvatar } from '@arraypress/color-utils';
 *
 * const bg = '#141414';
 * const avatarUrl = generateInitialsAvatar('DS', {
 *   bg,
 *   text: contrastText(bg),
 * });
 */
export function generateInitialsAvatar(initials, options = {}) {
  const text = (initials ?? '').toString();
  const bg = options.bg ?? '#141414';
  const fg = options.text ?? '#8a8a8a';
  const accent = options.accent ?? 'rgba(255,242,0,0.08)';
  const size = options.size ?? 400;
  /* Smaller default font size for 3+ character monograms so they
   * still fit inside the tile without clipping. The threshold is
   * empirical (looks right across most fonts at 400×400). */
  const fontSize = options.fontSize ?? (text.length >= 3 ? 130 : 170);
  const label = _escapeXml(options.label ?? (text || 'Placeholder'));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `width="${size}" height="${size}" role="img" aria-label="${label}">` +
    `<defs><radialGradient id="g" cx="30%" cy="20%" r="60%">` +
    `<stop offset="0%" stop-color="${_escapeXml(accent)}"/>` +
    `<stop offset="100%" stop-color="transparent"/>` +
    `</radialGradient></defs>` +
    `<rect width="${size}" height="${size}" fill="${_escapeXml(bg)}"/>` +
    `<rect width="${size}" height="${size}" fill="url(#g)"/>` +
    `<text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" ` +
    `font-weight="700" font-size="${fontSize}" letter-spacing="-4" fill="${_escapeXml(fg)}">` +
    `${_escapeXml(text || '·')}` +
    `</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
