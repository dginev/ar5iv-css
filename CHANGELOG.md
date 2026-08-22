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
- **Full-line `\dashfill`/`\hrulefill` separators stack instead of overflowing.**
  Two `\hbox to \hsize{\dashfill}` separators flanking a centered label sit on one
  `nowrap` listingline; as `width:100%` inline-blocks laid side-by-side they summed to
  >200% and pushed the algorithm into a very wide horizontal scroll. The engine marks
  each `.ltx_leaderfill`; `.ltx_inline-block.ltx_leaderfill{display:block}` makes each
  own its line so they stack like the PDF. Witness arXiv 1510.02728.
- **A left-anchored pubnote popup no longer clips off the left edge on narrow viewports.**
  A `_meta` pubnote (e.g. a "Conference:" note lifted out of the title into a left-aligned
  block) sits at the left of the content column; the base `inset-inline-end:0` opened its
  hover popup leftward, off-screen, so only a fragment showed. `.ltx_pubnotes_meta` popups
  now anchor to the start edge and open rightward (still viewport-bounded). Witness arXiv
  2605.03143.
- **Adjacent-paragraph footnotes no longer overlap in the right margin on wide viewports.**
  Margin notes now keep their real height by default so `clear:both` stacks any two that
  would collide (footnotes in sibling paragraphs, arXiv 2511.21969), with `height:0` scoped
  to BFC carriers (list items, minipages) where a real-height float would inflate the
  carrier (arXiv 2605.00181). Same-paragraph stacking (arXiv 2605.00501) preserved.
- **Algorithm listings no longer collapse into stacked lines.** An algorithm
  listing — algorithmicx / algpseudocode in an `algorithm` float
  (`.ltx_float_algorithm`), algorithm2e (`.ltx_algorithm`), OR authored **outside a
  float** (e.g. the popular `breakablealgorithm` recipe, which wraps
  `\begin{algorithmic}` in a bare `center` → a bare `.ltx_listing` with neither
  wrapper class) — is laid out with markup (a line-number tag, math, statement text,
  per-line indentation), not the leading whitespace a code listing uses. The
  `.ltx_listingline{white-space:pre}` rule added for code (#6632) MISread the
  LaTeXML pretty-printer's newlines between a line's number and its statement as
  real breaks, stacking every "N:" onto its own line above wildly-spaced content —
  the commonly-reported "algorithm displayed wrongly / whitespace and indentation
  messed up" class (html_feedback#6080, #6236, #5492, #3450, #1998; witnesses
  arXiv:2501.13598 Algorithm 1, arXiv:2602.20153, arXiv:2408.07803). Algorithm
  listinglines now use `white-space:nowrap`: the formatting whitespace collapses so
  the number sits inline with its statement while each line stays intact — an
  algorithm is a fixed, incrementally-indented layout the author designed for the
  page, so reflow would void that intent; over-long lines scroll horizontally within
  the box (`overflow-x:auto`) exactly as code listings do. The selector is
  `.ltx_listing:not(.ltx_lstlisting)` — so it reaches bare algorithm listings
  regardless of wrapper class while excluding code listings, which carry
  `.ltx_lstlisting` (both lstlisting AND minted, verified). ar5iv-css-native fix: the
  bundled LaTeXML.css default already uses `nowrap`, so only this file's code-listing
  rule over-reached. Interim discriminator; the robust fix is a shared algorithm
  marker class + generic CSS for both LaTeXML.css and ar5iv.css, scheduled
  latexml-oxide 0.7.7. (algorithm2e `\Input`/`\Output` header lines still carry their
  number on a separate line — a structural quirk shared with vanilla LaTeXML, out of
  scope for this CSS fix.)
- **Wrapped floats no longer overlap the wrapped paragraph.** A `wrapfigure`
  (`.ltx_figure.ltx_align_float{left,right}`, e.g. `{r}{0.33\columnwidth}`) is
  intentionally narrow, but the `min-width:20/25rem` on `.ltx_flex_size_1` cells (meant
  for centered full-width figures) forced the inner content far wider than the 33% float
  box, so a minted/code panel overflowed leftward and painted over the body text. Float
  figures now stack their flex cells in a column and cap them at `max-width:100%` of the
  float, scrolling over-long code within the box. Witness arXiv:2605.03143 §2.1/§2.2.
- **Algorithm listings no longer show a phantom vertical scrollbar.** The
  `.ltx_listing:not(.ltx_lstlisting){overflow-x:auto}` containment left `overflow-y`
  visible, which the CSS Overflow spec promotes to `auto` on both axes, so tall inline
  math / full-height vline rules tripped an unwanted vertical scrollbar. Pinned
  `overflow-y:hidden` (as `.ltx_table` already does). Witness arXiv:2002.09766 Alg 1.
- **Side-by-side minipages keep their authored width.** `.ltx_align_middle` is a
  VERTICAL alignment, but the rule also forced `width:auto !important`, stripping a real
  `\begin{minipage}{0.48\textwidth}` width so paired algorithm minipages collapsed to
  content width and jammed into the running paragraph. The auto-center is now scoped to
  width-less minipages (`:not([style*="width"])`). Witness arXiv:2402.19043.
- **Framed code listings no longer push the page into horizontal scroll.** A
  `frame=single` `lstlisting` is boxed in a shrink-to-fit `.ltx_framed_rectangle` sized
  to its longest unwrapped line; a long line scrolled the whole page. `.ltx_lstlisting`
  is now `display:block; max-width:100%; overflow-x:auto` so over-long lines scroll
  within the box (markup unchanged). Witness arXiv:2512.24601. (The compounded
  `\tiny`×`0.7rem` font size is a separate, still-open item.)
- **Author name and ORCID iD badge share one line.** latexml-oxide's frontmatter now
  wraps an author's `ltx:personname` and its `ltx:contact[role=orcid]` iD badge in a
  `.ltx_annotated_personname` span, so the clickable iD sits right after the name
  instead of flushing onto its own line. This mirror sizes that wrapper as a
  baseline-aligned inline flex row (the name shrinks to its text, a `0.35em` gap before
  the badge) so the "Name  iD" pairing holds under ar5iv's block author layout. Mirrors
  the latexml-oxide `.ltx_annotated_personname` LaTeXML.css rule (PR #737); reported as
  arXiv/html_feedback#6571.
- **`\scalerel` inline icons render at text height.** latexml-oxide now binds the
  `scalerel` package (previously `\scalerel` was undefined, so a `\scalerel*` icon —
  e.g. the ORCID logo of arXiv:2608.12272 — rendered its picture unscaled, covering
  several lines). `\scalerel*{obj}{ref}` now wraps `obj` in `.ltx_scalerel`; this
  sizes that box to the line height and fills it with the picture/image child, so the
  icon is a text-height glyph. Mirrors the latexml-oxide `.ltx_scalerel` rule
  (KNOWN_PERL_ERRORS #103); reported as arXiv/html_feedback#6895.
- **Inline pictures scaled to text height stay small.** The transform
  reset that reverts figures/tables to natural sizing
  (`.ltx_transformed_outer{width:auto}` + `transform:none`) also caught a
  `\scalerel`-scaled inline `ltx_picture` — e.g. a custom `\orcidicon` tikz
  logo — whose only size came from that transform, so reverting ballooned it
  to the unscaled SVG viewport (a multi-line green ORCID "iD" in
  arXiv:2608.12272). Inline-block transform boxes whose content is an
  `ltx_picture` and not a figure/table
  (`:has(.ltx_picture):not(:has(.ltx_tabular,.ltx_figure,.ltx_table))`) are
  now excluded from the reset, and the picture fills its computed box, so the
  icon renders as a text-height inline glyph. Figures and tables are
  untouched — the reset's own witness papers (1504.02179, 2110.07681,
  0901.0489, 2006.13760, 1909.02255, 2111.15640, 2111.00396) have zero
  matches for the new selector. This is an ar5iv-css-native fix (the
  over-reach was in this file, not the engine), reported as
  arXiv/html_feedback#6895.
- **Code in listings keeps its indentation and line breaks.** arXiv's papers
  bundle imports this file into `layer(ar5iv)` and then
  `arxiv-html-papers-theme` into a *later* cascade layer that carries bare
  `.ltx_listingline{white-space:normal}` and `.ltx_text{white-space:normal}`
  resets. By cascade-layer order a later layer beats an earlier one regardless
  of specificity, so those resets silently overrode ar5iv's code-layout rules:
  every listing (`lstlisting`/`minted`) lost its leading-space indentation and
  wrapped its long lines (`arXiv:2605.03143`, especially inside figures). The
  `.ltx_listing .ltx_listingline` and `.ltx_lst_space` `white-space` rules are
  now `!important`, which inverts layer precedence so ar5iv wins and code
  renders `pre` again (`.ltx_listing` still scrolls over-long lines via
  `overflow-x`). This is an ar5iv-css-native defensive fix (the engine markup is
  correct; the over-reach is in arXiv's theme layer, not this file or the
  converter), reported as arXiv/html_feedback#6632.
- **Minipages don't overflow narrow viewports.** A `{minipage}` carries an
  absolute inline width from its `{width}` argument, so on a viewport narrower
  than that width the box overflowed its container and scrolled the whole page
  (the "impedance mismatch" of brucemiller/LaTeXML#1797). `.ltx_minipage` is now
  capped at its container (`max-width:100%`): a narrow screen shrinks the box and
  reflows its content, while wide viewports keep the intended print width, and
  flex-figure panels (already forced to `width:100%`) are unaffected. Witness:
  quant-ph/0510032 (51 of 53 minipages overflowed their container at 430px).
  Addresses the minipage-overflow case of ar5iv#83.
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
