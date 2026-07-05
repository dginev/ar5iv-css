[RFC] Themeability to all colors, via LaTeXML

## Challenge

LaTeX authoring allows for broad customization of colors, a feature widely used in arXiv.
This is usually accomplished by ecosystem packages such as xcolor.sty and colortbl.sty, among others.

LaTeXML already supports many of the advanced uses of color manipulation - both the named color variants,
as well as the custom definitions which can take open-ended color specifications, e.g. in RGB or HEX codes.

As to the magnitude of the task, the ar5iv 07.2025 HTML corpus shows 8.6 million uses of inline colors, 
with ~24.5 thousand distinct color codes. See [./ar5iv_colors_report.md] for details.

### Input variants
- foreground `\color` in xcolor.sty
- background `\fcolorbox`, `\rowcolor` and `\cellcolor` 
- highlight  `\colorbox`
- complex `{tcolorbox}` and other themed constructs (even beamer)
- complex `{listings}` language definitions, fundamentally relying on `\color`
- complex SVG with colors from `{tikz}` and `{xy}` - notably stroke, fille and border colors.

### Output variants

The status quo of LaTeXML is to deposit the precise color it could interpret from the input, as-is, via an appropriate attribute.

For text-near content, LaTeXML v0.8.8 annotates them via inline `style` attributes, usually deposited over `<span>` and `<div>` but in principle allowed over the entire HTML dialect (headings, table cells, captions, etc).

For MathML and SVG, there is an allowance of attributes specifically dedicated to colors, such as `mathcolor`, `mathbackground`, `fill`, `stroke`, `color`. 

For a general ability to theme (e.g. dark mode) we are interested in having access to the CSS properties describing colors, namely `color:`, `background-color:`, `border-color:`, `fill:`, `stroke:`.

## Possible solutions

### Route 1: Discretization

We may want to aid designers by adding a preselected palette of `class` attribute values,
maybe following a similar scheme to Tailwind CSS:

https://tailwindcss.com/docs/colors

This will inevitably be inaccurate for the finest-precision custom colors, but could be an easy win
for compatibility with maintstream CSS frameworks.

**Details:** This would require a color distance computation when latexml creates attributes from 
the Font object color spec, and serializing out to the XML the name of the nearest color bin.

### Route 2: Delegation

It is not clear that the final designer of the HTML produced by latexml wants to use a CSS framework.
 It is possible that instead they want to remap the dark mode colors themselves, 
 either via a rule, or via a dictionary. For example the minimal:

```css
[style *= "--ltx-fg-color:"] {
 color: hsl(from var(--ltx-fg-color) h s calc(100 - l));
}
```

This is the approach which can only be conveniently achieved (in 2025) with CSS custom properties.
Namely, if latexml emits a span:

```html
<span class="ltx_text" style="--ltx-fg-color: #000000;">
```

A universal CSS rule can then remap via the selector `[style*="--ltx-fg-color:"]`, without even needing to rely on `!important`. In fact one can design a theming cascade if desired.

If we wanted to speed up the selectors, we could also introduce a class `ltx_fg_color` then 
anchor the property definition on the class selector `.ltx_fg_color`.

## Approach for v0.9

After some experimentation and discussion, LaTeXML [PR 2613](https://github.com/brucemiller/LaTeXML/pull/2613) introduced five CSS custom properties for colors.

The following act as our author-provided custom "design tokens" over which designers can provide a theme:
```
--ltx-fg-color
--ltx-bg-color
--ltx-border-color
--ltx-fill-color
--ltx-stroke-color
```

ar5iv-css implements a layered indirection so themes don't need to fork the stylesheet. Each `--ltx-*-color` has a companion `--fn-*-color-to-dark-mode` token; the default transforms are defined per-element by ar5iv-css and consumed only under dark-mode conditions. A theme overrides the transform by redefining the `--fn-*` token; the application rule is untouched.

The selector must match what LaTeXML emits — the `--ltx-fg-color` custom property — not a generic `color:` substring that would also match `background-color:` and `border-color:` declarations. The five gates are independent:

```css
[style*="--ltx-fg-color:"] {
  --fn-fg-color-to-dark-mode:
      oklch(from var(--ltx-fg-color) calc(1 - 0.7 * l) c h);
}
[style*="--ltx-bg-color:"] {
  --fn-bg-color-to-dark-mode:
      oklch(from var(--ltx-bg-color) calc(1 - 0.8237 * l) c h);
}
/* …and similarly for --ltx-border-color, --ltx-fill-color, --ltx-stroke-color. */
```

A downstream theme overrides any of the five tokens on the same selector, without touching the application rules:

```css
/* Example downstream override: pass author colours through unchanged in dark mode. */
[style*="--ltx-fg-color:"] {
  --fn-fg-color-to-dark-mode: var(--ltx-fg-color);
}
```

Gratitude to Erin Aster from arXiv who contributed the original concept of the lightness-inverting colour map.

## Color spaces in CSS

To get a pleasant result, one is tempted to use the OKLCH color space which is perceptually uniform.
However, it has several drawbacks. The most important one in 2025 is that its baseline is "newly available",
cross-browser since 2023.

The other complication is the limitations in using calc() functions, such as min(),max(),sign(), 
as well as clamp() in the color conversion from() rules. They have little if any support,
which limits the appeal for creating mapping functions.

### Background scale (0.8237)

The dark-mode background `#0d1117` has OKLCH lightness 0.1763. The
background transform `calc(1 - 0.8237 * l)` therefore maps input
lightness `l ∈ [0, 1]` to output `[0.1763, 1]` — i.e. an author-supplied
white background lands at the theme's dark background, and other
backgrounds interpolate between it and white. `0.8237 = 1 − 0.1763`.

### Foreground / border scale (0.7)

The foreground (and border) transform `calc(1 - 0.7 * l)` maps input
`l ∈ [0, 1]` to output `[0.3, 1]`. The 0.3 floor is a design choice:
it keeps coloured author text from washing out to near-white in dark
mode while preserving enough perceived contrast to distinguish hues.
A value closer to 1 would invert more aggressively but also collapse
distinct author colours into similar-looking pale shades.

### HSL fallback asymmetry (100 vs 107)

The HSL fallback uses `calc(107 - l)` for backgrounds and `calc(100 - l)`
for foregrounds. The +7 offset on backgrounds approximates the OKLCH
target — HSL lightness isn't perceptually uniform, so a flat
`100 - l` would invert a 95 % white background to 5 % nearly-black,
slightly darker than the OKLCH branch. The +7 keeps the HSL output
closer to the OKLCH path's `[0.1763, 1]` range for representative
inputs. The foreground stays at the flat `100 - l` because the text
range we care about (mostly near-black inputs) already maps acceptably.

Whether these constants achieve the perception we hope they do can
only be validated by extensive testing — and that is biased by the
screen and set of eyes looking. The best strategy is to keep things
simple and lean on the obvious common-paper tests.