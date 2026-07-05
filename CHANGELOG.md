# Changelog

All notable changes to `ar5iv-css` are documented here. The format is
loosely based on [Keep a Changelog](https://keepachangelog.com/), and
the project follows [semantic versioning](https://semver.org/).

## 0.9.0 — 2026-07-05

First public npm/CDN release of the "glowup" rework. Highlights:

### Added
- **Design-token layer** (`css/ar5iv/tokens.css`) — 44 documented
  custom properties (layout, spacing, typography, colours), with
  per-token WCAG contrast rationale. Reference in `docs/TOKENS.md`,
  drift-checked in CI.
- **Cascade layers** (`reset, tokens, base, structure, components,
  math, fixes`) for predictable, override-friendly ordering.
- **Theme system** — `light-dark()`-driven tokens honouring
  `data-theme="light|dark|sepia"`, OS `prefers-color-scheme`, and
  `prefers-contrast: more`. Author-supplied `--ltx-*` colours are
  inverted for dark mode via an override-friendly `--fn-*` surface
  (relative OKLCH, HSL fallback). See
  `docs/rfc_latexml_custom_properties.md` and `docs/THEMING.md`.
- **Accessibility** — tokenised `:focus-visible` ring, `:target`
  highlight, dedicated `::selection` colour, `prefers-reduced-motion`
  and `forced-colors` support, keyboard-accessible footnote popovers.
- **Print styles** — forced light theme, inline footnote content,
  external-URL expansion, block-integrity hints.
- **Minified bundle** — `dist/ar5iv.min.css`, committed and served via
  jsDelivr/unpkg; verified against a fresh build in CI on tag push.
- Docs: `THEMING.md`, `TOKENS.md`, `BASELINE_AUDIT.md`, `SVG_BOXES.md`;
  `CONTRIBUTING.md`; stylelint config; visual-regression harness.

### Fixed
- Sepia theme no longer inherits the OS-dark image filter and
  author-colour inversion when the OS is in dark mode (the OS-dark
  rules now gate on `:root:not([data-theme])`, excluding any
  explicitly-named theme).
- Corrected three dead `.ltx_mathvariant_*` selectors (were
  hyphenated) so sans-serif math variants receive their styling.
- Corrected the `.ltx_bib_article .ltx_bib_title` selector (was
  `.bib-title`) so article titles render upright, not italic.

### Notes
- **Browser baseline:** modern evergreen engines (~mid-2024:
  Chrome/Edge 123+, Firefox 120+, Safari 17.5+). Older engines render
  a readable, un-themed fallback. See `docs/BASELINE_AUDIT.md`.
