# @arraypress/color-utils

Color utility functions -- luminance calculation, contrast detection, hex manipulation, WCAG accessibility helpers. Zero dependencies.

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

Calculate perceived brightness (0-255) using the WCAG formula.

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
