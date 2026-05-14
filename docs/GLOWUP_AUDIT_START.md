# ar5iv-css Glow-Up — Audit, Plan & Progress Log

> A senior-designer audit of `css/ar5iv.css` (2,590 LoC) and `css/ar5iv-fonts.css`
> (72 LoC), with a phased plan to bring the theme in line with modern CSS,
> design-system, and accessibility best practices — **without disturbing the
> things that already work well**.
>
> The ar5iv theme is mature and pragmatically aware of LaTeXML's output quirks.
> The goal of this glow-up is not a rewrite; it is to (a) make implicit
> conventions explicit, (b) close real gaps (a11y, print, RTL, focus), and
> (c) modernise the foundations so future maintenance is cheaper.

---

## 0. Scope & Ground Rules

- **Preserve behaviour.** Every change must round-trip against a representative
  arXiv-converted corpus; we are tuning, not redesigning.
- **No regressions for LaTeXML quirks.** Comments referencing specific arXiv
  IDs (`1810.10704`, `2006.09882`, `astro-ph/0001001`, …) are load-bearing
  test cases — treat each as a regression fixture.
- **Move in small, reviewable layers.** Each phase below should land as one or
  more focused PRs that can be reverted independently.
- **Senior-designer lens.** Decisions favour clarity, typography, and
  accessibility over novelty.

---

## 1. Headline Findings

| # | Area | Status |
|---|---|---|
| 1 | Design tokens are **partial** — 23 root variables, but ~65 distinct `rem` literals, 17 hex colours, 4 z-index values across 8 declarations; no spacing / type / radius / motion scales | ❌ |
| 2 | Light/dark theming is **consistent and well-shaped** (OKLCH `from` with HSL fallback). Constants are documented in `docs/rfc_latexml_custom_properties.md` (the `0.8237` is `1 − OKLCH(L)` of the dark-mode background `#0d1117 → 0.1763`) — but the RFC is not cross-linked from `ar5iv.css`, the `0.7` foreground choice is unexplained, and the `@supports (color: oklch(calc(…) c h))` probe (`ar5iv.css:99, 121`) tests calc-in-arguments rather than the relative-colour `oklch(from …)` syntax actually being used. Lacks `prefers-color-scheme` and `forced-colors`. | ⚠️ |
| 3 | **No designed focus state** — zero `:focus`, `:focus-visible`, or `outline` rules in 2,590 lines. UA defaults still apply, so focus is technically present but visually inconsistent against custom link/footnote styling | ⚠️ |
| 4 | **No `@media print`**, **no `prefers-reduced-motion`**, **no `:target` styling** | ❌ |
| 5 | **No logical properties** for i18n / RTL (one exception: `max-inline-size` at `ar5iv.css:871`); all spacing is physical | ❌ |
| 6 | 15 media queries with **10 distinct breakpoint values** (46, 46.01, 51.99, 52, 52.01, 79.99, 95.99, 96, 108.99, 109 rem) — desktop-first, unnamed, scattered | ⚠️ |
| 7 | 31 `!important` declarations (`ar5iv.css:260…2584`) — some justified (overriding LaTeXML inline `style=""`), many indicating cascade conflicts | ⚠️ |
| 8 | Modern CSS adopted **thoughtfully, with categorical gaps**: `:has()` (14×), CSS nesting (12×, mostly in SVG/listing rules), `oklch(from …)`, `text-wrap: balance`, `white-space: break-spaces`, `clamp()`/`min()`/`max()`, one paired `@supports` feature gate — all in use. Gaps are categorical, not quantitative: `:is`/`:where`, `@layer`, `@container`, `color-mix`, `light-dark()`, logical properties. | ⚠️ |
| 9 | **`@import` chain in ar5iv-fonts.css** delays CSSOM completion; Google Fonts URLs lack `&display=swap`; two separate CDN origins each cost a DNS/TLS hop | ⚠️ |
| 10 | **16 TODO comments** in production CSS — some load-bearing (`ar5iv.css:702`), some stale (`ar5iv.css:505 "TODO: Untested"`) | ⚠️ |
| 11 | Documentation in code is **excellent for LaTeX-aware readers** but opaque to general front-end contributors; the existing `docs/rfc_latexml_custom_properties.md` is not cross-linked from the stylesheet | ⚠️ |
| 12 | What's good: clear section banners (mid-file); consistent OKLCH dark-mode transform (the *shape* is right, even if the constants need justification); ambitious `:has()` use for malformed-author detection (clever, with a real maintenance cost); balanced text on the document title (`text-wrap: balance`, `ar5iv.css:870`) | ✅ |

---

## 2. Audit by Category

Each category captures (a) what we found, (b) why it matters, (c) what
"good" looks like. Concrete step plans live in **§3**.

### A. Design Tokens & Custom Properties

- 23 custom properties on `:root` (`ar5iv.css:2-30`), mostly colour + font
  families plus `--main-width`, `--main-width-margin`, `--svg-text-size`.
  No tokenised scales for **spacing, type, line-height, radius,
  border-width, shadow, motion, breakpoints, z-index**.
- ~65 distinct `rem` values appear as literals. `52rem` is bound to
  `--main-width` but still typed by hand inside `calc()` and media queries
  (e.g. `ar5iv.css:373, 457-458, 1331-1332, 1519, 1727`). Media-query
  conditions can't reference custom properties; the duplication is partly
  unavoidable, but `calc()` and `min()/max()` could use the variable.
- Z-index: 4 distinct values (`-1`, `0`, `100`, `initial`) across 8
  declarations — small surface, but unscaled.
- The five `--ltx-*` author-colour slots (`--ltx-fg-color`, `--ltx-bg-color`,
  `--ltx-border-color`, `--ltx-fill-color`, `--ltx-stroke-color`) are the
  de-facto public token contract for LaTeXML. They are already
  documented in `docs/rfc_latexml_custom_properties.md` — that doc just
  isn't cross-linked from `ar5iv.css` itself.
- Semantic intent is mixed with implementation: `--email-link-color`,
  `--note-mark-color`, `--index-ref-color` are aliases of each other
  (`ar5iv.css:22-29`).
- Minor: `opacity: 100` appears repeatedly (e.g. `ar5iv.css:541, 602, 616,
  633, 642, 664, 677`). Clamps to `1` per spec, so it works, but it's
  noise — should be `opacity: 1`.

**Why it matters.** Without scales, every nudge to "make sidenotes a hair
bigger" is a grep-and-edit. With scales, it's one variable.

### B. Theming Architecture (light / dark / contrast)

- Theme switch is `[data-theme="dark"]` only (`ar5iv.css:62, 78, 85, 100…`).
  There is **no `@media (prefers-color-scheme: dark)`** path, so a fresh
  visitor on a dark-OS browser sees light theme until JS toggles the attribute.
- Author-colour inversion uses OKLCH `from` when supported, HSL `from`
  otherwise (`ar5iv.css:99-142`). The constants **are** explained in
  `docs/rfc_latexml_custom_properties.md:109-110`: `0.8237 = 1 − 0.1763`,
  where `0.1763` is the actual OKLCH lightness of the dark-mode
  background `#0d1117`. The formula maps input lightness `l ∈ [0,1]` to
  `[0.1763, 1]` — i.e., from the dark-mode background up to white.
  What **is** undocumented is **why the foreground uses a different
  scale factor (`0.7`)** than the background (`0.8237`), and why the
  HSL fallback uses `107` for bg and `100` for fg without the same
  rationale chain. The rationale exists; it's just not cross-linked
  from the CSS, and the fg/HSL choices need their own line.
- **The `@supports` probe is mis-specified.** `@supports (color: oklch(
  calc(1 - 0.5) 0.1 250))` tests whether `calc()` is accepted inside
  oklch arguments, **not** whether relative-colour syntax (`oklch(from …
  l c h)`) is supported. The two features shipped together in major
  browsers so the test works in practice, but `@supports (color:
  oklch(from white l c h))` would be the honest probe.
- Black special-case is hand-curated (`ar5iv.css:147-153`); the comment
  acknowledges it should become a design token name. The *output*
  (`#c9d1d9`) is what should be a token; the literal-hex trigger key
  stays.
- No `prefers-contrast: more` path; no `forced-colors` accommodations
  (high-contrast Windows, ChromeOS HC mode would override colours
  unpredictably).
- `--note-highlight-color: #ffffd4` on white ≈ **1.03:1** contrast —
  but this is a *background wash* on a popover, not a foreground
  colour; the issue is detectability of the highlight itself, not text
  legibility on top of it.

### C. Accessibility (WCAG 2.2 lens)

- **No designed focus state.** Zero `:focus`, `:focus-visible`, or
  `outline` rules. UA default rings still appear (we don't `outline: 0`
  anywhere), but they have no relationship to our link/footnote styling
  and are visually weak against the dotted underline pattern
  (`ar5iv.css:193, 291`). Goal: a single tokenised focus ring that
  contrasts in both themes.
- **Footnote popups have no keyboard path.** Triggers are `:hover` /
  `:active` on small screens (`ar5iv.css:608-616`) and on the
  `.ltx_note_mark` on large screens (`ar5iv.css:682-689`). `:active`
  does fire briefly on touch/Enter, but only while held, so keyboard
  users at best get a flash, never a persistent popover. *Caveat:* the
  CSS fix (`:focus-within`/`:focus-visible`) only works if LaTeXML emits
  a focusable element at the mark site; if it's a bare `<sup><span>`,
  the fix needs an upstream markup change.
- **No `prefers-reduced-motion`.** Figure-zoom applies
  `transition: all 0.2s; transform: scale(1.8)` (`ar5iv.css:1662-1676`).
  The trigger is `:active`, i.e. tap-and-hold or click-and-hold, not a
  passive hover — so it's a user-initiated "magnifier", not an ambient
  animation. Reduced-motion guarding is still good practice but not
  acutely necessary.
- **`:target` not styled.** Jumping to a reference, equation, or section
  via in-page anchor offers no visual confirmation. Moderate severity.
- **`::selection` not styled.** Custom backgrounds (esp. dark mode) can
  leave selection low-contrast.
- **Skip links / landmarks** not styled (markup is LaTeXML's responsibility,
  but CSS should be ready for `nav[aria-label]`, `main`, `:focus` on these).
- **Contrast** of body text is excellent in both modes (`#292929` on
  white ≈ 14.7:1; `#c9d1d9` on `#0d1117` ≈ 12.2:1). Risk surfaces:
  - `--warning-text-color: #d09e05` on white ≈ **2.46:1** — below AA
    body (4.5) and AA Large (3.0). Real defect.
  - `--note-highlight-color: #ffffd4` on white ≈ 1.05:1 — but this is
    a *background wash* on a popover, not a foreground colour, so the
    issue is "the highlight may be too subtle to notice", not "text is
    illegible". A 5–10 % darker tint or a thin border would solve it.
  - User-supplied colours run through the inversion formula are not
    contrast-checked; pathological inputs can land below AA.
- **Vendor-prefixed motion** (`-webkit-/-moz-/-ms-/-o-transition`,
  `ar5iv.css:1662-1665`) is years past relevance — easy delete.

### D. Responsive & Layout

- Desktop-first ladder with **scattered breakpoints** (46 / 46.01 / 51.99
  / 52 / 52.01 / 79.99 / 95.99 / 96 / 108.99 / 109 rem). The 0.01rem
  edges avoid same-pixel double-matching but make intent harder to read;
  modern CSS (single-sided MQs at one value) makes them unnecessary.
- Sidenote layout (`ar5iv.css:567-834`) is the canonical case for
  **container queries**: the decision "footnote-in-margin vs inline"
  depends on the article column's width, not the viewport's. Embedded
  contexts (narrow iframes, side-by-side reading views) are mis-classified
  today.
- `100vw`-anchored centring (`ar5iv.css:457-458`): scrollbar width on
  desktop Windows causes a sub-pixel offset; not a serious bug but
  `100dvw` is the modern, safer choice.
- WCAG 2.1 SC 1.4.10 ("Reflow", 320 CSS-px / 400 % zoom) is not actively
  tested. Long formulas (already handled by
  `:has(> math mrow:nth-of-type(7))` at `ar5iv.css:2552-2555` — a
  pragmatic heuristic, not a robust solution) and wide tables are the
  likely failure surfaces.

### E. Modern CSS Adoption

| Feature | Present? | Notes |
|---|---|---|
| Custom properties | partial | see §A |
| `@supports` | 2× | exemplary use for OKLCH gating |
| `:has()` | 14× | thoughtful (esp. malformed-author detection); unguarded — pre-`:has()` browsers silently skip the rule |
| `:is()` / `:where()` | no | repeated `.ltx_align_*` and similar selector lists would shrink |
| Nesting | 12× | mostly in the SVG foreignObject block (`ar5iv.css:1735-1763`), plus listing-tag (`:1946`) and list-item (`:2247`); moderate adoption, not vestigial |
| `@layer` | no | top intervention: `reset → tokens → base → structure → components → math → fixes` |
| `@container` | no | sidenotes, captions, figures all candidates |
| `clamp()` / `min()` / `max()` | 3× | underused for fluid type/spacing |
| `color-mix()` | no | useful for focus ring / hairline tinting; **not** a replacement for the `oklch(from …)` inversion (different operation) |
| `light-dark()` | no | could halve the `[data-theme]` duplication for pure-token rules; doesn't subsume the author-colour inversion logic |
| Logical properties | 1× | i18n blocker |
| `text-wrap: balance / pretty` | 1× | good (`ar5iv.css:870`); extend to **short** headings, captions, ToC titles only — browsers cap balance to ~6–10 lines, so it does nothing on paragraphs |
| `white-space: break-spaces` | 1× | `ar5iv.css:1966`, modern (2020+) value for listings — quietly in use |
| `gap` | 0× | five `display: flex` containers all use per-child margins; modest cleanup opportunity |
| `display: grid` | 0× | not a defect, but the author-block flex layout (`ar5iv.css:357-415`) could be a cleaner 2D grid |
| Vendor-prefixed `transform`/`transition`/`columns` | yes (figure zoom + index list) | delete — unprefixed has been baseline for years |

### F. Specificity & Cascade Hygiene

- 31 `!important`s. Tally of root causes:
  - LaTeXML inline `style=""` overrides — **defensible**
    (`ar5iv.css:1331, 1509-1519, 1950-1952, 2538, 2584`). These cannot
    be replaced by `@layer` ordering: inline styles outrank every author
    layer.
  - Forcing display/visibility for footnote modes across viewport
    breakpoints — same-cascade-priority overrides that
    `@layer` ordering also doesn't help with. They need restructuring
    (different selectors / different breakpoints), not relayering.
  - `font-size: 1.7rem !important` on document title (`ar5iv.css:341`) is
    a workaround for *upstream* LaTeXML inaccuracies, by the author's
    own admission. A token + cascade-layer pair *could* drop it.
- Realistic estimate: **a minority of `!important` declarations** can be
  removed by introducing `@layer`. Most need targeted refactoring of the
  selectors they appear on.
- The longest `:not()` chain has 5 successive negations
  (`ar5iv.css:1498-1503`) and expresses "image gets default sizing only
  outside layout-managed containers". The intent is legitimate; the
  expression is hard to read. An `:is()` rewrite is only an improvement
  once the *positive* set of "layout-managed" classes is stable. Keep as
  a future refactor, not a bug.
- `[style*="--ltx-fg-color:"]` substring matchers (`ar5iv.css:37, 45, 49,
  53, 56`) are correct in spirit (CSS can't observe custom properties on
  arbitrary elements without them) but brittle: any whitespace change in
  the inline `style` value breaks the match. Worth documenting the
  contract with LaTeXML.
- **Subtlety:** `@layer` inverts the `!important` priority. With normal
  rules, later layers beat earlier ones; with `!important` rules,
  **earlier layers beat later ones**. So placing a `fixes` layer last
  (the obvious choice) is correct for normal rules but means `fixes`
  loses for `!important` cases. The architecture should pick a layer
  order with this asymmetry in mind, and document it.

### G. Print Styles

- **Completely absent.** No `@media print` in the file.
- Cost: scientific articles get printed. Today, on paper the user gets:
  - Footnote popups invisible (display:none collapsed; never re-opened).
  - Links shown as underlined text with no URL.
  - Dark mode prints as dark if the user toggled it.
  - No page-break management on figures, theorems, code blocks.
  - Sidenotes float right of an 8.5"-wide page that has no room for them.

### H. Performance

- `ar5iv-fonts.css` chains four `@import`s (`ar5iv-fonts.css:1-4`).
  Each child stylesheet is discovered only after its parent is parsed,
  so the **CSSOM critical path is staircased**, not the font byte
  download (browsers fetch faces lazily based on observed glyphs).
- Two origins (`fonts.googleapis.com`, `fonts.cdnfonts.com`) each cost
  a DNS lookup + TLS handshake before any byte arrives. `<link
  rel="preconnect">` would amortise both.
- Google Fonts URLs omit `&display=swap`, so the default `auto` policy
  is "block then swap" with a long block period in some browsers.
- `font-display: fallback` on the local `@font-face` declarations is
  the right call for scholarly reading (short block, bounded swap) —
  leave it. We only need `&display=swap` on the remote Google Fonts
  URLs, where the lack of any directive is the actual problem.
- Wide-net selectors that run during selector matching:
  - `[style*="--ltx-..."]` × 5 (substring match)
  - The clearfix `:after/:before` patterns (`ar5iv.css:199-214`)
  - 5-deep `:not()` chain (`ar5iv.css:1498-1503`)

  Realistic impact at document load is small; matters more on dynamic
  theme toggle and on very long papers.

### I. Internationalisation (RTL / multilingual)

- Physical properties everywhere: `margin-left`, `padding-right`,
  `text-align: right`, `border-left`. RTL languages render mirrored
  incorrectly.
- `hyphens: auto` applied (`ar5iv.css:229…`) without `:lang()` partitions.
  Browsers do use the document's `lang` attribute for hyphenation
  dictionaries, but the bigger concrete fix is to *suppress*
  `hyphens: auto` for languages that don't hyphenate (CJK, Thai).
- `text-align: justify; text-justify: inter-word` (`ar5iv.css:228`) is
  designed for word-spaced scripts. CJK justification still works (it
  falls back to inter-character) but `inter-word` is meaningless there;
  scope to `:lang(en), :lang(de), …` or rely on UA defaults under
  `:lang(zh|ja|ko)`.
- Single use of `max-inline-size` (`ar5iv.css:871`) shows the author
  knows the modern syntax — let's lean in.

### J. Math & SVG Theming

- MathML rules are scattered: `mtd` padding (`ar5iv.css:279`), `mtext`
  override (`ar5iv.css:395`), error display (`ar5iv.css:2533`), font-variant
  mapping (`ar5iv.css:2105-2145`), formula-length heuristic
  (`ar5iv.css:2541-2557`). Worth a dedicated `@layer` section.
- `--svg-text-size: 0.82em` (`ar5iv.css:13`) is a real token; rationale
  isn't recorded.
- SVG `foreignObject` colour inheritance workaround
  (`ar5iv.css:42-44, 144-145`) is well-documented and necessary.
- Dark-mode image filter (`brightness(0.8) contrast(1.2)`,
  `ar5iv.css:79`) is global on `<img>`; user-uploaded plots may not want
  this. A `class="ltx_no_dark_filter"` opt-out would be cheap.

### K. Naming, Structure, Dead Code

- Section banners (`/*============*/`) at lines 861, 2061, 2309, 2486, 2492,
  2541, 2563 are useful but inconsistent. Earlier sections lack banners.
- 16 TODOs in production CSS. Some are operationally important
  (`ar5iv.css:702-715`, the long footnote-in-table comment); some are
  stale (`ar5iv.css:505 "TODO: Untested"` predates the `:has()` rules
  that should make it testable).
- Commented-out rules (`ar5iv.css:894, 1204`) should either be deleted or
  guarded behind a token.
- Class names follow LaTeXML's `.ltx_*` convention; **this is correct** and
  must not change. Our own additions (none yet) should stay out of that
  namespace.

### L. Contributor Experience

- The top of `ar5iv.css` jumps straight into `:root` with no orientation
  paragraph explaining the architecture, the `[data-theme]` contract, or
  the `--ltx-*` LaTeXML interface.
- There is no `CONTRIBUTING.md` and no test fixture set; arXiv IDs in
  comments are the test corpus, but reviewing changes requires manually
  rendering each.
- `package.json` is a stub (`v0.8.4`, `main: ar5iv.css`); no `exports`,
  no `style` field, no published types of any kind.

### M. Smaller code-smell findings (added on 2nd-pass review)

These are individually minor; bundled together they signal where the
file would benefit from a one-time tidy-up.

- **DRY: the justified-prose triplet** (`text-align: justify;
  text-justify: inter-word; hyphens: auto`) is duplicated at least
  6 times — at `ar5iv.css:228-229, 516-519, 1121-1124, 1381-1382,
  1984-?, 2302-2305`. Collapsing into a single `:is(…)` rule list (or
  one applied class) would shrink the file and make the
  inter-word/hyphens policy edit-in-one-place.
- **Clearfix at `ar5iv.css:199-214`** uses the pre-flexbox `content: "."`
  + `visibility: hidden` pattern. Replace with a single `display:
  flow-root` on `.ltx_page_header, .ltx_page_footer, .ltx_page_content`.
- **`background: whitesmoke`** at `ar5iv.css:1254` (conversion-report
  panel) uses a named CSS colour rather than a token, so it does not
  respond to theme changes.
- **UPPER_CASE classes** `.ltx_INFO`, `.ltx_WARNING`, `.ltx_ERROR`,
  `.ltx_FATAL` (`ar5iv.css:2497-2517`) break the dominant lowercase
  `.ltx_*` naming convention. Probably mirrors LaTeX's `\INFO`/etc.;
  document the exception so a future contributor doesn't "normalise"
  them.
- **Inert margins on `display: inline`** at `ar5iv.css:1069-1074`:
  `.ltx_title_subparagraph` has `display: inline; margin: 0rem 1rem 0rem
  2rem;`. Vertical margins on inline elements are ignored; only the
  horizontal `1rem`/`2rem` matter. Either change to `inline-block` or
  drop the `0rem` slots.
- **`box-sizing: border-box` set exactly once**, on `.ltx_title_abstract`
  (`ar5iv.css:895`). Either adopt globally in a reset layer or drop the
  lone use.
- **Bibliography hover-highlight has a dead `z-index`** at
  `ar5iv.css:1219-1225`: `.ltx_tag_bibitem ~ * { z-index: 100; }`
  without `position`. `z-index` on a `position: static` element is
  inert. Either add `position: relative` or remove the line.
- **Vendor prefixes are not limited to figure-zoom.** Also at
  `ar5iv.css:1230-1231, 1238-1239` (`-webkit-columns`, `-moz-columns`
  on the index list). The "remove vendor prefixes" chore should cover
  these too.
- **B2 commented-out rule** at `ar5iv.css:2575-2579` is dead code with
  a "best avoided entirely in latexml" comment. Either delete or
  activate. (My earlier dead-code mention listed `:894, :1204` and
  missed this one.)
- **Quote decoration may overflow on narrow viewports.** The blockquote
  `:before` / `:after` pseudo-elements at `ar5iv.css:1273-1305` use
  `left: -0.25rem` / `-0.6rem` to sit outside the parent. On viewports
  where `.ltx_document` is at full `--main-width` with no horizontal
  slack, the decoration paints outside the column; on narrower
  viewports it can clip or overlap. Worth a reflow check at 320 px.
- **`:where()` vs `:is()` distinction** for the Phase 1/4 rewrites:
  `:where()` has **zero specificity**, `:is()` takes the **maximum
  specificity** of its arguments. For "tokens and resets" use
  `:where()`; for "this rule should win against bare class selectors"
  use `:is()`. The plan should be explicit which is intended where.
- **`text-wrap: balance` cap.** Browsers cap `balance` to a small line
  count (Chromium ~6, WebKit ~10). Useful for titles, captions, ToC
  entries — **not** for body paragraphs. Plan to extend it only to
  short headings.

### N. Additional findings (3rd-pass review)

- **`var(--fo_width)` fallback is undefined.** `ar5iv.css:1727, 1741`
  use `var(--ltx-fo-width, var(--fo_width))` — but `--fo_width` (note:
  underscore, not dash) is never declared anywhere in this file. The
  fallback works in practice because `--ltx-fo-width` is always set
  upstream on `foreignObject` (`ar5iv.css:1720`). Either it's a typo
  for `--ltx-fo-width`, dead-fallback code, or a contract with an
  external stylesheet — needs investigation, then either fix or
  document.
- **`& *` broad nesting with `!important`** at `ar5iv.css:1745-1748`:
  `width: inherit !important` applied to *every descendant* of
  `.ltx_foreignobject_content`. Intentional (foreignObject sizing
  cascades through descendants) but the breadth deserves a comment.
- **`text-align: justify` on `white-space: nowrap`** at
  `ar5iv.css:1929-1932`: contradictory — `justify` has no effect when
  the line never wraps. Likely a reflexive copy of the prose-justify
  pattern; remove the `text-align: justify` line.
- **`border-width: thin` keyword** at `ar5iv.css:1941` uses a UA-defined
  value (~1 CSS px), inconsistent with the `0.063rem` hairline used
  elsewhere. Normalise to the upcoming `--border-hairline` token.
- **Structural positional selector** at `ar5iv.css:1910-1913`:
  `.ltx_overlay > span:nth-child(2)` relies on the exact child order
  LaTeXML produces. If the markup shape ever changes, the overlay
  silently breaks. Worth a comment, or a class-based selector if
  LaTeXML can emit one.
- **`align-self: normal`** at `ar5iv.css:1872` is valid but unusual
  (`auto` is the conventional default). Either intentional, in which
  case it deserves a comment, or `auto` was meant.
- **Known-issue, author-acknowledged**: horizontal scroll on Chrome
  large screens for footnotes (`ar5iv.css:549-551` comment) is
  shipped with a flag. Track it explicitly so a glow-up has a chance
  to resolve, not perpetuate it.
- **Transformed-wrappers `!important` cluster** (`ar5iv.css:2007-2054`)
  accounts for ~6 of the 31 `!important`s, but it's **one conditional
  feature flag** ("disable until LaTeXML's transform handling matures")
  not six independent decisions. Treat as a single switch.
- **RFC describes a `--fn-*` extension API that doesn't exist in
  the CSS.** `docs/rfc_latexml_custom_properties.md:88-92` describes
  variables like `--fn-fg-color-to-dark-mode` as the theme-override
  surface, but `ar5iv.css` doesn't define them. Either implement the
  API as written (giving downstream themes a stable surface) or update
  the RFC to match the actual approach (direct override of
  `[data-theme="dark"] [style*="--ltx-fg-color:"]`).
- **`@font-face` declarations lack `unicode-range`** (`ar5iv-fonts.css`).
  Google Fonts URLs already subset at the CDN edge so the impact is
  primarily on the local-fallback path; still a low-risk perf
  opportunity.

---

## 3. Step Plan, By Phase

We deliver in **five phases**, ordered so that low-risk plumbing lands
first and visible-behaviour changes ride on the new foundation.

### Phase 1 — Foundations (no visual change)

> Goal: extract the implicit design system into named tokens, and segment
> the stylesheet so later phases can override safely.

1. **Introduce `@layer` order** at the top of `ar5iv.css`:
   `@layer reset, tokens, base, structure, components, math, fixes,
   themes;` then wrap existing rule groups by section. Note the
   `!important` inversion: `!important` rules in *earlier* layers beat
   `!important` rules in later ones, so `fixes` being last is correct
   for normal rules but means any `!important` declared inside `fixes`
   *loses* to one declared earlier. Document this. Expect this change
   to remove **a minority** of the existing `!important` declarations
   — not those overriding inline `style=""` (no layer beats inline),
   and not the breakpoint-collision footnote ones (same-layer
   conflicts).
2. **Promote the implicit design system to tokens** under `@layer tokens`:
   - Spacing scale: `--space-3xs … --space-3xl` (or numeric `--space-1 … 8`).
   - Type scale: `--font-size-xs … --font-size-2xl`, `--line-height-tight`,
     `--line-height-prose`.
   - Measure / column: keep `--main-width`; add `--measure: 65ch` for
     comparison sites.
   - Border/radius/shadow: `--border-hairline: 0.0625rem`,
     `--radius-sm/md/lg`, `--shadow-pop`.
   - Motion: `--duration-fast/base/slow`, `--ease-out`.
   - Z-index scale: `--z-page, --z-sticky, --z-popover, --z-modal`.
   - Breakpoints (still values, not vars in MQs until we adopt
     `@custom-media`): document the canonical set as named constants in
     comments — `--bp-sm: 46rem; --bp-md: 52rem; --bp-lg: 80rem;
     --bp-xl: 96rem; --bp-2xl: 109rem;`.
3. **Replace `rem` literals** that map to known scale steps; leave
   genuinely-special values (e.g. the `0.063rem` hairline) as the
   `--border-hairline` token. Search-and-confirm, do not blind-replace.
4. **Document the `--ltx-*` contract** at the top of the file with a
   ~10-line block explaining: the five author-colour slots, why we use
   `[style*=…]` selectors, and the OKLCH/HSL inversion strategy with
   actual rationale for the constants (run a contrast study and pick
   defensible values).
5. **Snapshot regression corpus.** Build a tiny script that renders the
   arXiv IDs already referenced in comments and saves screenshots. Use it
   as a perceptual gate for Phases 2-5.

**Exit criteria:** No visual diff on the in-tree reference corpus (43
distinct arXiv IDs are already cited in `ar5iv.css` comments — 39
modern + 4 legacy slash-form; that's our canonical set); token block
documented at top of file; layer order locked in with a comment about
the `!important`-inversion subtlety.

### Phase 2 — Accessibility & UX

1. **Designed focus state.** Add a single `@layer base` rule:
   `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset:
   2px; }` with a `--focus-ring` token chosen to contrast in both
   themes. Override only where the default outline overlaps with our own
   indicator (e.g. inside math, where focus rings on `<mo>` are
   distracting).
2. **Keyboard-accessible footnotes.** Replace the
   `:hover`-only trigger with `:hover, :focus-within`. *Precondition:*
   the footnote mark must be a focusable element in LaTeXML's output;
   confirm this with a sample render before relying on the CSS-only
   path. If LaTeXML emits `<sup><span>` instead of `<sup><a>` or
   `<button>`, file an upstream change as Phase 2.2a.
3. **`prefers-reduced-motion`.** Wrap the figure-zoom transition
   (`ar5iv.css:1662-1666`) and any future motion in
   `@media (prefers-reduced-motion: no-preference) { … }`. Lower
   urgency since the zoom is `:active`-triggered, but still good hygiene.
4. **`prefers-color-scheme` fallback.** Mirror the `[data-theme="dark"]`
   block under `@media (prefers-color-scheme: dark) {
   :root:not([data-theme="light"]) { … } }`. Result: first paint matches
   OS preference; explicit `data-theme` overrides. Note: depends on
   whether ar5iv pages already set `data-theme` at load time via JS —
   if so, this only helps the no-JS / pre-hydration paint.
5. **`prefers-contrast: more`.** Tighten link and footnote-mark
   colours; **fix `--warning-text-color`** (currently ~2.46:1 on white,
   below AA Large 3:1). For `--note-highlight-color`, prefer a thin
   1 px border in `--border-light-color` over darkening the tint —
   the wash is intentionally subtle, but a border gives it a definite
   edge that survives at any luminance.
6. **`forced-colors`.** A small `@media (forced-colors: active)` block
   to map our semantic colours onto system tokens (`LinkText`,
   `VisitedText`, `Mark`, `Canvas`, `CanvasText`).
7. **`:target` styling.** Soft highlight on equations, theorems,
   bibliography entries when navigated to by anchor. Motion-guarded.
8. **`::selection`.** Theme-aware background and foreground.
9. **Audit info / warning / error / fatal colours** for AA on both
   backgrounds. `--warning-text-color: #d09e05` is the known defect;
   re-check `--info-text-color`, `--error-text-color` in dark mode.
10. **Remove vendor-prefixed transitions/transforms**
    (`ar5iv.css:1662-1676`).

**Exit criteria:** Manual keyboard + screen-reader walkthrough on three
reference papers (light and dark) — footnotes openable, ToC navigable,
focus always visible, no motion in reduced-motion mode. Automated tools
(axe, Lighthouse) are useful but won't catch most of these defects.

### Phase 3 — Modern Theming Plumbing

1. **Adopt `light-dark()` for pure-token rules** behind `@supports`.
   Each design token becomes
   `--text-color: light-dark(#292929, #c9d1d9);`. Then on `:root`,
   `color-scheme: light dark;` makes UA UI follow OS preference. To
   keep `[data-theme]` working, **explicitly set `color-scheme` on
   each theme attribute**:
   `:root[data-theme="light"] { color-scheme: light; }`
   `:root[data-theme="dark"]  { color-scheme: dark; }`
   `light-dark()` resolves against the computed `color-scheme`, not
   against `prefers-color-scheme` directly — without these two rules,
   the data-theme override won't change the colours `light-dark()`
   picks.
   This does **not** subsume the author-colour inversion logic (see
   next point).
2. **Keep `oklch(from ...)` for author-colour inversion.** The current
   `@supports (oklch …) {}` / fallback fork is the right shape because
   the operation is "given an arbitrary input colour, transform its
   lightness while preserving hue and chroma" — exactly what relative
   colour syntax does. `color-mix()` can't replicate this. Targeted use
   of `color-mix` is appropriate elsewhere (focus ring derived from
   text colour, hairline border from current text, highlight tint).
   While we're here: **fix the `@supports` probe** to actually test
   the relative-colour syntax —
   `@supports (color: oklch(from white l c h))` — instead of the
   current `oklch(calc(…) c h)` form, which tests a different feature.
3. **Cross-link and complete the constant-derivation doc.** The
   background scale `0.8237` is already justified in
   `docs/rfc_latexml_custom_properties.md:109-110` (it's `1 − 0.1763`,
   the actual OKLCH lightness of `#0d1117`). Add a comment at
   `ar5iv.css:99` pointing to the RFC; extend the RFC with the
   matching derivation for the foreground `0.7` and the HSL fallback's
   `107` / `100` asymmetry. Only re-tune the constants if a contrast
   study against the in-tree corpus shows real defects.
4. **Promote the default author-text dark-mode colour** to a token. The
   black-special-case (`ar5iv.css:150-153`) hardcodes `#c9d1d9` — that
   should reference `--text-color` (or a sibling token), not duplicate
   it. The literal-hex `[style*="--ltx-fg-color:#000000;"]` trigger
   stays as-is; only the *output* needs tokenising.
5. **Validate token extensibility with one additional theme.**
   Either a *sepia* reading theme (a comfort variant) **or** a
   *high-contrast* theme (driven by `prefers-contrast: more`). These
   are different products and should not be conflated. Pick one to
   build first; the choice is a UX call, not a stress test.

### Phase 4 — Layout, Responsive, i18n

1. **Container queries — pilot one component first.** The sidenote
   ladder (`ar5iv.css:567-834`) is the most attractive candidate, but
   the change requires giving some ancestor `container-type:
   inline-size`. The natural ancestor is `.ltx_document`; verify in a
   pilot that adding `container-type` to it has no layout side-effects
   (it usually doesn't, but does make `.ltx_document` a containing
   block for fixed-position descendants). If the pilot is clean, then
   extend to captions and figures. Keep viewport-MQ fallback behind
   `@supports (container-type: inline-size)` for at least one release.
2. **Consolidate breakpoints.** The set in Phase 1 becomes the only
   allowed values. Replace stray 0.01rem-offset edges with a single
   `(min-width: 52rem)` style — overlap-free since we use the same
   value on both sides.
3. **Logical properties — case-by-case, not mechanical.** Most rules do
   want logical (`margin-inline-start`, `padding-block`, `inset-inline`,
   `text-align: start`), but some don't: e.g. an English table's
   right-aligned numeric column should *not* mirror under RTL. Walk the
   file by section, not by global find-and-replace. Underline-style
   `border-bottom` patterns (link decoration, dotted refs) stay
   physical.
4. **Drop `text-justify: inter-word`, don't allowlist.** The default
   `text-justify: auto` is correct per script in modern browsers;
   `inter-word` is meaningful only as a *forced override*. Removing it
   solves the CJK problem without needing a `:lang()` allowlist.
   `hyphens: auto` can stay everywhere — browsers already gate
   hyphenation on the document's `lang` attribute. Add `hyphens: manual`
   under `:lang(zh), :lang(ja), :lang(ko), :lang(th)` only if a real
   document surfaces a problem.
5. **Reflow audit at 320 CSS-px / 400 % zoom (WCAG 2.1 SC 1.4.10).**
   Known suspects:
   - Epigraph rule (`ar5iv.css:1331-1332`): `calc(0.5 *
     var(--main-width))` with two `!important`s overflows on narrow
     viewports. Wrap in `min(100%, …)`.
   - Author-acknowledged Chrome horizontal-scroll on footnotes
     (`ar5iv.css:549-552`).
   - Blockquote `:before`/`:after` decoration painting outside the
     parent (`ar5iv.css:1273-1305`).
   - Wide tables: `overflow-x: auto` at `ar5iv.css:1840` is a
     reasonable last-resort but not a substitute for column-stacking
     at small widths.
6. **`100dvw`** in the absolute-positioned author-block centring
   (`ar5iv.css:457-458`) — eliminates the scrollbar-width offset on
   desktop Windows.

### Phase 5 — Performance & Distribution

1. **Replace the `@import` chain** in `ar5iv-fonts.css`. Two viable
   strategies, pick one:
   - Bootstrap `<link rel="preconnect">` to each font origin and a
     single `<link rel="stylesheet">` per family, with `display=swap`
     on the Google Fonts URLs.
   - Self-host Noto + Latin Modern Math under `dist/fonts/` and
     reference locally — resolves the CDN-blocked-environment scenario
     already acknowledged in `ar5iv-fonts.css:7`. Ship a separate
     `ar5iv-fonts-cdn.css` for users who want the remote variant.
2. **Add `&display=swap`** to remaining Google Fonts URLs.
   `font-display` for the local `@font-face` blocks is currently
   `fallback`; treat this as **a defensible default but worth a
   one-day review** against `swap` (faster first paint, possible
   layout shift) and `optional` (no shift, but body text may stay in
   the system font on first visit). Don't change it without a
   side-by-side comparison.
3. **Re-examine the 5-deep `:not()` chain** (`ar5iv.css:1498-1503`) as a
   refactor candidate once positive layout-container classes are stable.
   Not urgent.
4. **Trim dead code.** Delete the commented-out rules at
   `ar5iv.css:894, 1204` and the unprefix the figure-zoom transitions.
   Resolve or archive each TODO with a status line.
5. **Print stylesheet** (`@media print`):
   - Force light-theme tokens regardless of `[data-theme]`.
   - Reveal `.ltx_note_outer` content inline at the footnote site (or
     collect at section end with counter-driven numbering).
   - `a[href^="http"]::after { content: " (" attr(href) ")"; }` for
     external links; suppress for internal anchors.
   - `break-inside: avoid` on `.ltx_figure`, `.ltx_theorem`,
     `.ltx_table`, `.ltx_listing` (modern equivalent of
     `page-break-inside`).
   - `@page { margin: 2cm; }` (let user-agent pick A4 vs Letter via
     OS dialog).

### Phase 6 — Contributor Experience (rolling)

1. **Top-of-file architecture comment** in `ar5iv.css`: layer order,
   token surface, LaTeXML contract (cross-link
   `docs/rfc_latexml_custom_properties.md`), dark-mode strategy, how
   to add a token, where to put a fix.
2. **CONTRIBUTING.md** with the regression-corpus workflow from Phase 1.
3. **`docs/TOKENS.md`** — hand-curated catalogue of every `:root`
   variable with its purpose, type, and accepted values. Auto-generation
   is a nice-to-have but should not block landing the doc; a small
   script can come later.
4. **`package.json` cleanup**: `exports` map, `style` field,
   `sideEffects: false`, `peerDependencies` (latexml version range
   the theme targets), repository → https URL.
5. **CI**: stylelint with a tuned configuration:
   - Discourage new `!important` (warning rather than error;
     adjacent-comment enforcement is plugin territory and not worth
     the integration cost initially).
   - Forbid new bare `rem` literals that map to an existing scale
     step (custom rule based on the token table).
   - Steer new physical-direction properties (`margin-left/right`)
     toward logical equivalents — warning, with an allowlist for the
     rules where physical is genuinely correct.

### Phase 0 — One-line chores (do anytime)

These are small, independent fixes that don't need the phased rollout.
Land them as a single housekeeping PR whenever convenient.

- Fix author-name typo in `package.json` (`Gienv` → `Ginev`).
- Replace `opacity: 100` with `opacity: 1` throughout
  (`ar5iv.css:541, 602, 616, 633, 642, 664, 677`, …).
- Delete vendor-prefixed `-webkit-/-moz-/-ms-/-o-transition`,
  `-transform` (`ar5iv.css:1662-1676`), **and** `-webkit-columns` /
  `-moz-columns` (`ar5iv.css:1230-1231, 1238-1239`).
- Remove the dead `z-index: 100` at `ar5iv.css:1224` (no `position`,
  so it does nothing) — or add `position: relative` if the original
  intent was a stacking-context highlight.
- Delete or activate the B2 commented-out rule
  (`ar5iv.css:2575-2579`).
- Cross-link `docs/rfc_latexml_custom_properties.md` from the top of
  `ar5iv.css`.

---

## 4. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `@layer` adoption changes specificity for users who hot-patch ar5iv.css | medium | document; only re-layer rules that currently fight via `!important` |
| `light-dark()` shipping without `@supports` breaks Safari < 17.5 | low (rapidly improving) | always behind `@supports` |
| Container query refactor mis-classifies in embedded iframes | medium | keep viewport-MQ fallback for one full release |
| Logical-property rewrite mirrors a layout we *want* physical | medium | manual review per file section; visual diffs against the corpus |
| Self-hosting fonts increases bundle size / hosting cost | low | offer both bundled and CDN ar5iv-fonts variants |
| Tokenisation merges colours that are intentionally distinct | low | start with families we know are aliases (`--email-link-color = --note-mark-color = --index-ref-color`) |

---

## 5. Progress Log

> Append-only. Date in ISO-8601, one line per substantive change. Link to PR
> or commit when available. Phase numbers reference §3.

- **2026-05-13** — Initial audit drafted. Senior-designer pass over
  `ar5iv.css` (2,590 LoC) and `ar5iv-fonts.css` (72 LoC). 12 categories
  catalogued, 6-phase plan recorded. No code changes yet.
- **2026-05-13** — Critical re-read of the audit. Corrected several
  counts (`:has()` 14×, root vars 23, z-index 4 distinct values,
  longest `:not()` chain 5), corrected the figure-zoom trigger
  (`:active`, not `:hover`), withdrew the overreaching claim that
  `color-mix()` could replace the OKLCH inversion fork, sharpened the
  warning-colour contrast figure to ~2.46:1, separated sepia from
  high-contrast as distinct themes, replaced the
  axe/Lighthouse exit criteria with a manual a11y walkthrough,
  added a Phase 0 of one-line chores.
- **2026-05-13** — Second analytical pass. Corrected counts (corpus is
  43 IDs not "~30"; `@supports` is one paired feature gate, not "2×").
  Diagnosed that the `@supports` probe tests `oklch(calc())`, not the
  `oklch(from …)` relative-colour syntax actually in use. Withdrew the
  quantified "@layer eliminates ~half the `!important`" claim (inline
  styles outrank all layers; same-cascade conflicts aren't helped by
  layering); replaced with a more honest "minority". Spelled out the
  `!important`-cross-layer inversion. Added the `color-scheme` rules
  that `light-dark()` needs to honour `data-theme`. Replaced the
  "mechanical logical-property rewrite" plan with a section-by-section
  walk. Replaced the `:lang()` allowlist plan for justification with
  "just drop `text-justify: inter-word`". Added §M with 11 smaller
  code-smell findings missed on the first two passes (justified-prose
  triplet duplicated 6×; pre-flow-root clearfix; `background:
  whitesmoke`; UPPER_CASE class naming; inert margins on inline
  subparagraph; lone `box-sizing`; dead bibliography `z-index`; extra
  vendor prefixes on `-*-columns`; commented-out B2 rule;
  quote-decoration overflow risk; `:where()`/`:is()` specificity
  distinction; `text-wrap: balance` line-count cap).
- **2026-05-13** — Third analytical pass.
  **Largest correction:** the OKLCH inversion constants are *not*
  undocumented — `docs/rfc_latexml_custom_properties.md:109-110`
  derives `0.8237` from the OKLCH lightness of `#0d1117`. The
  outstanding gap is the *foreground* `0.7` scale and HSL `107`/`100`
  asymmetry, not the constants overall. Reframed Phase 3.3 from
  "justify the constants" to "cross-link the existing RFC and extend
  it for fg + HSL".
  **Counts recorrected:** CSS nesting is **12×** (not 2× as previously
  claimed), spread across foreignObject (`:1735-1763`), listing
  (`:1946`), and list-item (`:2247`) blocks.
  **Recomputed:** `--note-highlight-color` contrast is ~1.03:1 (not
  ~1.05).
  **Reframed:** "Modern CSS adopted selectively" → "thoughtfully, with
  categorical gaps" — the file uses `:has()`, nesting,
  `oklch(from)`, `text-wrap: balance`, `white-space: break-spaces`,
  `clamp/min/max` — the absences (`@layer`, `@container`,
  `light-dark`, logical properties) are categorical, not
  quantitative.
  **Withdrew overconfidence:** `font-display: fallback` is now flagged
  for one-day review (vs `swap`/`optional`) rather than locked in.
  **Added §N** with 10 newly-found findings: undefined `--fo_width`
  fallback (`:1727, 1741`); broad `& *` `!important` in foreignObject
  (`:1745`); contradictory `text-align: justify` + `white-space:
  nowrap` on listings (`:1929`); `border-width: thin` keyword
  inconsistency (`:1941`); brittle `:nth-child(2)` overlay selector
  (`:1910`); unusual `align-self: normal` (`:1872`); the
  author-flagged Chrome footnote scroll (`:549-552`); the transformed-
  wrappers `!important` cluster as one switch not six (`:2007-2054`);
  the RFC's `--fn-*` API that was never implemented; missing
  `unicode-range` in `@font-face` declarations.
  **Plan tightening:** reflow audit now names four specific suspects
  (not just the epigraph); contrast plan commits to a border over a
  darker tint for the highlight; stylelint plan is realistic about
  what's worth automating.
- _(next)_ — Phase 1.1: introduce `@layer` order; lock in the in-tree
  arXiv-ID regression corpus.
