# Changelog

All notable changes to `@arraypress/color-utils` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
