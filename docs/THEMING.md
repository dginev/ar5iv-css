# Theming ar5iv-css

Four recipes for reskinning ar5iv-css without forking. The token
surface is documented in [TOKENS.md](./TOKENS.md); the
author-supplied-colour contract is in
[rfc_latexml_custom_properties.md](./rfc_latexml_custom_properties.md).

If you're new here, the mental model is:

- `tokens.css` defines design tokens (colours, spacing anchors,
  font stacks) under `:root`.
- Two of the three theming hooks live on `:root`: `data-theme="dark"`
  forces dark, `prefers-color-scheme` listens to the OS, `prefers-contrast: more`
  bumps contrast tokens.
- Author-supplied colours come from LaTeXML as inline
  `--ltx-{fg,bg,border,fill,stroke}-color` custom properties on
  individual elements. ar5iv-css transforms them under dark mode via
  a companion `--fn-*-color-to-dark-mode` indirection. **Overriding
  the `--fn-*` token is how you change the inversion strategy
  without touching application rules.**

---

## Recipe 1 — Override a single palette colour

Goal: change the link colour in light mode only.

```css
/* downstream.css */
:root {
  --link-text-color: light-dark(#0066cc, var(--link-text-color));
}
```

That's the whole change. The token already participates in the
cascade via `light-dark()`, so we re-declare it preserving the
dark branch and replacing only the light side. The unlayered
declaration wins over ar5iv-css's `@layer tokens` definition for
non-`!important` rules.

**Pitfall.** `light-dark(var(--a), var(--b))` is spec-allowed but
not exercised in the shipping ar5iv path (see the `--fn-*` design
note in `dark-mode.css`). The pattern above is fine because the
arguments are a *literal* and a *var()* — the literal is what
`light-dark()` is designed for. If you wanted both sides as
variables, test it across your target browser matrix first.

---

## Recipe 2 — Change the dark-mode inversion strategy

The default transform inverts author-supplied lightness via
`oklch(from var(--ltx-fg-color) calc(1 - 0.7 * l) c h)`. Three
variants worth knowing:

**(a) No inversion — pass author colours through unchanged.**

```css
[style*="--ltx-fg-color:"] {
  --fn-fg-color-to-dark-mode: var(--ltx-fg-color);
}
[style*="--ltx-bg-color:"] {
  --fn-bg-color-to-dark-mode: var(--ltx-bg-color);
}
[style*="--ltx-border-color:"] {
  --fn-border-color-to-dark-mode: var(--ltx-border-color);
}
```

Useful when the upstream document is colour-curated for both
themes already (rare for arXiv, common for hand-authored
publishing pipelines).

**(b) Stronger inversion — bump the scale toward 1.**

```css
@supports (color: oklch(from white l c h)) {
  [style*="--ltx-fg-color:"] {
    --fn-fg-color-to-dark-mode:
      oklch(from var(--ltx-fg-color) calc(1 - 0.85 * l) c h);
  }
}
```

Raises the foreground floor from L=0.3 (default) to L=0.15 — more
contrast on near-black inputs at the cost of compressing the
distinct-author-colour palette.

**(c) `color-mix()` instead of relative `oklch()`.**

```css
[style*="--ltx-fg-color:"] {
  --fn-fg-color-to-dark-mode:
    color-mix(in oklch, var(--ltx-fg-color), white 60%);
}
```

Different semantics from the default: `color-mix` *blends* toward
a target colour rather than *transforming* lightness in place. The
result looks similar for near-black inputs (both push toward
white) but diverges for saturated inputs (mix pulls toward the
target, transform preserves hue). Useful when you want a softer
inversion or a deliberate hue cast (mix toward `#fff8e7` for a
sepia-tinted dark mode).

**Why this works without re-asserting `[data-theme="dark"]`.**
ar5iv-css's application rules read whichever `--fn-*` value is
cascading on the element. The override above replaces the
*default* `--fn-*` definition; the application rules (which gate
on `[data-theme="dark"]` and `prefers-color-scheme: dark`) pick
up the new value automatically.

**Special case: the most common author colour, `\color{black}`.**
ar5iv-css doesn't run author-supplied `#000000` foreground through
the inversion formula — it pins it to a named token,
`--text-color-author-black-dark`, so the most frequent author
colour by far gets a deliberate value rather than a derived one.
If your dark-mode background isn't `#0d1117`, override the token
rather than re-asserting the whole rule:

```css
:root { --text-color-author-black-dark: #f9f7f7; }
```

That single line replaces what would otherwise be a copy of
ar5iv-css's `[data-theme="dark"] [style*="--ltx-fg-color:#000000;"]`
selector chain.

---

## Recipe 3 — Add a third `data-theme` value

Goal: ship a sepia variant alongside light and dark.

```css
/* downstream-sepia.css */
:root[data-theme="sepia"] {
  color-scheme: only light;

  --background-color: #f4ecd8;
  --text-color: #5b4636;
  --border-color: #8a7458;
  --link-text-color: #6b4423;
  --note-highlight-color: #ebe0c0;
  --surface-subtle: #ede2c8;
}
```

Set `color-scheme: only light` because sepia is a light variant —
without it, browser-painted form controls would still pick up the
OS-preferred dark UI. Tokens you don't redeclare fall through to
the `:root` defaults (`light-dark()` resolves to the light branch
under `only light`).

**Author-colour behaviour.** With `data-theme="sepia"` the
`--fn-*` application rules don't fire (they gate on
`[data-theme="dark"]` or `:root:not([data-theme="light"])` inside
`prefers-color-scheme: dark`). Author-supplied
`--ltx-fg-color: #000000` therefore renders as literal black on
the sepia background. If that contrast feels harsh, add a
sepia-specific rule:

```css
:root[data-theme="sepia"] [style*="--ltx-fg-color:#000000;"] {
  color: var(--text-color);
}
```

For a high-contrast static theme, mirror the
`prefers-contrast: more` overrides into a `data-theme` selector:

```css
:root[data-theme="high-contrast"] {
  color-scheme: only light;
  --text-color: #000;
  --link-text-color: #000;
  --border-color: #000;
}
```

This makes the contrast bump explicit (a user toggle) rather than
implicit (OS preference). Both can coexist.

---

## Extending the token surface

The recipes above all override existing tokens. A downstream theme
that wants to style *new* chrome — site header, footer navigation,
modal forms, beta banner — typically adds its *own* tokens on
`:root` alongside the ar5iv-css ones:

```css
:root {
  /* extensions, not overrides */
  --header-background-color: #b31b1b;
  --header-text-color: #f9f7f7;
  --inpage-text-highlight-color: #1f5e96;
  --toc-text-highlight-color: var(--inpage-text-highlight-color);
  --nav-width: minmax(14rem, 25rem);
}
```

These don't need an `--ltx-*` prefix or any naming convention —
they're the downstream's namespace. The ar5iv-css token surface
stays minimal; the downstream's surface grows around it.

## Recipe 4 — Distribute as a downstream npm package

The override-friendly cascade is what makes the pattern below
work: ar5iv-css declares its layers (`reset, tokens, base,
structure, components, math, fixes`), so any *unlayered* rule
from your stylesheet wins for non-`!important` declarations. For
predictable ordering with sub-themes, declare your own layer
*after* loading ar5iv-css:

```css
/* @your-org/ar5iv-sepia/index.css */
@import "ar5iv-css/css/ar5iv.css";

@layer myTheme {
  :root[data-theme="sepia"] {
    color-scheme: only light;
    --background-color: #f4ecd8;
    --text-color: #5b4636;
    /* … */
  }
}
```

CSS layer ordering is first-appearance, so `myTheme` lands after
`fixes`. You don't need `!important` to win the cascade for
non-emergency overrides.

**package.json:**

```json
{
  "name": "@your-org/ar5iv-sepia",
  "version": "0.1.0",
  "main": "css/index.css",
  "files": ["css/"],
  "peerDependencies": {
    "ar5iv-css": "^0.9.0"
  }
}
```

**CDN consumption from HTML:**

```html
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/ar5iv-css@0.9.0/dist/ar5iv.min.css">
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@your-org/ar5iv-sepia@0.1.0/css/index.css">
```

Order matters: ar5iv-css first, the downstream theme second.

---

## Pitfalls and conventions

- **`light-dark(var(), var())` is unverified in this codebase.** The
  shipping pattern uses literals or `var()` mixed with literals.
  `light-dark()` with two variable arguments is spec-allowed but
  not exercised — test before relying on it.
- **`color-scheme` on `:root` is required per `data-theme`.** Without
  `color-scheme: only light` (or `only dark`), `light-dark()` may
  resolve to the wrong branch and browser-painted form controls
  will inherit the OS preference.
- **`@layer` ordering is first-appearance.** Layered downstream
  rules append after ar5iv's layers. Unlayered downstream rules
  win for non-`!important` cascade — usually what you want.
- **`!important` is allowlisted in ar5iv.** The transformed-wrappers
  feature flag and per-rule inline-style defeats use it
  deliberately. Avoid adding new `!important` declarations from
  downstream — if you need to win against ar5iv's `!important`,
  declare your rule in the `reset` layer (earliest named layer
  wins for `!important` — the *inverted* layer-order rule).
- **The `--fn-*` indirection is per-element, not global.** Each
  `--ltx-*-color` token has its own gate
  (`[style*="--ltx-fg-color:"]`, etc.) — overriding one doesn't
  affect the others, and they can be overridden independently.

## In the wild

The patterns above are exercised in production by the
arXiv-served HTML browse stack:

- `arxiv-html-papers-20260131.css` declares two top-level layers
  via `@import`, with the vendor theme strictly after ar5iv:

  ```css
  @import "ar5iv.0.8.5.css" layer(ar5iv);
  @import "arxiv-html-papers-theme-20250131.css" layer(arxiv-theme);
  @layer ar5iv, arxiv-theme;
  ```

- The vendor theme then declares its own ten sub-layers
  (`tokens, ar5iv-patches, print, header, …`) for further
  internal ordering, exercises recipes 1 (palette overrides), 2
  (the author-black rescue via the dedicated token, once
  introduced), and 4 (downstream extension). It also extends the
  token surface with its own header/footer/nav tokens as
  described above.

This validates that the recipes survive contact with a
non-trivial real-world theme; if you find a divergence between
the recipes and that stylesheet's patterns, file an issue —
either the cookbook needs an update or the downstream needs a
refactor, and both are interesting to know.

## Related docs

- [TOKENS.md](./TOKENS.md) — every public token.
- [rfc_latexml_custom_properties.md](./rfc_latexml_custom_properties.md)
  — the `--ltx-*` contract, OKLCH constants, HSL fallback.
- [GLOWUP_WISDOM.md](./GLOWUP_WISDOM.md) — decisions and surprises
  from the modernisation, including why the application uses
  `[data-theme="dark"]` + `@media` instead of
  `light-dark(var(), var())`.
