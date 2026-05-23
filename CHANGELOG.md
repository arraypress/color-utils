# Changelog

All notable changes to `@arraypress/color-utils` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — Unreleased

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
