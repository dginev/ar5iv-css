# GLOWUP_WISDOM

> Append-only record of interesting findings, decisions, and surprises
> uncovered while refactoring `css/ar5iv.css`. Companion to the living
> `GLOWUP_PROGRESS.md` and the frozen `GLOWUP_AUDIT_START.md`.

---

## The OKLCH inversion constants are derived from the theme background

`ar5iv.css:99-142` applies `oklch(from <author-colour> calc(1 - 0.8237 * l) c h)`
to background colours in dark mode. The `0.8237` is documented (briefly)
in `docs/rfc_latexml_custom_properties.md:109-110`:

> *"The current ar5iv dark mode background has OKLCH lightness 0.1763,
> so we could want that as our 'darkest' bound."*

i.e. `0.8237 = 1 − 0.1763`, where `0.1763 = oklch(L) of #0d1117`. The
formula maps input lightness `l ∈ [0, 1]` to `[0.1763, 1]` — every
inverted background lives between the dark-mode background and white.

What is **still** unexplained:

- The foreground scale `0.7` (maps fg into `[0.3, 1]`) — a separate
  design choice. Likely "keep coloured author text from washing out
  to pure white", but no derivation recorded.
- The HSL fallback uses `100 - l` for foreground but `107 - l` for
  background (clamped). Probably a similar bg-lightness-offset
  argument transposed into the HSL space, but undocumented.

When we touch this code in Phase 3, extend the RFC to cover these two
choices too.

---

## opacity: 100 is harmless but pervasive

Ten occurrences of `opacity: 100` across `ar5iv.css`. CSS clamps opacity
to `[0, 1]`, so `100` resolved to `1` everywhere — the file was
correct by accident. Mass-replaced to `opacity: 1`.

---

## The figure-zoom trigger is :active, not :hover

The code-comment said "zoom figure image on hover", but the actual
selector at `ar5iv.css:1664-1666` is `:active`. So the feature is a
tap-and-hold / click-and-hold magnifier, not an ambient hover
animation. This changes:

- The accessibility argument: a `:active` zoom is user-initiated, so
  `prefers-reduced-motion` is good hygiene but not acute.
- The CSS: `transition: all 0.2s` was overkill; only `transform` is
  ever animated. Narrowed to `transition: transform 0.2s ease`.
- The comment, now corrected.

---

## Vendor prefixes were redundant in 2026

`-webkit-`/`-moz-`/`-ms-`/`-o-` prefixes on `transition`, `transform`,
and `columns` haven't been required by any browser shipped in years.
Removed without compatibility loss: nine lines of CSS gone from
`ar5iv.css` for zero behavioural change.

---

## A dead z-index, and why it survived

`ar5iv.css:1224` (pre-edit) had `z-index: 100` on `.ltx_tag_bibitem ~ *:hover`
— but the elements are `position: static`, so `z-index` was inert.
This is the kind of line that sits in a file forever because it doesn't
do anything visible. Removed.

---

## Phase 1: introducing the token layer without moving any pixels

The interesting tension in Phase 1 was *not* the token names — it was
how to introduce a layered cascade architecture **without** changing
the priority of any existing rule.

Approach taken:

```css
@layer reset, tokens, base, structure, components, math, fixes;
@import url("./ar5iv/tokens.css") layer(tokens);
/* ... everything else stays un-layered ... */
```

Un-layered rules participate in the **implicit final layer**, which
sits above every named layer. So existing rules keep their relative
priorities, and only the tokens module is layered. Later phases can
opt in to a named layer one rule-group at a time.

### The `!important` cross-layer inversion

Worth re-stating because it consistently catches people: with normal
declarations, **later layers beat earlier layers**. With `!important`,
**earlier layers beat later layers** (and un-layered `!important`
beats all named-layer `!important`s). So a fix that wants to win over
*everything* is best placed un-layered with `!important`, not inside
the `fixes` layer.

### Tokens that paid for themselves immediately

- `--border-hairline: 0.063rem` — substituted at 22 sites
- `--border-double: 0.188rem` — substituted at 5 sites
- `--z-popover: 100`, `--z-page: 0`, `--z-below: -1` — substituted at 6 sites
- `--duration-fast: 0.2s`, `--ease-out: ease` — substituted at the
  figure-zoom transition

Net cost: ~75 lines of token definitions (with documentation). Net
gain: one variable to tune the entire visual hairline, with the same
applies for double-rules, popover stacking, and tap-zoom timing.

### Tokens that exist for future consumers

- `--focus-ring`, `--focus-ring-width`, `--focus-ring-offset` — wired
  up but not yet consumed; Phase 2 will land the `:focus-visible` rule.

### Tokens NOT introduced (deliberately)

The audit recommended spacing, type, and breakpoint scales. They are
deliberately deferred:

- **Spacing scale**: applying it retroactively requires *choosing*
  which existing `rem` literal each rule "really meant" — a perceptual
  call that can't be made safely without a visual-regression corpus.
- **Type scale**: same issue — most font-size values cluster around
  six values but the mapping is non-obvious.
- **Breakpoint scale**: meaningful only once container queries land
  (Phase 4), since `@media` conditions can't reference custom
  properties.

The pattern here: introduce tokens when the substitution is
**mechanical and lossless**, not when it requires re-deciding what
the original code meant.

---

## Phase 2: accessibility as additive modules

Landed in `css/ar5iv/a11y.css` — a 150-line module that introduces a
designed focus state, keyboard-accessible footnote popovers, a
`prefers-reduced-motion` guard, `:target` highlight, `::selection`,
and a minimal `forced-colors` mapping. Every rule in the module is
*additive* — no existing rule was modified.

### Why the keyboard footnote path needed a caveat

The existing popover trigger is `:hover` / `:active`. Adding
`:focus-within` mirrors that for tab-key users. But the CSS half only
works if LaTeXML's markup makes the footnote mark a focusable element
(an `<a>` or `<button>`, not a `<span>`). The CSS is now staged; the
upstream check is tracked in GLOWUP_PROGRESS.md as Phase 2.2a.

### Why three Phase-2 items were deferred to Phase 3

- `prefers-color-scheme`: implementing it now would mean duplicating
  the entire `[data-theme="dark"]` colour block inside a media query.
  Phase 3's `light-dark()` solves that without duplication.
- `prefers-contrast: more`: the contrast study (re-tuning warning,
  info, link colours) needs to happen before any rule can confidently
  tighten contrast. Same machinery as the dark-mode constant
  rationalisation.
- `--warning-text-color` fix: same — it's a colour-token decision,
  not a structural one.

The lesson: a11y items that are **structural** (selectors,
media queries, keyframes) shipped trivially as an additive module;
a11y items that are **colour-driven** belong with the colour-system
work in Phase 3.

### Why I used `:focus-visible` not `:focus`

`:focus-visible` is the modern signal "this element gained focus via
keyboard / accessibility tooling". A mouse click on a button fires
`:focus` but not `:focus-visible`, so pointer users don't see rings
where they didn't ask for them. The trade-off: very old browsers (none
shipping today) silently skip the rule and fall back to UA defaults.

### Why `:target` got an animation and not just a static highlight

A static `:target` highlight competes with the existing dotted-link
decoration and can read as a permanent visual change. A 1.2-second
pulse that ends in `transparent` gives a clear "you landed here"
signal without ongoing noise — except under reduced-motion, where
the static highlight is what we want.

### Why forced-colors was minimal

Windows High Contrast already overrides most colours; the role of the
author CSS is to *opt in to semantic mapping* (`LinkText`,
`VisitedText`, `Mark`) where the heuristic would otherwise guess
wrong. The 12-line block does only that. I initially included a
made-up `.ltx_note_highlight` class — removed once verified it didn't
exist anywhere.

---

## Phase 3: light-dark() and the gating asymmetry

### What `light-dark()` is actually for

`light-dark(L, D)` returns `L` or `D` based on the resolved
`color-scheme` of the element. To honour both OS preference and an
explicit `data-theme` attribute:

```css
:root { color-scheme: light dark; }
:root[data-theme="light"] { color-scheme: only light; }
:root[data-theme="dark"]  { color-scheme: only dark; }
```

After that, every theme-aware token becomes
`--name: light-dark(<light-value>, <dark-value>);`. The previous
`[data-theme="dark"] { --background-color: …; … }` block (~15 lines)
disappears.

### What `light-dark()` is NOT for

`light-dark()` is a value-level construct. It works inside
`color: …`, `background-color: …`, `--token: …` — anywhere a colour
value is expected. It does **not** help with:

- `filter: brightness(0.8) contrast(1.2)` — not a colour value.
- Padding tweaks like `svg.ltx_picture { padding: 0.33rem; }` —
  geometric, not chromatic.
- Author-supplied colour transforms via `oklch(from var(--ltx-fg-color) …)`
  — the transform applies a function to an arbitrary input; you can't
  express "do this transform only in dark mode" inside the value
  itself.

For all those, the gate remains a *selector*: `[data-theme="dark"] X`
or `@media (prefers-color-scheme: dark) { … }`.

### The gating asymmetry I shipped

- **Token-level colours**: switch on both OS preference *and*
  explicit data-theme (via `light-dark()` + `color-scheme`).
- **Image filter & SVG padding**: switch on both (mirrored under
  `@media (prefers-color-scheme: dark)`).
- **OKLCH author-colour inversion**: switches on **explicit
  `data-theme="dark"` only**. The OS-preference mirror would mean
  duplicating 12 rules × 2 branches = ~24 lines of selector-only
  copy-paste. Punted to a follow-up.

The practical impact: a user with OS=dark and no JS-set `data-theme`
sees dark tokens and a dark-friendly image filter but author-supplied
colours rendered as if for a light background. Arxiv viewers usually
have a JS theme-toggle layer that sets `data-theme` before first
paint, so the window is brief — but it's a real limitation worth
documenting.

### The OKLCH @supports probe was lying

Original gate: `@supports (color: oklch(calc(1 - 0.5) 0.1 250))`.
That tests whether `oklch()` accepts `calc()` in its argument list —
a different feature from what the body of the rule actually uses,
which is **relative colour syntax**: `oklch(from <input> …)`.

The two shipped in the same browser versions, so the lie was
harmless in practice. Now: `@supports (color: oklch(from white l c h))`,
which directly probes the feature we use.

### Constants now traceable

- Background scale `0.8237` = `1 − 0.1763`, where 0.1763 is the OKLCH
  lightness of `#0d1117` — documented in the RFC, cross-linked from
  the section banner.
- Foreground scale `0.7`: design choice (caps inverted fg at L=0.3),
  documented now via the inline comment.
- HSL fallback's `100`/`107` asymmetry: still inherited but recorded
  for follow-up.

### The black-on-black "stuck colour" got a token

`[data-theme="dark"] [style*="--ltx-fg-color:#000000;"]` previously
hard-coded `#c9d1d9` in its body. Promoted to
`--text-color-author-black-dark` so it lives in the token file with
the other colour decisions and can move atomically if the dark text
colour ever changes.

### prefers-contrast: more

Three-token override (text, link, border at pure black/white +
bumped warning/note-mark saturations). Light, additive — no
behavioural change for users not requesting more contrast.

---

## §M / §N: the cleanup that paid back the most lines

A bundled tidy of the code-smell findings shrank `ar5iv.css` more than
any single architectural change, with zero behaviour cost.

### Wins

- **6 × `text-justify: inter-word` → removed.** Default
  `text-justify: auto` is correct per script in modern browsers;
  `inter-word` was only meaningful as a *forced* override and was
  actively hostile to CJK content. Net 6 lines, plus an i18n
  improvement that doesn't require any `:lang()` allowlist.
- **Pre-2017 clearfix pattern → `display: flow-root`.** A 17-line
  pseudo-element clearfix collapsed to a 3-line rule. The intent
  ("contain the floats") is now expressed by the property name.
- **`background: whitesmoke` → `--surface-subtle`** (`light-dark(whitesmoke,
  #1a1f29)`). The conversion-report panel now themes.
- **Transformed-wrappers `!important` cluster** got a single banner
  comment reframing 50 lines as **one feature flag**, not 6 to 12
  independent decisions. When LaTeXML's transform handling matures,
  this whole block can be deleted in one cut.

### Comments instead of refactors

Some things are correct as written but were nonobvious without an
explanation. Added inline comments rather than rewriting:

- `.ltx_overlay > span:nth-child(2)` — positional-selector contract
  with LaTeXML's emission shape.
- `& * { width: inherit !important; }` inside foreignObject — the
  breadth is intentional; LaTeXML injects per-element inline widths
  that we need to defeat to make foreignObject sizing inherit.
- `var(--ltx-fo-width, var(--fo_width))` — the underscore-named
  fallback is a legacy contract with an upstream stylesheet, kept for
  compatibility.
- `.ltx_INFO` / `.ltx_WARNING` / `.ltx_ERROR` / `.ltx_FATAL` —
  UPPER_CASE is a deliberate mirror of LaTeX macro names, not a
  naming bug.

### Things dropped because they did nothing

- `box-sizing: border-box` set on a single class (`.ltx_title_abstract`)
  with no consumers. Deleted.
- `align-self: normal` on `.ltx_minipage` (a non-flex item, so the
  property was inert anyway). Deleted.

### What stayed
- Inert `margin: 0rem … 0rem …` on `display: inline` for
  `.ltx_title_subparagraph`: stylistic only, no benefit to rewriting.
- The quote-decoration absolute-positioned `:before/:after`: defer to
  the Phase 4 reflow audit, since the fix depends on layout context.

### Lessons

The biggest pile of "ought-to-fix"s in any mature codebase isn't the
big architectural debts — it's the dozens of small lines that were
written before a better pattern shipped (`flow-root`, `light-dark`,
modern `:focus-visible`). Cleaning them up needs no design discussion;
it just needs someone to look. The bundled pass took less time than
any individual phase.

---

## Phase 4: breakpoint discipline via range syntax

The audit complained about 0.01rem-offset breakpoint pairs
(`46.01rem`, `51.99rem`, `95.99rem`, `108.99rem`). The trick exists
because legacy `min-width: 46rem` and `max-width: 46rem` BOTH fire at
exactly 46rem — same-pixel overlap. The 0.01rem dance avoids it.

Modern range syntax solves the problem natively:

```css
@media (width <= 46rem) { ... }       /* up to and including 46 */
@media (46rem < width <= 52rem) { ... } /* above 46, up to 52 */
```

`<=` / `<` / `>=` / `>` give precise mutual exclusion. After the sweep,
all 15 media queries are range-syntax with this discipline:

- `<=` for "up to and including" (upper edge of a band)
- `<` for the lower-side of a *paired* boundary (to keep mutual exclusion)
- `>=` for the lower edge of a paired band
- `>` for "strictly above" / matches the previous `min-width: X+0.01`

### Why the boundary direction matters

When making the pre-existing 95.99 / 96 split into a single 96
threshold, the wrong direction matters:

- `(width <= 96rem)` + `(width >= 96rem)` overlap at 96.
- `(width < 96rem)`  + `(width >= 96rem)` are mutually exclusive.

The footnote popover UX block sits on either side of this boundary,
with two completely different layouts. Overlap at the exact pixel
would mean both layouts cascading. Discipline: pick one inclusive
side, document, stick to it.

### Reflow tuning

- The epigraph (`blockquote.ltx_epigraph`) now wraps its
  `calc(0.5 * --main-width)` width and `calc(0.45 * --main-width)`
  margin in `min(100%, …)` so it stops overflowing at <320 px.
- The absolutely-positioned author block now uses `100dvw` instead of
  `100vw`, eliminating the desktop-scrollbar sub-pixel offset.

### Deferred from Phase 4

- Container queries pilot. Adding `container-type: inline-size` to
  `.ltx_document` would let sidenote layout depend on column width
  rather than viewport, but the change has downstream implications
  (`.ltx_document` becomes a containing block for fixed descendants)
  that warrant a focused, testable pilot — not a sweep.
- Logical-property sweep. The pessimistic "section-by-section walk"
  rule from the audit holds: `text-align: right` on numeric table
  columns doesn't want to mirror under RTL, so this isn't safe as a
  global find/replace.
- Wide-table column-stacking at narrow viewports. The current
  `overflow-x: auto` is reasonable as a last resort; a "stack
  columns into rows" pattern needs row-level semantics that
  LaTeXML's emitted tables don't expose cleanly.

---

## Phase 5: print, and the surprisingly large surface it covered

The print stylesheet started life as "five rules in a `@media print`
block". It ended up at ~100 lines because *every* screen-only
assumption in ar5iv needed an explicit override:

- Theme tokens (force light, regardless of data-theme / OS pref)
- Background colours (transparent on paper)
- Sidenote popovers (must inline, not float)
- External-link URLs (visible)
- Internal anchors (silent, otherwise body text fills with `#section.3.2`)
- Animations and transitions (off on paper)
- `break-inside: avoid` on the "atomic" blocks
- `break-after: avoid` on headings (no orphan titles)
- `@page` margin

This is unsurprising in retrospect: a screen theme is full of UX
choices that paper doesn't care about, and most of those choices need
explicit undoing. The lesson: estimate print-stylesheet effort as
"reproduce the layout from scratch, hide everything that doesn't
help on paper", not "tweak a few defaults".

### Font display

The Google Fonts `@import` URLs gained `&display=swap` — three
character changes that move first paint from "browser blocks while
the font loads" to "browser shows the fallback immediately, swaps in
when ready". For body text where the fallback (Noto fallback /
system serif) is already pleasant, swap is the right default.

The local `@font-face` declarations were left at `font-display:
fallback` (short block, bounded swap window). This is the most
careful choice for a scholarly reading theme; `swap` would risk a
late, jarring re-layout if the local fonts arrived after the page
had been read past the first viewport.

---

## Future work — items deliberately deferred

These items appeared in the original audit but were deferred during
the glow-up because each needs something we don't have yet (a visual
regression harness, an upstream LaTeXML change, a focused experiment,
or a build pipeline).

### Needs a visual-regression pipeline

- **Spacing / type / breakpoint scales** as design tokens. Adding the
  *names* costs little, but choosing which existing `rem` literal
  each rule "really meant" requires perceptual judgement we can't
  verify without rendered screenshots of the in-tree corpus (43 arXiv
  IDs already cited in `ar5iv.css` comments).
- **Container-query pilot** for sidenotes. Adding
  `container-type: inline-size` to `.ltx_document` has containing-
  block implications for any fixed/absolute descendants — needs a
  test harness that exercises the corpus's edge cases.
- **Logical-property sweep**. `text-align: right` on numeric table
  columns in English should *not* mirror under RTL — every physical-
  property site needs a per-rule judgement, not a global replace.
- **Reflow suspects at 320 CSS-px / 400 % zoom**: Chrome footnote
  horizontal scroll (author-acknowledged at `ar5iv.css:549-552`),
  blockquote decoration overflow, wide-table column stacking.

### Needs an upstream LaTeXML change

- **Focusable footnote marks (Phase 2.2a).** The CSS opens popovers on
  `:focus-within`; the precondition is that LaTeXML emits an
  `<a>` or `<button>` at the mark site (not a bare `<span>`). File an
  upstream PR.
- **`--fn-*` extension API mismatch** between the RFC at
  `docs/rfc_latexml_custom_properties.md:88-92` and what ar5iv.css
  actually exposes. Either implement the API as the RFC describes or
  update the RFC.

### Needs an HTML / build change

- **Replace the `@import` font chain** with `<link rel="preconnect">`
  + `<link rel="stylesheet">` in the host HTML, *or* self-host Noto
  + Latin Modern Math under `dist/fonts/`. Both are out of CSS-only
  scope.
- **CI / stylelint configuration**. Discourage new `!important`,
  forbid new bare scale-eligible `rem` literals, steer new
  `margin-left/right` to logical equivalents.

### Pure future-CSS opportunities

- **OS-pref mirror for OKLCH/HSL author-colour inversion**. Today
  inversion is gated by `[data-theme="dark"]` only; an OS-dark user
  without a JS-set data-theme sees dark tokens + un-inverted author
  colours. Fixing this needs ~24 lines of selector-only duplication;
  best done when a cleaner factoring (`@scope`?) becomes available.
- **5-deep `:not()` chain** at `ar5iv.css:1498-1503`. Inverting to a
  positive-class set requires LaTeXML to mark layout-managed
  containers — refactor candidate, not a bug.
- **Sepia or high-contrast theme** as a third `data-theme` value.
  Product decision, not infrastructure.
- **`@font-face` `unicode-range` subsetting**. Modest impact since
  Google Fonts already CDN-subsets; would help the local-fallback
  path.

---

## Phase 0 scoreboard

| Item | Result |
|---|---|
| `package.json` author typo `Gienv` → `Ginev` | fixed |
| `opacity: 100` × 10 → `opacity: 1` | fixed |
| Vendor prefixes (figure zoom + index columns) | deleted (9 lines) |
| Dead `z-index: 100` at bibitem hover | deleted |
| Commented-out B2 rule | replaced with one-line "removed in favour of …" |
| Cross-link to RFC at top of `ar5iv.css` | added (15-line orientation comment) |
| `text-align: justify` on `.ltx_listingline` (`white-space: nowrap`) | removed |
