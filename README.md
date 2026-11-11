# @arraypress/color-utils

Color utility functions -- luminance calculation, contrast detection (WCAG 2 and APCA), hex manipulation, every CSS colour read and written, OKLCH and OKLab, what a page's text really shows in, and colour names. Zero dependencies.

Works in Node.js, Cloudflare Workers, Deno, Bun, and browsers.

## Install

```bash
npm install @arraypress/color-utils
```

## Functions

### `hexToRgb(hex)`

Parse a hex color string to RGB components. Accepts 3 or 6 digit hex, with or without `#`.

```js
import { hexToRgb } from '@arraypress/color-utils';

hexToRgb('#ff0000')  // { r: 255, g: 0, b: 0 }
hexToRgb('#fff')     // { r: 255, g: 255, b: 255 }
hexToRgb('00ff00')   // { r: 0, g: 255, b: 0 }
```

### `rgbToHex(r, g, b)`

Convert RGB components to a hex string. Values are clamped to 0-255.

```js
import { rgbToHex } from '@arraypress/color-utils';

rgbToHex(255, 0, 0)    // '#ff0000'
rgbToHex(300, -10, 128) // '#ff0080' (clamped)
```

### `luminance(hex)`

Calculate perceived brightness (0-255), the YIQ formula. For WCAG's relative luminance, see `relativeLuminance()`.

```js
import { luminance } from '@arraypress/color-utils';

luminance('#ffffff') // 255
luminance('#000000') // 0
```

### `isLight(hex, threshold?)` / `isDark(hex, threshold?)`

Check if a color is light or dark. Default threshold is 160.

```js
import { isLight, isDark } from '@arraypress/color-utils';

isLight('#ffffff') // true
isDark('#000000')  // true
isLight('#808080', 50)  // true (custom threshold)
```

### `contrastText(hex, lightColor?, darkColor?)`

Get the best contrast text color for a given background.

```js
import { contrastText } from '@arraypress/color-utils';

contrastText('#ffffff') // '#000000' (dark text on light bg)
contrastText('#000000') // '#ffffff' (light text on dark bg)
contrastText('#ff0000', '#eeeeee', '#111111') // custom colors
```

### `relativeLuminance(hex)` / `contrastRatio(a, b)` / `readableText(hex, lightColor?, darkColor?)`

WCAG 2 contrast. `relativeLuminance` is 0 (black) to 1 (white); `contrastRatio` is 1 to 21, either order (text needs 4.5 for AA, 3 when large); `readableText` picks whichever of two text colors contrasts more with a background.

```js
import { contrastRatio, readableText } from '@arraypress/color-utils';

contrastRatio('#000000', '#ffffff') // 21
contrastRatio('#777777', '#ffffff') // ~4.48
readableText('#635bff')             // '#ffffff'
readableText('#ffd60a')             // '#000000'
```

### `readableOn(color, surfaces, options?)`

The least-shifted shade of `color` that clears a contrast ratio on **every** surface: the color mixed toward black, white or any hex, one fine step at a time, until it passes on all of them. Returns the color itself if it already does.

```js
import { readableOn } from '@arraypress/color-utils';

readableOn('#ffd400', ['#fdfdfd', '#eeeeee'])                // '#786300'
readableOn('#0039d5', ['#fdfdfd'])                           // '#0039d5' (already passes)
readableOn('#1e3a8a', ['#1d1d1f'], { toward: 'white' })      // '#7b8cba'
readableOn('#ffd400', ['#ffffff'], { ratio: 7 })             // AAA
```

| Option | Type | Default | |
|---|---|---|---|
| `toward` | `'black' \| 'white' \| string` | black or white, whichever reads on the first surface | Where to shift. |
| `ratio` | `number` | `5` | The WCAG ratio to clear. |

Every candidate is checked as the hex it's returned as, so the result meets the ratio after rounding. **If no shade can reach the ratio** (a mid-grey surface, say), it returns `toward` itself, which still falls short; check with `contrastRatio()` if your surfaces aren't known in advance. Output is always lowercase `#rrggbb`.

### `deriveAccent(accent, { light, dark, ratio? })`

Everything a theme needs from one accent color, for a site with light and dark modes:

- `accentText` — the accent darkened until it clears the ratio on every light surface (for links, prices, accent text on a light page).
- `accentTextDark` — lightened until it clears the ratio on every dark surface.
- `onAccent` — black or white, whichever contrasts more with the accent fill (button labels).

```js
import { deriveAccent } from '@arraypress/color-utils';

deriveAccent('#FFD400', {
  light: ['#fdfdfd', '#f6f6f6', '#eeeeee'], // page, card, card-2
  dark: ['#1d1d1f', '#29292a', '#323234'],
});
// { accent: '#ffd400', accentText: '#786300', accentTextDark: '#ffd400', onAccent: '#000000' }
```

## Deriving accents

A theme buyer picks one accent. Used as a fill it's fine; used as **text** a bright accent fails on a light page (yellow on white is ~1.4:1), and a dark one fails on a dark page. `deriveAccent()` works out the text shades so the buyer only sets one color.

- **Pass each mode's tightest surfaces, not just the page.** A card or hover fill is often closer to the text color than the page is, so it's the one that fails.
- **The default ratio is 5, not 4.5.** Components tint surfaces at runtime (a callout mixed 8% from the card), and a shade that only just clears 4.5 on the declared surfaces falls under it there. 5:1 leaves headroom.
- **The shift is the smallest that works**, so the text shade stays as close to the brand color as contrast allows. An accent that already passes is returned unchanged.
- **`onAccent` isn't held to the ratio.** A bright mid-tone can't give 5:1 with either black or white; it gets the better of the two.
- With no surfaces for a mode, it assumes a white (light) or black (dark) page.

In a customizer, write the results into the mode's tokens:

```js
const d = deriveAccent(picked, { light: ['#fdfdfd', '#f6f6f6'], dark: ['#1d1d1f', '#29292a'] });
style.textContent =
  `:root[data-theme="light"]{--color-accent:${d.accent};--color-accent-text:${d.accentText};--color-on-accent:${d.onAccent}}` +
  `:root[data-theme="dark"]{--color-accent:${d.accent};--color-accent-text:${d.accentTextDark};--color-on-accent:${d.onAccent}}`;
```

### `lighten(hex, amount?)` / `darken(hex, amount?)`

Lighten or darken a color by an amount (0-255). Default is 20.

```js
import { lighten, darken } from '@arraypress/color-utils';

lighten('#800000', 20) // '#941414'
darken('#ffffff', 20)  // '#ebebeb'
```

### `adjust(hex, amount)`

Adjust a color by a signed amount. Positive lightens, negative darkens.

```js
import { adjust } from '@arraypress/color-utils';

adjust('#808080', 30)  // lighten
adjust('#808080', -30) // darken
```

### `mix(hex1, hex2, ratio?)`

Mix two colors. Ratio 0 = first color, 1 = second color. Default is 0.5.

```js
import { mix } from '@arraypress/color-utils';

mix('#000000', '#ffffff')      // '#808080'
mix('#ff0000', '#0000ff', 0.5) // purple
mix('#ff0000', '#0000ff', 0)   // '#ff0000'
```

### `withAlpha(hex, alpha)`

Add alpha transparency to a hex color, returning an `rgba()` string.

```js
import { withAlpha } from '@arraypress/color-utils';

withAlpha('#ff0000', 0.5) // 'rgba(255, 0, 0, 0.5)'
withAlpha('#000', 0.75)   // 'rgba(0, 0, 0, 0.75)'
```

### OKLCH: `toOklch(hex)`, `fromOklch({ l, c, h })`, `formatOklch(hex)`

Colour in OKLCH (lightness 0–1, chroma, hue in degrees), where a lightness is the same lightness for every hue. `fromOklch` brings an out-of-gamut colour back by reducing chroma, keeping lightness and hue.

```js
import { toOklch, fromOklch, formatOklch } from '@arraypress/color-utils';

toOklch('#2563eb')                    // { l: 0.546, c: 0.215, h: 262.9 }
fromOklch({ l: 0.7, c: 0.12, h: 30 }) // a soft coral
formatOklch('#2563eb')                // 'oklch(54.6% 0.215 262.9)'
```

### `mixOklab(a, b, t?)` / `mixOklch(a, b, t?)`

Mix perceptually: OKLab for even blends, OKLCH (hue the short way) to keep far-apart hues vivid.

### `scale(hex, { anchor?, lightness? })` / `scaleStep(hex)`

A 50–950 tonal scale from one colour, stepped evenly in OKLCH lightness (`SCALE_LIGHTNESS`), its hue kept and its chroma eased toward white and black. The colour itself sits at its nearest step unless `anchor: false`.

```js
import { scale } from '@arraypress/color-utils';

scale('#2563eb') // { 50: '#f3f7ff', 100: '#e1ecff', …, 600: '#2563eb', …, 950: '#000e53' }
```

### `wcagLevel(ratio)` / `pickReadable(candidates, ground, ratio?)` / `WCAG`

The WCAG level a ratio clears (`'AAA'`, `'AA'`, `'AA Large'`, `'Fail'`), and the first of several colours that clears a ratio on a ground (the most contrasting when none does).

```js
pickReadable(Object.values(scale('#ffd400')).slice(5), '#ffffff') // the first step dark enough for AA text on white
```

### CSS colours: `parseColor(text)` / `formatColor(rgba, format)` / `COLOR_FORMATS`

Every absolute CSS colour read as sRGB the way Chrome draws it on an sRGB screen (out-of-gamut channels clipped): hex (3, 4, 6, 8 digits), named colours, `transparent`, `rgb()`/`rgba()`, `hsl()`/`hsla()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()` and `color()` in `srgb`, `srgb-linear`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz`, `xyz-d50`, `xyz-d65`; `none` channels; legacy and modern syntax. Computed styles only ever come in these forms, so `parseColor(getComputedStyle(el).color)` always gives a colour. Colours with alpha are `{ r, g, b, a }`: channels 0-255 (fractions kept), alpha 0-1.

```js
import { parseColor, formatColor } from '@arraypress/color-utils';

parseColor('oklch(0.7 0.15 200)');   // { r: ~0, g: ~185, b: ~195, a: 1 }
parseColor('color(display-p3 1 0 0)'); // { r: 255, g: 0, b: 0, a: 1 } (clipped, as drawn)
parseColor('currentcolor');          // null
formatColor({ r: 26, g: 115, b: 232, a: 0.5 }, 'oklch'); // 'oklch(57.37% 0.1946 257.86 / 0.5)'
```

Formats: `hex`, `rgb`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`; each reads back as the same 8-bit colour.

### `blendOver(top, bottom)` / `rgbaToHex(rgba)` / `deltaEOK(a, b)`

A translucent colour laid over another; hex with alpha (`#rrggbbaa` when translucent); how different two colours look in OKLab (about 0.02 is just noticeable; black to white is 1).

### Contrast: `textContrast(text, background)` / `apcaContrast(text, background)` / `isLargeText(px, weight)` / `requiredRatio(level, large)` / `nearestReadable(text, background, ratio?)`

`textContrast` gives the WCAG 2 ratio (unrounded: 4.499 fails 4.5) and APCA's Lc for text (translucent text laid on its background first). `apcaContrast` is APCA-W3 0.0.98G-4g (`#888` on white is 63.06; light on dark is negative). `nearestReadable` moves a text colour's OKLCH lightness as little as it takes to clear a ratio, hue kept; null when no lightness can.

```js
nearestReadable('#999999', '#ffffff'); // '#767676'
isLargeText(18.67, 700);               // true (14pt bold)
requiredRatio('AAA', false);           // 7
```

### What a page's text shows in: `paintedColors(element, { style?, canvas? })` / `canvasColor(doc)` (browser)

The text's colour (`-webkit-text-fill-color`) over its and its ancestors' backgrounds (through shadow roots and slots), laid from the page's canvas up as Chrome paints them, opacity groups included. `behind` is `'solid'`, `'gradient'` (a pair per gradient colour), or, when styles can't tell, `'image'` or `'effect'` (a filter, a blend mode, gradient-filled text). `canvasColor` is white, or Chrome's dark canvas (`rgb(18 18 18)`) when the page opts into dark.

```js
const { behind, pairs } = paintedColors(paragraph);
const worst = Math.min(...pairs.map(({ text, background }) => textContrast(text, background).ratio));
```

### Colour spaces

`RGB_SPACES`, `rgbSpaceToLinear`, `linearToRgbSpace`, `labToLinear`, `linearToLab`, `linearToOklab`, `oklabToLinear`, `toPolar`, `fromPolar`, `hslToSrgb`, `srgbToHsl`, `hwbToSrgb`, `srgbToHwb`, `srgbToLinear`, `linearToSrgb`: CSS Color 4's conversions, through linear sRGB, unclamped.

### `colorName(hex)` / `nearestColorNames(hex, count?)` / `COLOR_NAMES`

The nearest CSS named colour, in words (British spelling, aliases dropped), measured in OKLab with hue and chroma counted double, so a near-black is Black rather than the darkest blue. For swatch labels and alt text.

```js
colorName('#2563eb')             // 'Royal Blue'
colorName('#ff5c3a')             // 'Tomato'
nearestColorNames('#0f766e', 2)  // [{ name: 'Teal', hex: '#008080', distance: … }, …]
```

### `generateInitialsAvatar(initials, options?)`

Build an inline `data:image/svg+xml,…` URL for a monogram avatar. Drop straight into `<img src=…>` as the placeholder when no artwork is available — slots into the same `object-fit: cover` styling as real images.

Pair with `getInitials()` from [`@arraypress/text`](https://github.com/arraypress/text) for the initials, and `contrastText()` from this library when you want the foreground to auto-derive from the background.

```js
import { generateInitialsAvatar, contrastText } from '@arraypress/color-utils';
import { getInitials } from '@arraypress/text';

const avatar = generateInitialsAvatar(getInitials('David Sherlock'));
// data:image/svg+xml;utf8,%3Csvg…

// Theme-aware tile — text colour auto-derived from background:
const bg = '#141414';
const themed = generateInitialsAvatar('DS', { bg, text: contrastText(bg) });
```

**Options:**

| | Type | Default | |
|---|---|---|---|
| `bg` | `string` | `'#141414'` | Background colour (any CSS-color string). |
| `text` | `string` | `'#8a8a8a'` | Initials text colour. |
| `accent` | `string` | `'rgba(255,242,0,0.08)'` | Subtle wash drawn top-left. |
| `size` | `number` | `400` | SVG `viewBox` size (resolution-independent). |
| `fontSize` | `number` | `170` for 1–2 chars, `130` for 3+ | Font size in user units. |
| `label` | `string` | initials | `aria-label` for accessibility. |

The output is a real image, not a styled `<div>`, so it uniformly slots into the same CSS rules as your real cover artwork.

## License

MIT
