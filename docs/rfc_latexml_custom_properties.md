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

As a sample dark mode approach, we added the HSL lightness-inverting color map mentioned above.
With gratitude to Erin Aster from arXiv who contributed the concept:

```css
[style*="color:"] {
  --fn-fg-color-to-dark-mode:
      hsl(from var(--ltx-fg-color) h s calc(100 - l));
}
```

A theme would then needs to only redefine the `--fn-*` rules in the single `[style*="color:"]` selector rule
 to a different color mapping, while keeping all other selector rules as-is.

## Color spaces in CSS

To get a pleasant result, one is tempted to use the OKLCH color space which is perceptually uniform.
However, it has several drawbacks. The most important one in 2025 is that its baseline is "newly available",
cross-browser since 2023.

The other complication is the limitations in using calc() functions, such as min(),max(),sign(), 
as well as clamp() in the color conversion from() rules. They have little if any support,
which limits the appeal for creating mapping functions.

Why clamping?

The current ar5iv dark mode background has OKLCH lightness 0.1763, so we could want that as our "darkest" bound.
Then for older browsers, adding an HSL fallback (lightness 7.06%).
Whether this actually achieves the perception we hope it does can only be validated by extensive testing,
and that is biased by the screen and set of eyes looking... So the best strategy may be to keep things very
simple and working on the obvious common tests.