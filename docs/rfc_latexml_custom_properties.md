[RFC] Themeability to all colors, via LaTeXML

# Challenge

LaTeX authoring allows for broad customization of colors, a feature widely used in arXiv.
This is usually accomplished by ecosystem packages such as xcolor.sty and colortbl.sty, among others.

LaTeXML already supports many of the advanced uses of color manipulation - both the named color variants,
as well as the custom definitions which can take open-ended color specifications, e.g. in RGB or HEX codes.

As to the magnitude of the task, the ar5iv 07.2025 HTML corpus shows 8.6 million uses of inline colors, 
with ~24.5 thousand distinct color codes. See [./ar5iv_colors_report.md] for details.

# Input variants
- foreground `\color` in xcolor.sty
- background `\fcolorbox`, `\rowcolor` and `\cellcolor` 
- highlight  `\colorbox`
- complex `{tcolorbox}` and other themed constructs (even beamer)
- complex `{listings}` language definitions, fundamentally relying on `\color`
- complex SVG with colors from {tikz} and {xy}

# Output variants

The status quo of LaTeXML is to deposit the precise color it could interpret from the input, as-is, via an appropriate attribute.

For text-near content, that is done via inline `style` attributes, usually deposited over `<span>` and `<div>` but in principle allowed over the entire HTML dialect (headings, table cells, captions, etc).

For MathML and SVG, there is an allowance of attributes specifically dedicated to colors, such as `mathcolor`, `mathbackground`, `fill`, 


SVG 
flood-color
lighting-color
stop-color

And more specifically, we are interested in inline CSS properties describing colors, namely `color:`, `background-color:`, `border-color:`, `text-decoration-color:`



# Possible solution route 1: Discretization

We may want to aid designers by adding a preselected palette of `class` attribute values,
maybe following a similar scheme to Tailwind CSS:

https://tailwindcss.com/docs/colors

This will inevitably be inaccurate for the finest-precision custom colors, but could be an easy win
for compatibility with maintstream CSS frameworks.

**Details:** This would require a color distance computation when latexml creates attributes from the Font object color spec, and serializing out to the XML the name of the nearest color bin.

# Possible solution route 2: Delegation

It is not clear that the final designer of the HTML produced by latexml wants to use a CSS framework. It is possible that instead they want to remap the dark mode colors themselves, either via a rule, or via a dictionary. For example the minimal:

```css
[style *= "--lx-inline-color:"] {
 color: hsl(from var(--lx-inline-color) h s calc(100 - l));
}
```

This is the approach which can only be conveniently achieved (in 2025) with CSS custom properties.
Namely, if latexml emits a span:

```html
<span class="ltx_text" style="--lx-inline-color: #000000; color: var(--lx-inline-color);">
```

A universal CSS rule can then remap via the selector `[style*="--lx-inline-color:"]`, without even needing to rely on `!important`. In fact one can design a theming cascade if desired.

If we wanted to speed up the selectors, we could also introduce a class `ltx_inline_color` then anchor the property definition on the class, and have the CSS selector target the more efficient `.ltx_inline_color` rule.

### Refactor
 - check bindings for `cssstyle`
 - 
 - 
 - 

### Bruce
 - 3 categories of style
   - discrete categories (css-like): font-family, series, shape, align, 
   - lengths and positioning transforms
   - color
 
 - set of selectors for all users of latexml to easily theme
  - design token "selectors" for colors in latexml
  - the color map is upto the designer var(--color-mapping)
    - generic rules that apply --color-mapping
     - contextual selectors that may prefer different --color-mapping
     - 
  - but also the default colors are mapped top-level separately var(--main-text-color), var(--main-background-color)
  - designer decides between one-to-one color map vs continuous functional map
  - Next scope: pick color map based on the tikz details in generating a plot?
  - 
  - Ruleset 1: Generic, universal, admin-only: How you find the places where a color needs to be remapped
  - Ruleset 2: How to decide the color-mapping based on context (CSS selectors, light/dark mode)
  -

### CORTEX
 - [x] patch the report (not the regex) - https://corpora.mathweb.org/preview/sandbox%2Darxiv%2D2507/tex%5Fto%5Fhtml/2507.10227
 - [x] we are missing "Definition/mdpi" class bookkeeping improve "missing_files" regex.

 - get ready for --includestyles in CorTeX 
 - [x] rerun the rest of the sandboxes

### 2507 coverage
 - [ ] elsarticle.cls - update coverage
 