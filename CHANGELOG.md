# Changelog

All notable changes to `ar5iv-css` are documented here. The format is
loosely based on [Keep a Changelog](https://keepachangelog.com/), and
the project follows [semantic versioning](https://semver.org/).

## Unreleased

Mirrors of latexml-oxide surpass-Perl CSS deltas (each fixes a rendering
gap shared with vanilla LaTeXML.css). Tracked here so a future re-sync
does not silently drop them; the engine side carries the matching
`OXIDIZED_DESIGN` divergence and a guard test.

### Fixed
- **fancyvrb framed verbatim is responsive.** A `frame=single` box (an
  `ltx_framed_rectangle` carrying the new `.ltx_framed_verbatim` class)
  spans the print `\linewidth` and, being a shrink-to-fit inline-block of
  non-wrapping verbatim lines, would push its border off-screen and scroll
  the whole page on a phone. It is now capped at the viewport with over-long
  lines scrolling within the box (`max-width:100%; overflow-x:auto;
  box-sizing:border-box`). Mirrors latexml-oxide #525 (OXIDIZED_DESIGN #110).
- **Display math no longer escapes a width-constrained box.** A
  `.ltx_eqn_table` (`display:table; width:100%`) inside a `p{}` cell /
  `\parbox` / `minipage` (`.ltx_inline-block`) or a table cell (`.ltx_td`)
  could overflow the box and scatter across the page, because `overflow`
  is ignored on `display:table`. It is now re-boxed as a block scroll
  container under a constrained ancestor
  (`.ltx_inline-block .ltx_eqn_table, .ltx_td .ltx_eqn_table`), so it
  stays within its cell and scrolls horizontally when too wide; the
  `.ltx_eqn_row/cell` children regenerate an anonymous table so centering
  and eqno columns still lay out. Normal full-width display math is
  untouched. Mirrors latexml-oxide #533 (OXIDIZED_DESIGN #108).

### Added
- **enumitem `leftmargin` theming surface consumed.** `leftmargin=*`
  arrives as the `.ltx_leftmargin_flush` class (a boolean flush toggle)
  and `leftmargin=<dim>` as the `--ltx-enum-leftmargin` custom property
  (per the `--ltx-*` public surface, `docs/rfc_latexml_custom_properties.md`);
  both drop the list's UA left padding and set the left inset from the
  property. Mirrors latexml-oxide #559 (OXIDIZED_DESIGN #105).

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
  jsDelivr's `/gh/` endpoint straight from the tag; verified against a
  fresh build in CI on tag push.
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
