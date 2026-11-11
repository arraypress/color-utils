# Changelog

All notable changes to `@arraypress/color-utils` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
