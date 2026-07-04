# SVG colored boxes: the foreignObject contract and rule rationalization

*(2026-07-03, written against latexml-oxide `ar5iv-2606-prep` ≥ `5d2ed92988`;
worked example: arXiv 2605.02240 Appendix G, tcolorbox panels with nested
`innercode` boxes.)*

## The engine contract (what newer LaTeXML emits)

Conversions from newer LaTeXML (latexml-oxide, and upstream Perl after its
box-sizing improvements) emit, for every `svg:foreignObject`:

1. `--ltx-fo-width/-height/-depth` in **em**, plus an exact TeX font anchor
   `font-size:<N>pt` in the same inline `style`. The em variables are
   calibrated against that anchor (10pt default; `\small` etc. give 8pt…).
2. Correct interior widths: HTML minipages inside the fo carry explicit em
   widths; **nested pictures** (a measured box inside a box, e.g. tcolorbox
   `innercode`) arrive as nested `<svg class="ltx_picture">` whose
   `width`/`height` attributes are exact TeX dimensions.
3. `svg:text` carries inline `font-size:<N>%` whenever TeX deviates from the
   10pt base (from the `@fontsize` Core attribute).
4. The fo height budget assumes TeX's `\baselineskip` = **1.2em** per text
   line, plus real list glue (`\topsep`/`\itemsep`/`\parsep`).

Legacy documents (older conversions served by ar5iv) have **none** of the
above: no font anchor, sometimes no `--ltx-fo-width`, stray inline widths.
Several ar5iv.css rules were written as *calibration fudges for that world*
and must not double-apply under the anchor. The discriminator used
throughout is `foreignObject[style*="font-size"]`.

## Rule-by-rule rationalization vs upstream LaTeXML.css

| Concern | upstream LaTeXML.css | ar5iv.css (glowup) | Why |
|---|---|---|---|
| fo width fallback | `foreignObject{--ltx-fo-width:100%}` | same | legacy fo without the var. |
| container width | `width:var(--ltx-fo-width)` | `clamp(.1*var(--main-width), var(--ltx-fo-width), 100%)` | defensive floor/ceiling; equals upstream when the var is sane. |
| multi-child width | `calc(1.1 * var(--ltx-fo-width))` | same | still needed under the anchor: Noto is metrically wider than Latin Modern, the 10% keeps browser line-break counts ≈ TeX's. |
| vertical align | `center` (always) | `end` for labels (see latexml PR #2541), **`start` when content holds an `ltx_minipage`** | a minipage in the fo = a measured box's upper part (tcolorbox et al. wrap content in `\minipage`; tikz labels never do). TeX fills boxes from the top; `end`/`center` pile the estimator slack into a fake empty band above the text. |
| content font | none (no webfonts) | `--svg-text-size:.82em`; **`1em` under the anchor** | `.82em` approximated the missing anchor (16px x .82 ~ 10pt) and calibrates Noto against Latin Modern for legacy docs; under the anchor it would double-shrink. |
| content line-height | none (browser `normal`) | `var(--ltx-fo-line-height, 1)`: 1 legacy, **1.2 under the anchor** | upstream can rely on `normal` (~1.15 for default serifs); Noto's `normal` is ~1.36 and would overflow the TeX budget, so glowup pins it: 1 preserves the tuned legacy look, 1.2 = TeX `\baselineskip` fills anchored boxes as budgeted. |
| width cascade | none | `& *:not(svg, foreignObject, image, rect, use){width:inherit!important}` | defeats stray legacy inline widths; harmless under the anchor. The `:not()` list keeps SVG **geometry** attributes authoritative so nested pictures survive. Never guard with `:not(svg *)` — all fo content descends from the outer svg, which disables the rule entirely. |
| `svg text` font | none | Noto Sans at `var(--svg-text-size)` | the .82em base approximates the 10pt TeX base under the page's 16px em; engine inline `font-size:<N>%` wins where emitted, and resolves against that base consistently. |
| fo nudge | `foreignObject{translate:0 0.1em}` | commented out | deliberate glowup omission; revisit only with evidence. |

## Residual, by design

Anchored boxes fill to ~75–95% of their frames; the remainder is the
*engine-side* estimator slack (LaTeXML deliberately over-estimates box
heights — Perl-parity behavior, e.g. 204pt estimated vs 178.5pt pdflatex
truth on an itemize probe). With `align-items:start` that slack reads as
bottom padding rather than a rendering bug. Shrinking it further is an
engine lever (tighter list-glue estimation), not a CSS one.
