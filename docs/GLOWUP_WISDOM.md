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
- `--fo_width` investigation: turned out to be a legacy
  underscore-named fallback in the `var(--ltx-fo-width, var(--fo_width))`
  chain. The hyphen-named `--ltx-fo-width` is *the* upstream contract —
  LaTeXML emits it inline on every `<svg:foreignObject>` (see
  `lib/LaTeXML/Engine/TeX_Box.pool.ltxml:385`). The underscore
  fallback had no producer in current LaTeXML and was dropped in
  iteration 2; the hyphen-named consumer was kept. (Originally
  framed in this doc as "undefined fallback is a real mystery";
  more accurately: the *underscore* form was the dead fallback,
  the *hyphen* form is alive and load-bearing.)
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

---

# Iteration 3

## Stylelint surfaced a six-year-dead rule

Adding stylelint to the build (iteration-3 item #8) turned up
`span.ltx_personname span:first { font-size: 1.5rem }` in `ar5iv.css`.
`:first` is a valid pseudo-class only inside `@page` rule blocks; in
a regular selector it is unknown, and browsers silently drop the
whole rule. So this declaration has been an inert string for the
lifetime of the file (git blame puts it pre-glow-up by years).
Multiple human review passes — including this iteration's critique
cycles — missed it because the syntax is *plausible-looking*.

Other errors stylelint caught in the same pass were the routine kind:
four `word-wrap` → `overflow-wrap` deprecations, one
`word-break: break-word` deprecated keyword, four single-colon
`:before` / `:after` pseudo-elements. Together with the dead rule,
ten "errors" in 2,500 lines of stable CSS — none of which a human
linter would have hit reliably.

### The lesson

A class of bug exists where the *syntax is plausible* but the
*semantics are wrong*. Human review is unreliable on this class —
not because of inattention but because reviewers parse what they
*expect* to be there. Mechanical readers don't have expectations.
Land lint coverage early, even if the ruleset is mostly
warnings-not-errors.

---

## A token nobody uses is the same as a token that doesn't exist

When iteration-3 reached item #9 (demonstrated extensibility), the
user pointed at the arxiv-browse vendor stylesheet
(`arxiv-html-papers-theme-20250131.css`) as a real downstream
consumer. That file contains:

```css
/* TODO: This color should be a design token name eventually.
   Without that we have to copy the full selector rule from
   ar5iv.css: */
[data-theme="dark"] [style*="--ltx-fg-color:#000000;"] {
  --text-color: #f9f7f7;
  color: var(--text-color);
}
```

The token they wanted *had been added* in iteration 2:
`--text-color-author-black-dark` in `tokens.css`. ar5iv-css's own
rescue rule reads it. A one-line downstream override
(`:root { --text-color-author-black-dark: #f9f7f7; }`) replaces the
selector-chain copy.

But the cookbook (`THEMING.md`) didn't mention this token, and
TOKENS.md only described it. So the consumer couldn't have found it
without reading the upstream source.

### The lesson

A token's *purpose* needs to land where a consumer would
*discover the need*. TOKENS.md is the reference, but the cookbook is
the discovery surface — recipes are where someone writing
`color: #f9f7f7` would think to look. Document at the failure point,
not at the definition point.

The vendor cross-reference also caught a pattern the cookbook had
only implied: real downstream themes don't just *override* tokens,
they *extend* the token surface with their own chrome variables
(`--header-background-color`, `--toc-text-highlight-color`,
`--nav-width`). Added a section explicitly for that pattern.

---

## "Falsified by hypothesis test" beats "falsified by reasoning"

Iteration-3 item #6 was a container-query pilot. The original
audit framed it as a hypothesis: *in a narrow iframe inside a
wide host viewport, the sidenote ladder picks the wrong band*. The
Next-move guidance was explicit: build a synthetic test page,
verify, then decide.

Built `examples/embedded-iframe.html` (a 600 CSS-px iframe inside
a wide host) and reasoned: per the CSS spec, the `width` media
feature evaluates against the iframe's own viewport when the iframe
declares `<meta name="viewport" content="width=device-width">`,
which every LaTeXML output does. So the predicted misclassification
can't happen. Closed as no-action.

The test page exists. The argument is reasoning-from-spec, but the
test page is the artifact that would have DISproved the reasoning
if reality diverged. Different from a pure thought-experiment
closure — *I could have been wrong, and the test would have shown
it*.

### The lesson

A "verified" hypothesis is one where the test could have
falsified you. Reasoning from spec is a strong argument; reasoning
*plus an artifact that exposes you to falsification* is stronger.
For features that aren't load-bearing today (container queries
would have been speculative anyway), the artifact-bearing closure
is enough.

---

## Visual harness scope: the first-viewport mistake

Iteration-3 item #1 specified 320/768/1280/1920 CSS-px × {light, dark}
× fullPage for the visual-regression harness baseline. First shipped
1280 × {light, dark} × *first-viewport-only*, with two storage
arguments:

1. fullPage put the committed baseline at 25 MB — the 2407.16893
   paper alone was 8 MB.
2. The retrospective evidence motivating the harness (the
   iteration-2 flow-root title shift) manifests in the first
   viewport.

The user immediately pushed back: "your current screencaps capture
only the frontmatter of an article, and in some situations include
artifacts. I am asserting the tools/baseline/ images are not
sufficiently expressive and are misleading." Correct call. The
first-viewport scope had two bad properties:

- **It captured only frontmatter** — title, authors, abstract,
  maybe the first paragraph. Everything past that — body, math,
  figures, bibliography — went uncovered. A regression in the
  bibliography rules (which we touched in iter-2 and iter-3) had
  *zero* test coverage.
- **It justified the misleading scope by self-referencing the
  evidence**. "The bugs we caught were in the frontmatter, so
  let's only render the frontmatter" is selection bias — we
  caught those bugs *because* they were in the part of the page
  someone was looking at. Bugs below the fold survive
  unnoticed; that's exactly the class a comprehensive harness
  exists to surface.

The fix: switched to fullPage across the entire 47-paper corpus
cited in `ar5iv.css` comments. ~440 MB of baselines locally,
gitignored (too large for git history; CI tarball is the planned
shared-truth answer). Each developer generates with
`--update`; `npm test` diffs against local. Render time ~5 min
for the full corpus.

### The lesson

A test harness's coverage scope shouldn't be optimised against
the same evidence the harness was *justified by*. "Catches the
bugs we caught before" is the floor of acceptable scope, not the
target. The target is "catches the bugs we don't know about
yet" — which means rendering the parts of the page nobody is
looking at. Where storage cost gets in the way of comprehensive
coverage, make the storage cost local-per-developer rather than
trimming coverage.

### Related: don't argue from selection bias

When defending a narrower scope ("the bugs we caught all
manifest in the first viewport"), the unstated premise is
"and the bugs we didn't catch don't matter". That premise has
to be argued separately. The earlier wisdom entry on
"ship-working-iterate-later" smuggled the premise in
unexamined.

---

## `light-dark(literal, var(--same-name))` is a CSS cyclic dependency

Writing recipe 1 of the cookbook, claimed this pattern works:

```css
:root { --link-text-color: light-dark(#0066cc, var(--link-text-color)); }
```

The intuition: "redeclare with a new light branch, preserve the dark
branch by referencing the existing token". The reality: per CSS
Custom Properties Level 2 §5.1 (cyclic dependencies), `var(--link-text-color)`
inside the value of `--link-text-color` is a cycle — the browser
detects it and the entire property becomes `unset`. Links would
inherit `currentColor` in *both* themes, not preserve the dark
branch.

Caught it on the critique pass after shipping. CSS doesn't have a
spec-level "previous value" reference; the working pattern is to
inline both branches (look up the dark value in TOKENS.md), or to
override per-theme separately (`:root[data-theme="light"] { … }` and
a parallel `@media (prefers-color-scheme: light)` rule for the OS
case).

### The lesson

Code examples in docs are still code — run them. The intuition was
good, the spec doesn't support it. CSS `@function` (Level 5) will
provide a way to compute properties from previous values; until
then, downstream overrides have to know both branches.

---

## Logical-property stays-physical: a judgment call about LaTeXML

Item #3 converted ~60 sites in `ar5iv.css` from physical
(`margin-left`, `padding-right`, `border-left`, `text-align: left`)
to logical equivalents (`margin-inline-start`, `padding-inline-end`,
`border-inline-start`, `text-align: start`). The conversion was
mostly mechanical, with one judgment-call boundary:

LaTeXML emits class names like `.ltx_border_l`, `.ltx_border_r`,
`.ltx_nopad_l`, `.ltx_nopad_r`, `.ltx_align_left`, `.ltx_align_right`,
`.ltx_framed_left`, `.ltx_framed_right`. The `_l`/`_r`/`_left`/`_right`
suffix names the physical side directly, derived from TeX-source
column position. Today's arXiv corpus is overwhelmingly LTR, so
physical and logical agree. If LaTeXML eventually emits RTL tables,
*the same class name on the same cell* should produce the
inline-start edge (right in RTL), not the literal left. So the
question is: do these classes mean "physical left" or "inline-start"?

Left them physical, with an explanatory comment block in the
borders section. The rationale: LaTeXML's intent today is physical;
ar5iv-css can re-interpret when LaTeXML's emission documentation
catches up. The alternative (re-interpret eagerly as logical) would
"work" today but might break a future LaTeXML emission whose author
actually meant "physical left".

### The lesson

Class names that embed direction in their suffix are an
*upstream contract*, not a styling primitive. Treat them as the
upstream emitter intends, even when the codebase has moved past
the physical primitive itself. The cost is a couple of remaining
physical declarations; the alternative is breaking a future
contract.

---

## A "fix" that changes a function's shape almost always has side-effects

The epigraph reflow fix (iteration-3 #2) changed:

```css
/* before */ width: min(100%, calc(0.5 * var(--main-width)));
             margin-inline-start: min(50%, calc(0.45 * var(--main-width)));

/* after  */ width: min(50%, calc(0.5 * var(--main-width)));
             margin-inline-start: min(45%, calc(0.45 * var(--main-width)));
```

The commit message claimed "preserves the wide-viewport intent". True
at *very* wide viewports (where the rem caps apply to both branches),
but at moderate viewports (~50-60rem) the new formula produces a
slightly smaller epigraph (~25rem width vs the original 26rem,
~22.5rem indent vs 23.4rem). The visual harness at 1280 doesn't catch
this because the rem caps apply at that width.

### The lesson

Changing the *shape* of a function (e.g. `min(100%, X)` →
`min(50%, X)`) almost always has effects across the function's
range, even if it preserves end-point behaviour. "Preserves intent"
needs to specify the input range. Document the side-effect at the
time of the change rather than waiting for it to show up as a
diff later.

---

## Impedance-mismatch problems: print-sized content in screen-sized boxes

A class of bugs in `ar5iv.css` named by the project owner during
iteration 3: source content was *originally typeset for A4 or
Letter paper* — fixed-width page, comfortable margins, no
scrollbars. When LaTeXML extracts the same content and ar5iv-css
re-renders it for variable-width screens, the original sizing
assumptions break. Common symptoms:

- A code listing whose lines comfortably fit ~75 character columns
  on a 5.5″ printed page overflows horizontally on a 320 CSS-px
  phone viewport.
- A 600×400 figure that fits centred on Letter paper crowds a
  narrow column.
- A wide tabular environment that A4 makes look balanced becomes
  a horizontal-scroll trigger on screen.

These aren't bugs in the upstream LaTeX source, nor are they bugs
in LaTeXML's HTML emission. They're bugs in the *interface
between* — the impedance mismatch between fixed-width print
geometry and elastic screen geometry. Naming the category
clarifies the design space:

- A fix that *reflows* content (allow wrapping, shrink graphics)
  buys mobile readability at the cost of preserved formatting.
- A fix that *contains overflow inside the source element*
  (`overflow-x: auto` on a listing, `overflow-x: auto` on a wide
  table) preserves the original geometry but introduces a
  per-element scrollbar.
- A fix that *constrains the source* (re-render the figure at a
  smaller size; shrink the listing font) requires LaTeXML-side
  re-emission.

Each axis is a different cost. The category exists because the
project owner has multiple of these open in different shapes —
listings, figures, tables, wide math — and the *right* answer
varies by content type. A listing's structure (line numbers,
indentation, monospace columns) is load-bearing in a way prose
isn't, so reflow breaks more than it fixes; containment is
typically the right call. A figure has no such structure, so
shrinking it works. Wide tables are in between; ar5iv currently
uses `overflow-x: auto` on `.ltx_table`.

### The lesson

When a rule looks like it's "fighting the medium" — like a
listing that overflows the viewport — first ask whether the
content was sized for a different medium. If yes, the design
space is the three axes above, not a binary choice. Pick the
axis whose cost matches the content's load-bearing properties.

### Anti-lesson on the fix tactic

`overflow-x: auto` on a container is tempting because it's a
one-line fix. It also frequently produces *unwanted in-content
scrollbars* in cases the author didn't anticipate — a listing
whose content fits the viewport on most papers but is wider than
`--main-width` for a few specific corpus papers (algorithm
listings with deep indentation, for example) will now grow a
horizontal scrollbar on those papers, even on desktop. That's
not necessarily wrong, but it's *different* from before and
worth visual verification across the corpus in both Chrome and
Firefox before landing — scrollbar visibility, position, and
behaviour vary between browsers and platforms.

---

## Defensive rules earn their keep by failing the test, not by surviving fear

ar5iv.css carried a ~6-year-old workaround at the bottom of the
file: any `.ltx_p` or `.ltx_item` containing a math element with
7+ `mrow` descendants got `text-align: left` instead of the
default `text-align: justify`. The comment cited
"state of MathML in 2023" — wide formulas inside justified prose
produced visibly large whitespace wells in browsers of that era,
and the workaround pinned to left to avoid the failure.

Iteration-3 item Q4 (raised by the project owner): is the
workaround still load-bearing now that MathML Core is Baseline?
First attempt at the test ran the visual harness over the 46-paper
corpus with the rule disabled. Result: 0 pixels of diff across
all 92 snapshots — but the canonical trigger paper (the one
specifically cited in the comment, arXiv:2105.10386) had failed
to fetch from both ar5iv labs (503) and arxiv.org/html (404), and
*no other corpus paper exercised the selector*. The test was
inconclusive: "all 92 papers diff zero" tells you nothing about a
rule that fires on none of them.

The conservative move at that point was to restore the workaround
with a "deferred — can't verify without the canonical trigger"
note. That was the wrong move. Project owner had a local copy of
the missing paper available; with the trigger paper added to the
corpus, the harness now did have a real measurement to make. The
re-run with the rule disabled showed 0 pixels of diff *on the
trigger paper itself*. Current Chromium handles the wide-formula
justification case cleanly without the override. Rule deleted.

### The lesson

A defensive rule's *justification* is the failure mode it
prevents. When the failure mode no longer exists in the
deployment target, the rule is dead weight — its presence
neither helps the working case (no effect) nor protects against
the broken case (which doesn't happen). The test that retires it
isn't "does the rule still trigger" but "does removing it
reintroduce the failure". When the canonical trigger is reachable,
that test is single-snapshot.

The conservative bias toward keeping defensive rules is
reasonable when the test is infeasible. But "infeasible" deserves
a hard look — in this case, the trigger paper *was* reachable
via a local cache the project owner had. The initial "restore
with deferred note" was correct only as long as the local cache
was unknown; once it was on offer, "delete the dead rule" became
the right call.

### Practical mechanism

The corpus is keyed on arXiv ID, fetched by `examples/fetch-corpus.sh`
from either arxiv.org/html or ar5iv labs. When upstream is
unavailable but a paper exists locally, dropping a copy of its
LaTeXML output into `examples/ar5iv-<id>.html` (or arxiv-<id>.html)
restores it to the corpus — `tools/visual.mjs` picks it up
automatically. The fetch is best-effort; the corpus participates
even if some IDs are 503/404 at fetch time, as long as they
exist locally.
