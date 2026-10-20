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
 * Calculate the perceived brightness of a hex color (the YIQ formula,
 * weighting green most). Returns a value between 0 (black) and 255 (white).
 * For WCAG's relative luminance, see {@link relativeLuminance}.
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
 * The WCAG 2 relative luminance of a hex color: how much light it gives
 * off, from 0 (black) to 1 (white), with each channel linearised first.
 *
 * @param {string} hex - Hex color string (with or without '#' prefix).
 * @returns {number} Relative luminance (0-1).
 *
 * @example
 * relativeLuminance('#ffffff');  // 1
 * relativeLuminance('#000000');  // 0
 * relativeLuminance('#635bff');  // ~0.15
 */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * The WCAG 2 contrast ratio between two colors, from 1 (the same) to 21
 * (black on white). Text needs 4.5 (AA) or 3 when large.
 *
 * @param {string} a - One hex color.
 * @param {string} b - The other.
 * @returns {number} The ratio (1-21), whichever is lighter on top.
 *
 * @example
 * contrastRatio('#000000', '#ffffff');  // 21
 * contrastRatio('#777777', '#ffffff');  // ~4.48
 */
export function contrastRatio(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The more readable of two text colors on a background, by WCAG contrast
 * ratio. With black and white (the defaults), white wins below a relative
 * luminance of about 0.179.
 *
 * @param {string} hex - Background hex color string.
 * @param {string} [lightColor='#ffffff'] - The light text color.
 * @param {string} [darkColor='#000000'] - The dark text color.
 * @returns {string} Whichever of the two contrasts more with the background.
 *
 * @example
 * readableText('#635bff');            // '#ffffff'
 * readableText('#ffd60a');            // '#000000'
 * readableText('#635bff', '#fff', '#111');  // '#fff'
 */
export function readableText(hex, lightColor = '#ffffff', darkColor = '#000000') {
  return contrastRatio(hex, lightColor) >= contrastRatio(hex, darkColor) ? lightColor : darkColor;
}

/**
 * How many steps {@link readableOn} takes between the color and its
 * target. 256 is finer than the 0-255 channels, so no reachable shade is
 * skipped, and cheap: a few hundred contrast checks.
 */
const READABLE_STEPS = 256;

/** Any accepted hex spelling ('F00', '#FF0000') as lowercase `#rrggbb`. */
function _normalizeHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r, g, b);
}

/**
 * The least-shifted shade of a color that clears a contrast ratio on every
 * given surface: the color mixed toward `toward` one fine step at a time
 * until it passes on all of them. Returns the color itself when it already
 * does.
 *
 * Every candidate is checked as the hex it will be returned as, so the
 * result really meets the ratio after rounding. The search walks in steps
 * rather than bisecting because contrast isn't monotonic: a shade lighter
 * than a light surface loses contrast as it darkens, then gains it.
 *
 * The default ratio is 5, not WCAG AA's 4.5, so text keeps clearing AA on
 * surfaces tinted from these ones (a callout mixed from the card, say).
 *
 * If no shade reaches the ratio, it returns `toward` itself (as `#rrggbb`):
 * the furthest it can go, which still falls short. Pure black or white only
 * fails 5:1 on a mid-tone surface; check with {@link contrastRatio} when the
 * surfaces aren't known in advance.
 *
 * @param {string} color - The hex color to adjust (3 or 6 digit, any case, with or without '#').
 * @param {string[]} surfaces - Hex backgrounds it must read on. Empty: the color is returned as is.
 * @param {Object} [options]
 * @param {'black'|'white'|string} [options.toward] - Where to shift: 'black', 'white' or a hex color.
 *   Defaults to whichever of black and white reads better on the first surface.
 * @param {number} [options.ratio=5] - The WCAG contrast ratio to clear.
 * @returns {string} Lowercase `#rrggbb`.
 *
 * @example
 * readableOn('#ffd400', ['#fdfdfd', '#eeeeee']);  // '#786300' (darkened a long way)
 * readableOn('#0039d5', ['#fdfdfd']);             // '#0039d5' (already passes)
 * readableOn('#1e3a8a', ['#1d1d1f'], { toward: 'white' });  // '#7b8cba'
 */
export function readableOn(color, surfaces, options = {}) {
  const ratio = options.ratio ?? 5;
  const target = options.toward === 'black' ? '#000000'
    : options.toward === 'white' ? '#ffffff'
    : options.toward ?? (surfaces.length ? readableText(surfaces[0]) : '#000000');
  const passes = (hex) => surfaces.every((s) => contrastRatio(hex, s) >= ratio);

  for (let i = 0; i <= READABLE_STEPS; i++) {
    const shade = mix(color, target, i / READABLE_STEPS);
    if (passes(shade)) return shade;
  }
  return _normalizeHex(target);
}

/**
 * Everything a theme needs from one accent color: the accent text shade for
 * each mode and the text color to put on the accent.
 *
 * - `accentText` — the accent darkened ({@link readableOn} toward black)
 *   until it clears the ratio on every light surface.
 * - `accentTextDark` — lightened toward white until it clears the ratio on
 *   every dark surface.
 * - `onAccent` — black or white, whichever contrasts more with the accent
 *   fill. ({@link readableText}; it isn't held to the ratio, since a bright
 *   mid-tone can't give 5:1 with either.)
 *
 * Pass a mode's page AND its tightest surfaces (cards, hover fills): the
 * card is often closer to the text than the page is. With no surfaces, a
 * mode falls back to plain white (light) or black (dark).
 *
 * If a mode's surfaces are too mid-toned for any shade to reach the ratio,
 * its text shade is pure black or white; see {@link readableOn}.
 *
 * @param {string} accent - The accent hex color (3 or 6 digit, any case, with or without '#').
 * @param {Object} surfaces
 * @param {string[]} surfaces.light - The light mode's backgrounds (page, cards).
 * @param {string[]} surfaces.dark - The dark mode's backgrounds.
 * @param {number} [surfaces.ratio=5] - The WCAG contrast ratio the text shades clear.
 * @returns {{ accent: string, accentText: string, accentTextDark: string, onAccent: string }}
 *   All lowercase `#rrggbb`.
 *
 * @example
 * deriveAccent('#FFD400', {
 *   light: ['#fdfdfd', '#f6f6f6', '#eeeeee'],
 *   dark: ['#1d1d1f', '#29292a', '#323234'],
 * });
 * // { accent: '#ffd400', accentText: '#786300', accentTextDark: '#ffd400', onAccent: '#000000' }
 */
export function deriveAccent(accent, { light = [], dark = [], ratio = 5 } = {}) {
  const fill = _normalizeHex(accent);
  return {
    accent: fill,
    accentText: readableOn(fill, light.length ? light : ['#ffffff'], { toward: 'black', ratio }),
    accentTextDark: readableOn(fill, dark.length ? dark : ['#000000'], { toward: 'white', ratio }),
    onAccent: readableText(fill),
  };
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
