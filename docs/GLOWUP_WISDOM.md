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

---

## After-the-fact correction: `flow-root` was not "zero behaviour cost"

The §M / §N cleanup section above claims the clearfix → `display: flow-root`
swap on `.ltx_page_content` was "zero behaviour cost". That was wrong, and
it took a careful reader to spot it: the document title sat ~2rem (≈ 32 px)
lower after the swap than before.

### Why the title moved

The pre-glowup clearfix had `:after` only on `.ltx_page_content` — **no
`:before`**. So `.ltx_document` was still the first in-flow child of
`.ltx_page_content`, and the parent-first-child margin-collapse rule
applied:

- `.ltx_page_content { margin: 4rem 1rem }` — top margin 4rem.
- `.ltx_document { margin-top: 2rem }` — collapsed into the parent's 4rem.
- Effective gap: `max(4rem, 2rem) = 4rem`.

`display: flow-root` establishes a new block-formatting context, and a BFC
**suppresses** parent-first-child margin-collapse. Post-swap:

- `.ltx_document`'s 2rem stands on its own *inside* `.ltx_page_content`.
- Effective gap: `4rem + 2rem = 6rem`.

The clearfix and the BFC accomplish the **same** float-containment job,
but only the BFC blocks the margin collapse. The two are interchangeable
*as float containers*; they are NOT interchangeable *as
margin-collapse barriers*. The original glow-up did not check for the
second property, so the title-position shift slipped through.

### The fix (Option 1 of four considered)

Dropped `margin-top: 2rem` from `.ltx_document`. Spacing now lives in one
place (`.ltx_page_content`'s outer margin) instead of being split across
two rules that only coincidentally summed via margin-collapse. Same
visual result as before the glow-up.

### The deeper lesson

Two CSS rules can have the **same primary effect** and **different
side effects**. "Replacing the clearfix" with `flow-root` was a *partial*
modernisation: the modern form was strictly stronger (BFC + float
containment) than the old form (clearfix only). When swapping a legacy
pattern for a modern equivalent, ask: *what else did the old pattern not
do that the new one does?* For BFC-establishing replacements, the
parent-first-child margin-collapse question is the most common one
worth checking.

### Coda: a second phantom margin caught later, and a wrong first fix

The first correction dropped `.ltx_document { margin-top: 2rem }`.
A reader inspecting the same demo afterward noticed the title was
*still* sitting about a rem too low. The mechanism was identical
but one level deeper:

`.ltx_title.ltx_title_document` had `margin-top: 1rem`. Pre-flow-root,
this collapsed into `.ltx_document`'s 2 rem (both inside a non-BFC
chain), then collapsed again into `.ltx_page_content`'s 4 rem.
The 1 rem was a *phantom* — declared but never visually applied.

Post-flow-root, the BFC blocks the outward collapse. The title's 1
rem now stands on its own, adding 1 rem to the visible page-top
gap.

**My first fix was wrong**. I deleted the `margin-top: 1rem`
declaration entirely. That made things *worse*, because it exposed
Chrome's UA default `h1 { margin-block-start: 0.83em }`. With the
element's font-size at 1.7rem, the UA margin resolves to ~1.4 rem —
*more* than the 1 rem the author rule was setting.

So the author rule was *partially* masking the UA default all
along. The correct fix is to set the margin explicitly to 0
(`margin-top: 0`), not to omit it. Omitting cedes the value to the
cascade, which lands on the UA default we didn't want.

**Reminder for future BFC-introducing changes**: when wrapping a
container with `flow-root` (or `overflow: clip`, or any other BFC
trigger), audit *every* margin on the first-in-flow-descendant
chain — not just the parent's first child. Phantom margins are
common where authors expected (or unconsciously relied on) margin
collapse cascading through several non-BFC levels.

**Reminder for cleanups**: deleting a rule is not the same as
setting its value to the "natural" default. The natural default
in CSS is *whatever the UA stylesheet says* — and for elements
with intrinsic UA styling (`h1`–`h6`, `p`, `ul`, etc.), that's a
non-zero value. When you want zero, write zero.

### What to do about regression-source patterns like this

Phase 6 (the render-corpus harness in GLOWUP_PROGRESS.md) would have
caught this immediately — the title would have moved 32 px and the diff
would have flagged it. This is exactly the class of regression that
mechanical pixel-diff exists to catch and that human review reliably
misses, because the layout still "looks fine" — just slightly different.

---

## YAGNI tripped me up on `.ltx_sr_only`

While landing the iteration-2 a11y batch I added a `.ltx_sr_only`
utility — the standard "visually hidden, still announced to AT"
pattern. The justification I gave: "cheap, ~10 lines, unblocks
future use".

The user immediately asked: *if LaTeXML never emits it, why ship it?*
Correct critique. Neither LaTeXML's emission nor our own CSS uses
`.ltx_sr_only`. Without a consumer, it's literal dead code that future
contributors would copy/refactor without understanding what calls it.

Removed.

The `[hidden]` reset that landed in the same patch is *not* the same
case: `hidden` is a universal HTML attribute that any external actor
(JS theme toggle, browser extension, assistive overlay) might land on
a `.ltx_*` element, where our `display:` rules would otherwise defeat
the UA default. That's defensive against a real-world possibility, not
a speculative future consumer.

### The distinction worth keeping

| Pattern | Triggering source | Verdict |
|---|---|---|
| `.ltx_sr_only` | Only ever emitted by *us* writing CSS that consumes it | Ship when there's a consumer, not before |
| `[hidden]` reset | A universal HTML attribute, set by anyone | Defensive shipping is justified |

CSS utilities for hypothetical future contributors are speculation.
CSS defenses against universal mechanisms are precaution. Different
things. The system prompt's rule "don't add abstractions beyond what
the task requires" applies even when the abstraction is cheap.

---

## `--fn-*` API landed, with a `light-dark(var(), var())` near-miss

The iteration-2 implementation of the RFC's `--fn-*` author-colour
override surface (`css/ar5iv/dark-mode.css`) almost shipped using
`light-dark(var(--ltx-fg-color), var(--fn-fg-color-to-dark-mode))` as
the application rule. The pattern would have eliminated the
`data-theme="dark"` + `@media (prefers-color-scheme: dark)` duplication
in a single elegant line.

The user flagged it: *"browsers do not support var functions for color
mixing if I remember correctly. We were waiting on a new CSS feature
for that — CSS @function definitions"*.

What the spec says: `light-dark()` accepts any `<color>` for either
argument, including `var()` references that resolve to a `<color>`.
Per spec, the pattern should work.

What the codebase ships: `oklch(from var(--ltx-fg-color) ...)` —
i.e. `var()` inside *relative-color syntax*. That works in production
(it's the existing dark-mode rule). But `light-dark(var(), var())` is
a *different* untested pattern, and the codebase has no other instance
of `light-dark()` taking variable arguments — the existing uses in
`tokens.css` are all `light-dark(LITERAL, LITERAL)`.

The CSS WG's `@function` proposal — what the user was remembering — is
about *user-defined* CSS functions. We can't write
`--invert(--input) { result: oklch(from var(--input) ...); }` and call
it like a function. That's separate from variable substitution into
`light-dark()`.

### What we shipped

Kept the proven pattern: `--fn-*` is defined unconditionally per
matching element (using the existing-and-shipping
`oklch(from var(...) ...)`), and the application is two explicit
gated blocks (`[data-theme="dark"]` plus `@media (prefers-color-scheme:
dark) { :root:not([data-theme="light"]) ... }`). Some duplication of
the application rules, but every part of the path is something the
existing code already exercises.

### General lesson

When you're tempted by a clever spec-allowed pattern that the rest of
your codebase doesn't currently exercise, weigh: how much cleanup does
it save? how confident are you it works in your target browsers? if
those aren't very confident, the safer pattern with mild duplication
is the right call. The clever pattern can land later if its
correctness is established by separate work.

---

## Iteration 2 — final tally

After three audit passes, three critique cycles, a YAGNI re-check that
deferred most of the originally-planned items, and a methodical walk
through the surviving work, iteration 2 closed with these shipped:

**Theming / dark mode (`css/ar5iv/dark-mode.css`, extracted as its own
sub-file):**

- `--fn-{fg,bg,border,fill,stroke}-color-to-dark-mode` public override
  surface. Closes the RFC/code drift documented in iteration 1.
  Downstream themes redefine any of the five tokens on the matching
  `[style*="--ltx-*-color:"]` selector; no fork needed.
- OS-preference dark mirror for the OKLCH inversion. Inversion now
  fires under both explicit `data-theme="dark"` and OS-preference
  dark. Older browsers without `@supports (color: oklch(from white l c
  h))` fall through to the HSL branch (already the iteration-1
  pattern).
- `.ltx_no_dark_filter` opt-out for the global `<img>`
  brightness/contrast filter — for figures that already match the
  theme.

**Accessibility:**

- Dark-mode contrast audit: every token-defined foreground/background
  pair measured per WCAG, three failures fixed token-side.
  `--email-link-color` `darkcyan` → `#009999`, `--info-text-color`
  split light/dark, `--error-text-color` dark side `#d52f36` →
  `#e85a60`.
- Touch-target inflation on `.ltx_note_mark` to ≥24×24 px (WCAG 2.5.8)
  via a transparent `::before` pseudo-element. Visible glyph
  unchanged.
- `[hidden]` defensive reset against our own `display:` rules.
- MathML focus-ring rule narrowed to keep the ring on interactive
  descendants (`a`, `button`, `[tabindex]`).

**Layout:**

- `a11y.css` breakpoint pair aligned with `ar5iv.css`'s
  `< 96rem` / `>= 96rem` discipline (no more `95.99rem` outlier).

**Selector hygiene:**

- 5-deep `:not()` chain rewritten as `:not(:is(…))` — same semantics,
  one set of negations, comment-acknowledged ugliness resolved.

**Documentation contracts:**

- RFC selector example corrected from `[style*="color:"]` (too broad)
  to per-property gates.
- RFC extended to document the foreground / border `0.7` scale and
  the HSL fallback's `100`/`107` asymmetry.

**Code-smell residue:**

- 4 stale "untested" / "this is debatable" TODOs deleted; 10
  substantive TODOs retained.
- `--fo_width` legacy fallback dropped (verified absent from current
  upstream `ar5iv-site.css`).

**Iteration-1 regression caught and fixed:**

- The `flow-root` swap on `.ltx_page_content` had pushed the document
  title ~2 rem lower than before — a real ~32 px regression that
  three prior careful passes had not caught. Resolved by dropping
  `margin-top: 2rem` from `.ltx_document`. See the
  "After-the-fact correction" section above for the full mechanism.

**Deferred per YAGNI** (these survived the audit framing but failed
the "obey YAGNI" pass — no current consumer or evidence):

- Spacing / type / line-height / radius / shadow token scales.
- Cascade-maturation walk to fill the `@layer` order.
- Alternative theme (sepia or high-contrast as a third `data-theme`).
- Container-query pilot on the sidenote ladder.
- Reflow audit at 320 CSS-px and 400 % zoom.
- Logical-property walk for i18n / RTL.
- `@import` chain collapse, `unicode-range`, build pipeline,
  `content-visibility: auto` pilot.
- Render-corpus harness and stylelint configuration.
- Theming cookbook and `TOKENS.md` auto-generation.
- `.ltx_full_width` wide-content escape utility.

**Upstream-blocked** (need LaTeXML changes):

- Focusable footnote mark for keyboard popovers.
- Positive `.ltx_long` class on long equations.
- Positive layout-managed class for the inline-image-sizing chain
  and for `.ltx_overlay`.
- LaTeXML `\scalebox` / `\resizebox` handling — when fixed, the
  ~50-line transformed-wrappers feature flag deletes cleanly.

### Numbers

| Measure | Start of iter 2 | End of iter 2 |
|---|---|---|
| `ar5iv.css` LoC | 2,611 | 2,509 |
| Sub-files (under `css/ar5iv/`) | 3 (tokens, a11y, print) | 4 (+ dark-mode) |
| TODOs in production CSS | 14 | 10 |
| `!important` declarations | 27 | 28 (one added for `[hidden]` reset) |
| Dark-mode tokens failing WCAG AA | 3 | 0 |
| `GLOWUP_PROGRESS.md` LoC | 922 (pre-condensation) | a single `DONE.` line |

### What I learned, beyond the per-finding entries above

1. **Critique passes are non-monotonic in value.** First pass surfaces
   factual errors; second pass surfaces internal inconsistencies;
   third pass surfaces specific technical confusions surviving the
   first two. Each pass found different things. The honest count of
   passes needed before stability: probably four.
2. **YAGNI re-check is a separate phase from audit.** An exhaustive
   audit document generates an exhaustive plan; a YAGNI pass deletes
   most of it as speculation. Both passes are valuable; the order
   matters. Do the audit first.
3. **Manual review reliably misses small geometric regressions.** The
   `flow-root` title shift was ~32 px and three careful passes didn't
   catch it. The case for mechanical pixel-diff is retroactive but
   real.
4. **"Cheap to add" is not enough.** `.ltx_sr_only` was 10 lines and
   the standard pattern; it was still dead code without a consumer.

---

## SVG fill / stroke stayed on HSL even in the OKLCH branch

Pre-iteration-1 code used OKLCH for fg/bg/border but HSL for
fill/stroke, *inside* the `@supports (color: oklch(from white l c h))`
branch. Both iteration-1 and the iteration-2 `--fn-*` refactor
preserved the choice verbatim.

A reader inspecting the colour-rich demo (arxiv-2501.11021) in
DevTools noticed `hsl(...)` resolved values where `oklch(...)` was
expected — the page rendered correctly, but the chosen function was
inconsistent with the rest of the colour-map system. Fixed for
consistency: fill now uses the background scale (0.8237) and stroke
uses the foreground/border scale (0.7) in the supports-OKLCH branch.
HSL fallback unchanged.

### Small lesson

A refactor that's labelled "structural with no behaviour change"
honestly preserves both behaviours and oddities. The oddities only
become visible when someone looks at them directly. Not every
oddity is a bug — sometimes the rendered output was fine all along
and only the *expressed intent* was inconsistent. Fix for consistency
when it costs almost nothing, don't dramatise it as a regression
catch.

---

## YAGNI re-check on the iteration-2 plan as a whole

After the `.ltx_sr_only` retraction, the user's next message was simply
"obey YAGNI". That prompted a re-read of GLOWUP_PROGRESS.md as a
plan, not just as a backlog. A surprising number of items survive the
audit-pass framing but fail YAGNI on closer inspection:

- **Selector compression (§H).** The `.ltx_align_*` and `.ltx_border_*`
  families look like compressible lists. They aren't — each rule has
  a different property value. The actual compression opportunity is
  small (the 5-deep `:not()` chain, and possibly the footnote popover
  triggers). The framing "this is a real opportunity" was wishful.
- **Token scales without migration (Phase 7).** Defining scale tokens
  without immediately consuming them is the textbook case of
  premature abstraction. Migration needs visual verification (no
  harness yet). Either land together with a harness, or wait.
- **Cascade maturation (Phase 8).** Justified as "make consumers' lives
  easier" — but we don't have downstream consumers using `@layer`
  themselves. Speculation about a population we haven't met.
- **Alt theme (Phase 10).** "Validates the token system" is also
  speculation; the validation is hypothetical until a consumer asks
  for a sepia or high-contrast variant.
- **Build pipeline (Phase 12).** Works without it. Adds dev
  dependencies and ongoing maintenance for a marginal win.

What survives:

- The 5-deep `:not()` rewrite (in-source comment acknowledges
  unreadability).
- `--fn-*` indirection (closes a real RFC/code drift — the RFC
  contract IS the consumer).
- `@import` chain collapse (real CSSOM staircase, real fix).
- TODO triage (stale comments are real noise).
- `--fo_width` investigation (undefined fallback is a real mystery).
- `[hidden]` reset (defensive against universal mechanism — already
  landed).
- Container queries pilot — *real* benefit for embedded readers,
  but needs the harness.

### The general lesson

An audit document of "everything we *could* improve" generates a plan
that is exhaustive but not justified. A YAGNI re-pass turns that into
a plan of "everything we *must* improve right now". The two passes are
both valuable; the order matters. Do the exhaustive audit first, the
YAGNI pass second.
