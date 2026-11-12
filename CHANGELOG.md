# Changelog

All notable changes to `@arraypress/color-utils` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] — 2026-11-12

### Added

- **`computedColor(value, parent)`** (`dom.js`, browser): any CSS colour as Chrome works it out where it's used. `parseColor` first; otherwise (`light-dark()`, `color-mix()`, a relative colour, a system colour) the computed colour of an element put inside `parent` for a moment; `null` when it isn't a colour or depends on the element (`currentcolor`, `var()`, `inherit`). For Better Colours' root variables and its colour field, which each had their own way: the variables' one-pixel canvas silently refused `light-dark()`, `AccentColor` and `contrast-color()` (seen in Chromium 156: the pixel kept the colour drawn before, so a variable was given the previous one's colour) and read translucent colours a few steps off.

### Fixed

- **`formatColor` reads back as the same 8-bit colour in every format**, as its documentation said: `hsl` and `hwb` were written in whole numbers, which read back a step or two off for nine colours in ten (`{84, 232, 57}` → `hsl(111 79% 57%)` → `{85, 232, 59}`), and four places lost a few `oklab`/`oklch` colours. Each format is now written with as few places as read back exactly: `hsl(0 100% 50%)` stays, `#1a73e8` is `hsl(214.1 81.7% 50.6%)`, a near-grey keeps the hue it needs.
- **`cssColorsIn` leaves out what's inside `url(…)` and quoted strings**: an inline SVG icon's `fill='rgb(255,0,0)'` (or an address's `#fade`) was taken for a gradient stop, so `paintedColors` reported text beside a 16px icon as being over a red gradient, its real background lost. Hex colours of 5 or 7 digits aren't matched.
- **`parseColor` keeps what CSS Color 4 and Chrome keep** (each checked in Chromium): chroma and saturation below 0 are 0 (`oklch(0.5 -0.1 30)` read as the opposite hue, `hsl(0 -50% 50%)` as a teal), lightness stays within its range (`lab(-10 50 0)`, `oklab(1.2 0.1 0)`, `lch(120 50 20)`); and what Chrome calls invalid is `null` (`rgb(0,,0,0)`, `rgb(1. 2 3)`, legacy `rgb(10, 20%, 30)` and `hsl(120, 100, 50)`, `none` in the legacy syntax).
- **`hexToRgb` reads four digits** (`#f008`, which `parseColor` and `rgbaToHex` write): it gave `{240, 15, NaN}`, so `contrastRatio` was `NaN` and `nearestReadable` `null`.
- **`mixOklab` loses chroma, not hue, when a mix falls outside sRGB** (green to blue at 70% was clipped 9° off its hue), as the module says of every derived colour.
- **`paintedColors` with a `style` reader that gives no `opacity`** (`''`, or none) reads the element as opaque; it read it as invisible.

## [1.6.0] — 2026-11-12

### Added

- **CSS colours:** `parseColor(text)` reads every absolute CSS Color 4 colour (hex, named, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()` in all nine predefined spaces, `none`, either syntax) as `{ r, g, b, a }` sRGB, clipped as Chrome draws it (checked against Chrome's canvas for every space); `formatColor(rgba, format)` writes `hex`, `rgb`, `hsl`, `hwb`, `lab`, `lch`, `oklab` or `oklch` (`COLOR_FORMATS`), each reading back as the same 8-bit colour. For Better Colours (a palette and contrast checker) and Better Fonts (its card's colour).
- **Colours with alpha:** `blendOver` (source-over), `rgbaToHex` (`#rrggbbaa` when translucent), `rgbaToOklab`, `deltaEOK` (how different two colours look), `TRANSPARENT`.
- **Contrast:** `apcaContrast` (APCA-W3 0.0.98G-4g, its own reference values), `textContrast` (ratio unrounded and Lc, translucent text laid on first), `isLargeText`, `requiredRatio`, `nearestReadable` (OKLCH lightness moved the shorter way, hue kept).
- **What text shows in** (`dom.js`, browser): `paintedColors(element)`, the text's and backgrounds' colours from computed styles up the tree with opacity groups, gradients as a pair per colour, images and effects said to be unknown (a no-repeat background of 32px or less is an icon in the padding, not a picture behind the text: Wikipedia's external-link arrows); `canvasColor(doc)` (Chrome's dark canvas for dark pages), `paintParent`. Moved from Better Fonts' `content/describe.js` and made exact.
- **Colour spaces** (`spaces.js`): the conversions behind it all, exported.

### Changed

- OKLCH's conversions share `spaces.js` (same results).

## [1.5.0] — 2026-11-06

### Added

- **`colorName(hex)`** and **`nearestColorNames(hex, count)`**: the nearest CSS named colour in words (`'Royal Blue'`, `'Tomato'`), British spelling, aliases dropped, measured in OKLab with hue and chroma counted double so near-blacks and near-whites get neutral names. `COLOR_NAMES` is the list. For palette swatches (`@logomarks/brand-kit`'s swatch cards) and alt text.

## [1.4.0] — 2026-11-05

### Added

- **OKLCH and OKLab:** `toOklch(hex)`, `fromOklch({ l, c, h })` (out-of-gamut colours brought in by reducing chroma, found by bisection, so lightness and hue hold), `formatOklch(hex)` for CSS, `mixOklab(a, b, t)` and `mixOklch(a, b, t)` (hue the short way; a grey takes the other colour's hue).
- **`scale(hex, { anchor, lightness })`:** a 50–950 tonal scale stepped evenly in OKLCH lightness (`SCALE_LIGHTNESS`), the colour's hue kept, its chroma full beside it and easing toward white and black. The colour itself sits at its nearest step (`scaleStep(hex)`) unless `anchor: false`.
- **`wcagLevel(ratio)`, `pickReadable(candidates, ground, ratio)` and `WCAG`:** the level a ratio clears, and the first colour that reads on a ground.

### Changed

- `npm test` runs every file in `tests/`.

## [1.3.0] — 2026-10-21

### Added

- **`readableOn(color, surfaces, { toward?, ratio? })`** — the
  least-shifted shade of a color (mixed toward black, white or any hex)
  that clears a WCAG ratio on every surface; the color itself if it
  already does. Default ratio 5, for headroom on tinted surfaces. Checks
  each candidate as the rounded hex it returns, so the result really
  passes. Returns `toward` when no shade can reach the ratio.
- **`deriveAccent(accent, { light, dark, ratio? })`** — from one accent,
  the light-mode text shade (darkened for the light surfaces), the
  dark-mode one (lightened for the dark surfaces) and the black-or-white
  text to put on the accent. Lifted from JournalGrid's customizer.

### Fixed

- The README now documents `relativeLuminance`, `contrastRatio` and
  `readableText` (added in 1.2.0), and no longer calls `luminance()`
  WCAG's formula.

## [1.2.0] — 2026-10-12

### Added

- **`relativeLuminance(hex)`** — WCAG 2 relative luminance (0–1), each
  channel linearised.
- **`contrastRatio(a, b)`** — the WCAG 2 contrast ratio (1–21), either
  order.
- **`readableText(hex, light?, dark?)`** — the text color with more WCAG
  contrast on a background (white or black by default).

### Fixed

- `luminance()`'s docs called it WCAG's formula; it's perceived brightness
  (YIQ). Its result is unchanged.

## [1.1.0] — 2026-05-23

### Added

- **`generateInitialsAvatar(initials, options?)`** — build an inline
  `data:image/svg+xml,…` URL for a monogram avatar tile. Drop the
  result straight into `<img src=…>` as the "no artwork yet"
  placeholder for product cards / author tiles / testimonial
  avatars; slots into the same `object-fit: cover` styling as real
  images.

  Options:
  - `bg` — background colour (default `'#141414'`)
  - `text` — initials colour (default `'#8a8a8a'`)
  - `accent` — subtle wash drawn top-left (default subtle yellow tint)
  - `size` — SVG viewBox dimension (default `400`)
  - `fontSize` — auto-picked (`170` for 1–2 chars, `130` for 3+)
  - `label` — override the `aria-label`

  XML-significant characters in the initials are escaped, empty
  inputs render a centred placeholder dot, and non-string inputs
  are coerced safely.

  Pairs with `getInitials()` in `@arraypress/text` for the
  initials and `contrastText()` in this library for theme-aware
  foreground colour derivation.
