# ar5iv design tokens

The tokens defined on `:root` in `css/ar5iv/tokens.css` are the public
theming surface. Override any of them in a downstream stylesheet to
re-skin the theme without forking. This document is the canonical
reference for what each token controls.

The companion document `rfc_latexml_custom_properties.md` covers the
`--ltx-*` tokens that **LaTeXML** emits inline per-element — those
are a separate, upstream contract.

---

## Theme switching

```css
:root { color-scheme: light dark; }
:root[data-theme="light"] { color-scheme: only light; }
:root[data-theme="dark"]  { color-scheme: only dark; }
```

`light-dark()` resolves against the computed `color-scheme`. With no
`data-theme` attribute, OS preference wins. Explicit `data-theme`
overrides.

---

## Layout

| Token | Default | Purpose |
|---|---|---|
| `--main-width` | `52rem` | Reading-column width for the document body. |
| `--main-width-margin` | `54rem` | Slightly wider band used where a sidenote needs to sit just outside the column. |

## Borders

| Token | Default | Purpose |
|---|---|---|
| `--border-hairline` | `0.063rem` | Single-pixel separators (table cells, link underline, etc.). |
| `--border-double` | `0.188rem` | Double-rule variant for table tops/bottoms and decorative dividers. |

## Motion

| Token | Default | Purpose |
|---|---|---|
| `--duration-fast` | `0.2s` | Tap-to-zoom magnifier; any future hover/active transition. |
| `--ease-out` | `ease` | Default easing curve. |

Motion tokens are honoured only outside `prefers-reduced-motion: reduce`.

## Stacking

| Token | Default | Purpose |
|---|---|---|
| `--z-below` | `-1` | SVG content placed behind the page background. |
| `--z-page` | `0` | Normal in-flow content. |
| `--z-popover` | `100` | Footnote popovers, transient highlights. |

## Typography

| Token | Default | Purpose |
|---|---|---|
| `--headings-font-family` | Noto Sans + fallbacks | Headings. |
| `--text-font-family` | Noto Serif + fallbacks | Body text and most other prose. |
| `--math-font-family` | Latin Modern Math + fallbacks | MathML rendering. |
| `--math-caligraphic-font-family` | Latin Modern Math + fallbacks | `\mathcal`-style math. |
| `--code-font-family` | Noto Sans Mono + fallbacks | Listings, inline code, verbatim. |
| `--svg-text-size` | `0.82em` | Compensates for Noto Sans metrics inside SVG/`foreignObject` (fragile — re-tune if you change `--text-font-family`). |

## Colours

All colour tokens use `light-dark(L, D)` so they switch automatically
based on resolved `color-scheme`.

| Token | Light | Dark |
|---|---|---|
| `--background-color` | `white` | `#0d1117` |
| `--text-color` | `#292929` | `#c9d1d9` |
| `--border-color` | `#292929` | `#c9d1d9` |
| `--border-light-color` | `grey` | `#d4d4d4` |
| `--image-color` | `black` | `#292929` |
| `--image-background-color` | `white` | `white` (always — transparent PNGs assume light backdrop) |
| `--link-text-color` | `#212121` | `#c9d1d9` |
| `--email-link-color` | `#026ecb` | `darkcyan` |
| `--note-mark-color` | `#026ecb` | `#daa002` |
| `--note-highlight-color` | `#ffffd4` | `#231d02` |
| `--info-text-color` | `#01719d` | `#01719d` (single value) |
| `--warning-text-color` | `#8a6800` | `#d09e05` |
| `--error-text-color` | `#d8000c` | `#d52f36` |
| `--fatal-text-color` | `var(--error-text-color)` | inherits |
| `--index-ref-color` | `var(--email-link-color)` | inherits |
| `--text-color-author-black-dark` | n/a | `#c9d1d9` (the dark-mode value `\color{black}` author text resolves to) |
| `--surface-subtle` | `whitesmoke` | `#1a1f29` |

`prefers-contrast: more` further darkens text/links to pure black/white
and bumps note-mark and warning saturations — see
`css/ar5iv/tokens.css` for the exact overrides.

## Focus

| Token | Default | Purpose |
|---|---|---|
| `--focus-ring` | `color-mix(in oklch, currentColor 65%, var(--background-color))` | Outline colour for `:focus-visible`. Adapts to surrounding text colour. |
| `--focus-ring-width` | `0.125rem` | Outline thickness. |
| `--focus-ring-offset` | `0.125rem` | Outline-to-element gap. |

---

## How to add a token

1. Add the declaration to `:root` in `css/ar5iv/tokens.css`. Include a
   one-line comment describing what it controls.
2. If the token is theme-aware, use `light-dark(<light>, <dark>)`.
3. Add a row to this document with the same description.
4. Substitute the literal in `ar5iv.css` only where the mapping is
   *mechanical and lossless* — never as a perceptual judgement.
