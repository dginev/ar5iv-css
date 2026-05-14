# GLOWUP_PHASE2_AUDIT

> **Frozen snapshot — do not edit.** This is the pre-iteration-2
> audit and plan as it stood on 2026-05-13 after three critique
> passes. The living working document continues at
> `GLOWUP_PROGRESS.md`; the read-only archive of how the project
> reasoned about itself at each phase boundary is:
>
> - `GLOWUP_AUDIT_START.md` — pre-iteration-1 audit (frozen)
> - `GLOWUP_WISDOM.md` — iteration-1 append-only learnings
> - `GLOWUP_PHASE2_AUDIT.md` — this file
>
> The remainder of this document is the original `GLOWUP_PROGRESS.md`
> text from the moment of freeze, reproduced verbatim.

---

# GLOWUP_PROGRESS (as of 2026-05-13)

> Forward-looking, living document for the **second iteration** of the
> ar5iv-css glow-up. The first iteration (Phases 0–5) is complete and
> archived in `GLOWUP_AUDIT_START.md` (the frozen pre-work audit) and
> `GLOWUP_WISDOM.md` (the append-only record of what was learned).
>
> Goal: take a CSS theme that is now *oriented* toward best practices and
> evolve it into a **mature, production-ready** stylesheet for scholarly
> documents.
>
> Working definition of "production-ready" for this codebase:
> 1. WCAG AA in both light and dark themes for **every token-defined**
>    foreground/background pair, plus a sampled audit of the
>    author-colour inversion against the in-tree corpus. (Exhaustive
>    audit of the *output* of an arbitrary-input transform is not
>    possible; sampling against representative authoring patterns is.)
> 2. No **unintended** visual regressions against the in-tree arXiv-ID
>    corpus under a repeatable harness. Intentional changes get
>    reviewed and approved.
> 3. Downstream themes can re-skin without forking the file. The public
>    surface is the token set, the `--fn-*` override API, and the
>    `data-theme` attribute contract.
> 4. Either a build artefact *or* a documented HTML-side integration
>    recipe (preconnect, `<link>` order, font policy) — whichever lets
>    a consumer deploy without manually unrolling the `@import` chain.
> 5. Documented contracts (RFC, `TOKENS.md`, `CONTRIBUTING.md`) stay in
>    lockstep with the code, ideally enforced by CI.
>
> Where the starting audit asked *"what's wrong?"*, this document asks
> *"what's still missing against that definition?"*.

---

## Status snapshot — end of first iteration

| Area | State |
|---|---|
| Cascade layers (`@layer` declared) | ⚠️ order declared; only tokens and a11y inhabit named layers — bulk of `ar5iv.css` is un-layered |
| Design tokens — colour | ✅ `light-dark()` used wherever the value should differ between themes (`--info-text-color`, `--text-color-author-black-dark` and similar stay single-valued by intent) |
| Design tokens — border, motion, z-index | ✅ tokenised |
| Design tokens — spacing, type, line-height, radius, shadow | ❌ not done |
| `light-dark()`, `color-scheme` | ✅ |
| OKLCH author-colour inversion | ⚠️ gated on `[data-theme="dark"]` only — no OS-pref mirror |
| `:focus-visible`, `:target`, `::selection` | ✅ via `a11y.css` |
| `prefers-reduced-motion`, `prefers-contrast: more`, `forced-colors` | ✅ |
| Keyboard footnote popovers | ⚠️ CSS landed; depends on upstream LaTeXML emitting focusable mark |
| Breakpoint range-syntax discipline | ✅ in `ar5iv.css`; ⚠️ inconsistent in `a11y.css` (still 95.99/96 split) |
| Container queries | ❌ |
| Logical properties | ⚠️ 1 use; most physical-direction sites are candidates, but not all (numeric-column alignment, blockquote decoration, underline borders stay physical) |
| Print styles | ✅ |
| Reflow audit (WCAG 1.4.10) | ⚠️ spot fixes only |
| Font pipeline | ⚠️ `display=swap` on Google URLs; `@import` chain still in `ar5iv-fonts.css` |
| RFC `--fn-*` author-override API | ❌ documented but never implemented |
| Visual-regression harness | ❌ |
| stylelint / CI | ❌ |
| Contributor docs (`CONTRIBUTING.md`, `TOKENS.md`, top-of-file orientation) | ✅ |
| `package.json` (exports, sideEffects, repo URL) | ✅ |

`ar5iv.css` is 2,611 LoC; `ar5iv-fonts.css` is 78; `tokens.css` 120;
`a11y.css` 151; `print.css` 104. Direct grep counts **27** `!important`
declarations in `ar5iv.css` (the starting audit reported 31; the delta
is not traced — could be miscount, could be edits during iteration 1).
Six of the 27 are the transformed-wrappers cluster — one feature flag,
not six independent decisions. **14** TODOs remain in production CSS.
**13** `:has()` uses, **0** `:is()`/`:where()`, **0** `@container`,
**21** `light-dark()`, **2** `color-mix()`.

---

## 1. Categories of remaining improvement

Each category states (a) current state, (b) the gap to "production-ready /
best-in-class", and (c) the shape of the fix. Concrete step plans live in
**§2 — Phased plan**.

### A. Token-system depth

**Current.** Colour, border, motion, z-index, and font-family scales are
tokenised. Spacing, type, line-height, radius, and shadow are still bare
literals. A histogram of `margin` values shows a real but not perfectly
clean ladder: `0 / 0.5 / 1 / 1.5 / 2 / 4` rem account for roughly 70 %
of margin declarations; the rest splits across `0.1`, `0.2`, `0.25`,
`0.3`, `0.75`, `0.66`, `0.65`, and a long tail. `font-size` clusters on
`0.7 / 0.75 / 0.8 / 0.85 / 0.9 / 1 / 1.2 / 1.3 / 1.4 / 1.5 / 1.6 / 1.7`
rem — twelve half-step values, so a scale will have to *pick anchors*
rather than just adopt the existing set. (A handful of font-sizes use
`em` or `%` — these are doing different work, e.g. `0.85em` on note
marks for em-relative scaling; they stay outside the rem scale.)
`line-height` is *less* of a ladder than font-size, not cleaner —
`1.5rem` accounts for most uses (7), with `1`, `1.1`, `1.15`, and
`1.4` each appearing once and likely standing for hand-tuned local
decisions rather than scale steps.

**Gap.** Without scales, every typographic nudge ("subsection a hair
tighter, section a hair looser") is a grep-and-edit across the file. A
typographer cannot tune the theme without re-deciding what each literal
"really meant".

**Why deferred in iteration 1.** Retroactive substitution requires
visual confirmation; we did not have a regression harness. Iteration 2
includes the harness as a prerequisite.

**Shape of the fix.**
- Define `--space-{3xs,2xs,xs,sm,md,lg,xl,2xl,3xl}` (or numeric
  `--space-1 … 8`) backed by the observed clusters.
- Define `--font-size-{xs,sm,md,lg,xl,2xl,3xl}` — keep `1rem` for body.
- `--line-height-{tight, prose}` — `1.5rem` dominates the file
  (7 uses); the singleton uses of `1.1rem`, `1.15rem`, and `1.4rem`
  are outliers worth investigating individually before adopting them
  as scale steps.
- `--radius-sm/md/lg` (only one site uses `border-radius` today —
  the conversion-report panel at `0.8rem` — but future notice/callout
  work will need them).
- `--shadow-pop` is **deferred** until a real use case lands.
  `box-shadow` is used once (`a11y.css:102` on `:target`) but the
  value derives from `--note-highlight-color`; introducing a shadow
  scale before there's a second consumer would be premature
  abstraction. Phase 7 should *not* try to ship a shadow scale.
- **Where the scale-driving tokens are consumed in default rules,
  wrap the selector in `:where()`** so author overrides win on
  specificity. The tokens themselves are declarations, not
  selectors — there's nothing to `:where()` about the variable
  definitions themselves.

### B. Cascade maturation

**Current.** Layer order is declared at the top of `ar5iv.css`, but only
tokens and a11y (and the implicit print) actually inhabit named layers.
The remaining ~2,400 lines are in the implicit final layer.

**Gap.** A best-in-class theme uses layers to *make consumers' lives
easier*: a downstream theme should be able to introduce overrides
without playing specificity games. Right now any consumer override sits
at the same specificity tier as our own rules.

**Shape of the fix.** Walk the file by section banner; for each
section, decide its layer. The layer names below are the ones
already declared at the top of `ar5iv.css`; **the assignments
sketched here are starting suggestions, not specifications** — many
sections sit at category boundaries and the right call depends on
what they actually do.
- `reset` — UA-defaults overrides (`body { margin: 0 }`).
- `base` — `:root` colour propagation, the `:focus-visible` rule
  (already there via `a11y.css`).
- `structure` — page chrome, document container, paragraph, headings.
  (ToC is a boundary case; could be `structure` or `components`.)
- `components` — footnotes, bibliography, listings, theorems,
  captions, tables. (Blockquote is a boundary case — structural in
  scholarly docs.)
- `math` — `.ltx_eqn_*`, `mfrac`, `mtd`, `mathvariant_*`,
  `mjx-container`. (The 7-mrow heuristic changes paragraph
  alignment — debatable whether it's `math` or `components`.)
- `fixes` — the `B1`/`B3` known-bug blocks.

The asymmetry to remember (and document at each move): with
`!important`, **earlier layers beat later ones**. The transformed-
wrappers cluster uses `!important` to defeat LaTeXML's inline
`style="…"`; moving it into `fixes` would *demote* it. Keep it
un-layered or move it to an **earlier** layer.

Impact on downstream consumers depends on how they override:
- Consumers using `!important` are *unaffected* (un-layered
  `!important` still beats any layered rule).
- Consumers relying on plain-specificity overrides are mostly
  unaffected (their selectors are still un-layered, which beats
  any of our named layers).
- The real change is for consumers who already use `@layer`
  themselves. Update `CONTRIBUTING.md` with the layer→section
  map in the same PR as the *first* section moves, so the
  contract is documented before downstream sees the behaviour
  change.

**Implementation note.** The file has roughly eight section
banners (`/*=====...*/` headers) over 2,611 lines, so "walk by
section banner" lands at average ~325 LoC per chunk. That is
too coarse to map directly to layers — most banners cover
mixed content. Plan one PR per logical *group* (e.g. "all
footnote rules", "all bibliography rules"), regardless of
whether they share a banner.

### C. Theming extensibility

**Current.** Three signals are honoured: explicit `data-theme`, OS
`prefers-color-scheme`, and `prefers-contrast: more`. No third theme
(sepia, high-contrast, etc.). The OKLCH author-colour inversion fires
only on **explicit** `data-theme="dark"`; a user with OS=dark and no
JS-set attribute sees dark *tokens* but un-inverted author colours.

The RFC at `docs/rfc_latexml_custom_properties.md:88-92` proposes a
**`--fn-*` indirection API** as the public override surface:

```css
[style*="--ltx-fg-color:"] { --fn-fg-color-to-dark-mode: …; }
```

This API is **not implemented** in `ar5iv.css`. A downstream theme that
wants a different dark-mode inversion strategy has to fork.

**Gap.**
1. No way for a downstream theme to override the inversion strategy
   without forking — the *whole point* of the RFC.
2. No alt theme to validate that the token system actually generalises.
3. OS-preference dark users get a half-themed page until JS sets
   `data-theme`.

**Shape of the fix.**
- Introduce `--fn-fg-color-to-dark-mode`,
  `--fn-bg-color-to-dark-mode`, `--fn-border-color-to-dark-mode`,
  `--fn-fill-color-to-dark-mode`, `--fn-stroke-color-to-dark-mode` as
  *the* indirection layer. The current OKLCH transforms become the
  *defaults* for these tokens. Downstream themes override the token,
  not the rule.
- **Fix the RFC's selector before implementing.** The RFC at
  `rfc_latexml_custom_properties.md:87-95` shows the override
  anchored on `[style*="color:"]`, which would also match
  `style="background-color: …"` and `border-color: …`. The
  per-property gate should match what `ar5iv.css` actually uses
  today: `[style*="--ltx-fg-color:"]`, `[style*="--ltx-bg-color:"]`,
  etc. Either fix the RFC first or note the divergence at
  implementation time.
- Validate the token surface with **one** additional theme. Two
  candidates exercise different paths:
  - **Sepia** — a light theme; validates the palette tokens
    (background, text, link, highlight) but does *not* exercise the
    OKLCH inversion (sepia is not "dark mode").
  - **High-contrast** — already partially driven by
    `prefers-contrast: more`; promoting to an explicit
    `data-theme="high-contrast"` would validate the contrast-override
    pathway and is a smaller code surface.
  Either is a legitimate pick; pick the one whose user need is
  strongest. Don't claim the choice "validates the whole system" —
  each validates one axis.
- OS-preference mirror for the OKLCH inversion. The mirror means
  duplicating the two `@supports` forks (5 rules each) under a new
  `@media (prefers-color-scheme: dark) { :root:not([data-theme=
  "light"]) … }` wrapper — about 20 rule bodies of duplication, or
  a single `@scope` block. `@scope` reached Baseline support in
  mid-2024 (Chrome 118, Safari 17.4, Firefox 128) — comparable to
  the `light-dark()` baseline we already depend on. If `@scope` is
  unsupported the entire block is silently dropped, leaving the
  pre-existing behaviour (data-theme controls inversion; OS-pref
  alone doesn't). That is what we have today — `@scope` is upside,
  not regression.

### D. Accessibility depth

**Current.** Focus state, `:target`, `::selection`, reduced-motion,
forced-colors, and `prefers-contrast: more` all in `a11y.css`. Warning
colour fixed (`#8a6800` ≈ 4.8:1). `forced-colors` block maps `LinkText`,
`VisitedText`, `Mark`, `Highlight`.

**Gap.**
1. **Contrast not re-audited in dark mode.** The audit numbers in
   AUDIT_START were measured on white only. Tokens that need
   on-`#0d1117` verification include `--note-mark-color: #daa002`,
   `--error-text-color: #d52f36`, `--warning-text-color: #d09e05`,
   and `darkcyan` (for emails). Numbers go into TOKENS.md, failures
   get fixed token-side. (Don't repeat the mistake I'm fixing right
   now of citing contrast ratios without actually computing them.)
2. **Touch targets.** `.ltx_note_mark` lives inside `.ltx_note`
   which is itself `font-size: 0.85em`, then the mark applies
   another `0.85em` — so the mark renders at roughly `0.72em`
   (~11–12 px at default body size). That's well below WCAG 2.5.8
   (Target Size, Minimum, AA in 2.2) at 24×24 px. On touchscreens,
   tapping a footnote mark is awkward.
3. **`[hidden]` and `.ltx_sr_only` utility** are missing.
   `[hidden]` has stable semantics (the element should not render),
   but our many `display: block / inline / flex` rules on
   `.ltx_*` classes will *override* the UA default `[hidden] {
   display: none }` whenever they apply to the same element. A
   higher-specificity `[hidden] { display: none }` reset closes
   the gap. The `.ltx_sr_only` utility is the standard
   "visually hidden but **announced** by assistive technology"
   pattern (the inverse of `aria-hidden="true"`, which hides
   from AT). We don't have a current consumer in the file, but
   shipping the utility is cheap and unblocks future use (e.g.
   adding "(opens in new tab)" text to external-link decoration
   for screen-reader users).
4. **Deferred until LaTeXML emits the markup**: skip-links
   (`<nav>` with "skip to main content"), `[aria-expanded]` hooks,
   `details/summary`, landmark `role` annotations on `.ltx_note`.
   Pre-emptive styling against a guessed emission shape is worse
   than the UA defaults if we guess wrong.

**Shape of the fix.** A second `a11y.css` pass:
- Measure every colour token in both themes against an in-tree corpus
  and fix the failures (token-level, not rule-level).
- Inflate `.ltx_note_mark`'s hit area to at least 24×24 px without
  changing visual size — use a transparent `::before` with negative
  inset, or `padding` with `box-sizing: content-box` so the visible
  glyph stays put.
- Land `[hidden]` and `.ltx_sr_only` now; defer the markup-dependent
  selectors per #4 above.

### E. Layout maturity

**Current.** Breakpoints rationalised in `ar5iv.css` to a clean
46 / 52 / 80 / 96 / 109 rem ladder using range syntax. `100dvw` in the
absolute-positioned author block. The epigraph wrapped in `min(100%, …)`.

**Gap.**
1. **`a11y.css` still uses `95.99rem` / `96rem`** for the footnote
   popover breakpoint pair. Inconsistent with `ar5iv.css`'s post-cleanup
   `< 96rem` / `>= 96rem` discipline. One-line correction.
2. **Container queries** are still not adopted. The single most
   compelling case is the sidenote ladder (seven media queries
   between `ar5iv.css:575` and `:668`): the decision "sidenote in
   margin vs inline popover" depends on the *article's* width, not
   the viewport's.
   Embedded readers, side-by-side layouts, and PDF-export iframes
   currently get mis-classified. **Caveat for the pilot:** giving
   `.ltx_document` `container-type: inline-size` also makes it a
   containing block for `position: absolute / fixed` descendants —
   today the absolutely-positioned author-block (`ar5iv.css:457-466`)
   anchors to the viewport via `100dvw`, so it might re-anchor.
   Verify before claiming the pilot is clean.
3. **Reflow at 320 CSS-px / 400 % zoom** (WCAG 2.1 SC 1.4.10) has had
   only spot fixes. The known suspects per the starting audit:
   - Chrome's footnote horizontal-scroll (`ar5iv.css:555-558` —
     author-acknowledged with a flag).
   - Wide tables: `overflow-x: auto` at `ar5iv.css:1838-1841` is a
     reasonable last resort, not a column-stacking solution.
   - The blockquote `:before/:after` decoration (`ar5iv.css:1282-1304`)
     paints outside the parent on narrow viewports.
4. **Wide-content escape is a design opportunity, not a gap.** Wide
   tables today get `overflow-x: auto` — a legitimate stance.
   Modern reading themes (Tufte-style, Medium-style) escape the
   column instead; ar5iv could offer that pattern as an opt-in for
   authors who want it. Listing it here so we don't lose track,
   not because the current behaviour is broken.

**Shape of the fix.**
- Fix the `a11y.css` breakpoint mismatch immediately (drop the `.99`).
- Container-query pilot: add `container-type: inline-size` to
  `.ltx_document`. Wrap the existing viewport MQs in a `@supports
  (container-type: inline-size)` block, with `@container` equivalents
  inside. Keep the viewport fallback for one release.
- Reflow audit *as a checklist*, not a sweep. Document each failure
  with a paper reference and pick a fix per-site.

### F. Internationalisation / RTL

**Current.** One logical property in the file (`max-inline-size`).
`hyphens: auto` applied without `:lang()` partitioning. RTL renders
mirrored incorrectly.

**Gap.** Pure-physical layout. Cannot serve RTL papers (Arabic, Hebrew)
acceptably without a manual flip.

**Shape of the fix.** A section-by-section walk — NOT a global
find/replace. The starting audit named the trap: `text-align: right` on
an English numeric column should *not* mirror under RTL. Realistic
phases:
- Walk each section banner; convert
  `margin-left/right` → `margin-inline-start/end`,
  `padding-left/right` → `padding-inline-{start,end}`,
  `text-align: left/right` → `text-align: start/end`
  **only where mirroring is desired**.
- Keep physical for: numeric-column alignment, the blockquote
  `:before/:after` decoration (positioned for a specific visual edge),
  border-bottom underline patterns.
- Add `:lang(zh), :lang(ja), :lang(ko), :lang(th) { hyphens: manual; }`
  only if a live document surfaces a problem — browsers already gate
  hyphenation on `lang`, so the present rule is *probably* harmless;
  fix on evidence.

### G. Math & SVG depth

**Current.** Token-aware. `--svg-text-size` compensates for Noto Sans
metrics inside `foreignObject`. The 7-mrow heuristic catches
"oversized formula" cases. Image dark-mode filter is *global*.

**Gap.**
1. **No opt-out for the global image filter.** User-uploaded plots
   may not want `brightness(0.8) contrast(1.2)`. A `class="ltx_no_dark_filter"`
   escape hatch is one line and would let LaTeXML (or authors) opt
   specific figures out.
2. **MathML focus styling kills the ring on interactive
   descendants too.** The current `a11y.css` rule
   (`math :focus-visible { outline-color: transparent }`) uses
   the descendant combinator, so it leaves the ring intact on
   the `<math>` root but suppresses it on every focusable
   descendant — including `<a>` operators, focusable
   annotations, and MathJax `[tabindex]` elements that a sighted
   keyboard user might actually be navigating to. The fix is to
   keep the suppression for non-interactive math elements only,
   e.g. `math :focus-visible:not(:is(a, button, [tabindex]))`,
   so interactive descendants keep a visible target.
   (Screen-reader users don't need a ring; this is a
   sighted-keyboard concern.)
3. **`mtd` cell padding** is hard-coded (`0.1rem`); should be a
   token aligned with the future spacing scale.
4. **The 7-mrow heuristic** is pragmatic but brittle — it fires on
   any p with a 7th-mrow descendant, regardless of whether the
   formula is *actually* wide. The right fix is a positive class
   on long equations, e.g. `:has(> math.ltx_long)`, so the rule
   reads "this equation was explicitly tagged as long" rather than
   "this equation has many mrows". The class would need to come
   from LaTeXML.

### H. Selector hygiene

**Current.** Zero `:is()` / `:where()`. Long selector lists exist
(esp. `.ltx_border_*`, `.ltx_align_*`, `.ltx_tag_*`, the footnote
popover triggers).

**Gap.**
- The 8 single-property `.ltx_border_{t,r,b,l,T,R,B,L}` and matching
  double-line / dashed variants are screaming for a compressed form.
- The 4 `.ltx_align_{left,right,center,justify}` declarations.
- The footnote popover selector clusters (`ar5iv.css:615-697`) repeat
  the same pseudo-class fork (`:hover, :active`, soon `:focus-within`)
  across half a dozen contexts.
- The 5-deep `:not(.ltx_flex_cell):not(.ltx_figure):not(...)` chain
  (`ar5iv.css:1498-1503`) is correct but unreadable. The right
  rewrite is `:not(:is(.ltx_flex_cell, .ltx_figure,
  .ltx_transformed_inner, .ltx_td, .ltx_th))` — same semantics,
  one set of negations. (Note: `@scope` doesn't help here — it
  scopes a *block* of rules to a subtree, not negation lists.)

**Shape of the fix.** Selector-list compression with **`:where()` for
resets/utilities** and **`:is()` for rules that need specificity**.
Spelled out in `CONTRIBUTING.md` already. Mechanical opportunity is
real but unmeasured until done; expect modest gains in readability
more than in line count.

### I. Performance & distribution

**Current.** `display=swap` on Google Fonts URLs. `font-display:
fallback` on local `@font-face`. `@import` chain still in
`ar5iv-fonts.css`. `unicode-range` absent. No build pipeline; no
minified output; no source maps.

**Gap.**
1. **`@import` chain.** Four `@import url(…)` calls in the font file
   plus three in `ar5iv.css`. Browsers discover each child only after
   its parent is parsed → the CSSOM critical path is staircased.
2. **No `<link rel="preconnect">` guidance for the host HTML.** Even
   if we don't ship HTML, the README should call this out.
3. **`unicode-range` subsetting** absent on local `@font-face` blocks.
   Modest impact (CDN-hosted Noto is already subset) but real for the
   air-gapped path.
4. **No bundle / no minified output.** A consumer importing
   `ar5iv-css` gets the ~73 KB authored source as-is — closer
   to ~15 KB gzipped, so the network-impact case is modest. The
   stronger argument is *staircase elimination*: the `@import`
   chain currently makes the CSSOM critical path discover each
   file sequentially. Modern CSS tooling can:
   - Concatenate the `@import` chain into a single file
     (eliminates the staircase, not just the bytes).
   - Strip whitespace/comments for a `.min.css` artefact.
   - Emit source maps so the original is line-navigable in
     DevTools.
   (CSS isn't tree-shaken the way JS is — selectors only "run"
   when matched — so the goal is minification + flattening, not
   dead-code elimination.)
5. **`content-visibility: auto` not surveyed.** Long arXiv papers
   (review articles, theses) plausibly benefit from
   `content-visibility: auto` on `section.ltx_section` for
   off-screen layout deferral; we have no measurement of how much.
   Premature adoption is known to break anchor navigation, scroll
   anchoring, and in-page search — so this needs testing on real
   documents before shipping.

**Shape of the fix.** Pick one of two tracks:
- **CSS-only**: collapse the `@import` chain into a single `@import`
  bundle (or document `<link>`-per-stylesheet in the README). Add
  `unicode-range` to local `@font-face`. Audit `content-visibility`
  on a real paper.
- **Build pipeline**: minimal `package.json` script using `lightningcss`
  or `esbuild` for concat+minify+sourcemap. No watcher, no dev server.
  Output `dist/ar5iv.css` and `dist/ar5iv.min.css`. Adds one dev
  dependency.

### J. Tooling / QA

**Current.** No automated tests. No stylelint. The 43 arXiv-ID
regression corpus exists only as comments in the source.

**Gap.** Every change is a perceptual gamble. The starting audit
deferred token scales, container queries, and the logical-property
sweep specifically because there is no harness to validate the
results.

**Shape of the fix.**
- **Render-corpus script.** Extract the arXiv IDs from `ar5iv.css`
  comments. For each, fetch the LaTeXML-rendered HTML (from
  `ar5iv.labs.arxiv.org` or a local cache), apply the local CSS,
  capture screenshots at the documented breakpoints (320, 768, 1280,
  1920). Save under `tools/.cache/snapshots/` (gitignored) and ship
  the baseline as a content-addressed tarball or a dedicated
  `snapshots` branch — *not* loose PNGs in `dist/` (binary churn in
  every PR). Diff against the baseline with a perceptual library
  (e.g. `pixelmatch`) using a pixel-count tolerance: a fixed SSIM
  threshold like 0.999 is too strict in practice, since
  anti-aliasing alone shifts SSIM across Chromium versions. The
  rendering tool (Playwright, Puppeteer, or even Firefox-headless)
  is an implementation detail.
- **stylelint config** with off-the-shelf rules first:
  - `selector-no-id`
  - `declaration-no-important` (warn, with allowlist for the
    inline-style-defeat sites and the transformed-wrappers cluster).
  - `unit-allowed-list`: `rem`, `em`, `%`, `ch`, `dvw`, `dvh` —
    explicitly forbid `px` outside borders that are intentionally
    hairline.
  - **Custom rule (later, optional):** "warn on a bare rem in the
    spacing/type cluster that has a token". This needs a tiny
    stylelint plugin (~80 LoC of JS); worth doing only after the
    scales in §A have settled, otherwise the rule churns with
    every token-name change.
- **No commits-without-render policy** for the in-tree corpus, once
  the script exists. Document in `CONTRIBUTING.md`.

### K. Documentation contracts

**Current.** `CONTRIBUTING.md`, `TOKENS.md`, top-of-file orientation,
and `GLOWUP_WISDOM.md` all exist. `rfc_latexml_custom_properties.md`
documents the `--ltx-*` surface and the `0.8237` background
constant. The RFC also proposes a `--fn-*` API that **doesn't exist
in the CSS**.

**Gap.**
- RFC/code drift on `--fn-*`. Either implement (the §C item) or
  rewrite the RFC to describe what's actually shipped.
- No "theming cookbook". How does a downstream theme override only
  the link colour? Only the dark-mode background? Adopt a third theme?
  We have the tokens; we don't have the recipes.
- `TOKENS.md` is hand-curated. As the scales in §A land, the table
  will sprawl. A small generation script (parse `tokens.css`, emit a
  markdown table) keeps documentation in lockstep.
- The OKLCH `0.7` foreground scale and the HSL `100`/`107` fallback
  asymmetry still aren't justified in the RFC (only the `0.8237`
  background scale is).

### L. Code-smell residue

**Current.** A second tidy pass cleared the major code smells in
iteration 1. What remains is the persistent tail.

**Gap (concrete items).**
- **14 TODOs** still in production CSS. Triage: which need an
  upstream LaTeXML change, which are perceptual judgements waiting
  for the harness, which can just be deleted as stale?
- **`var(--ltx-fo-width, var(--fo_width))`** at `ar5iv.css:1723, 1737`.
  The fallback `--fo_width` (underscore) is never declared anywhere
  in the repo. Either dead code, a typo for `--ltx-fo-width`, or a
  contract with an external stylesheet. Investigate and either
  remove or document.
- **5-deep `:not()` chain** at `ar5iv.css:1498-1503`. Refactor only
  after LaTeXML can mark "layout-managed" containers with a positive
  class.
- **`.ltx_overlay > span:nth-child(2)`** (`ar5iv.css:1915`). Structural
  positional selector — brittle if LaTeXML re-orders. Has a comment;
  upstream class would let us remove the brittleness.
- **`width: inherit !important` on `& *` inside foreignObject**
  (`ar5iv.css:1745`). Necessary breadth, documented; still the kind of
  rule a stylelint pass should *whitelist*, not allow by default.
- **Transformed-wrappers feature flag** (`ar5iv.css:2007-2076`,
  ~50 lines, 6 `!important`s). When the corresponding LaTeXML PRs
  land, this whole block can be deleted. Owner item: track the
  upstream PRs and re-test.

---

## 2. Phased plan

We continue the phase numbering from Phase 5. Each phase is one or
more focused PRs, reversible independently.

**Phase 6 (tooling) is a hard prerequisite for the perceptual phases**
— token migration (Phase 7), container queries (Phase 9), the
logical-property walk and the dark-mode contrast audit (Phase 11) —
because each can shift pixels and we have no way to confirm "only
the pixels we wanted". For the *structural* phases — cascade
maturation (Phase 8), `--fn-*` API and alt theme (Phase 10), build
pipeline (Phase 12), doc/residue work (Phase 13) — Phase 6 is a
**soft** prerequisite: the changes shouldn't move pixels, but
having the harness running protects us against surprises. The
honest recommendation: land Phase 6 first; do not block all
structural work on it if a clear-cut PR is ready.

### Phase 6 — Tooling foundation

> Goal: build the harness that everything after this depends on. No
> CSS edits in this phase.

1. **Render-corpus script** at `tools/render-corpus.{mjs,sh}`.
   - Extract arXiv IDs from `ar5iv.css` comments
     (`grep -oE 'arXiv:[^ ]+|[0-9]{4}\.[0-9]{4,5}|[a-z-]+/[0-9]{7}'`
     to catch both modern and legacy slash-form IDs).
   - Fetch each as HTML and cache under `tools/.cache/html/`.
   - For each ID × breakpoint (320, 768, 1280, 1920 CSS-px) ×
     theme (light, dark, plus a contrast-more pass on a sample),
     render headless and save PNG to `tools/.cache/snapshots/`.
   - A `--diff` mode compares against the committed baseline and
     reports per-pixel deltas above a configurable threshold (start
     loose, tighten with experience).
2. **Baseline.** Ship as `tools/snapshots-baseline.tar.zst` *or* in
   a sibling `snapshots` branch — the diff target is the tarball /
   ref, not loose PNGs polluting normal review.
3. **Single entry-point command** (`npm test`, `make test`, or a
   plain shell script — pick when the implementation lands). Wires
   the fetch, render, and diff together. Document in
   `CONTRIBUTING.md`.
4. **stylelint** with the rules listed in §J. Land as warnings only;
   tighten incrementally.

**Exit.** A clean `npm test` on `main`. A subsequent PR that breaks any
rendered paper is caught.

### Phase 7 — Token-system depth

> Goal: introduce the deferred scales (spacing, type, line-height,
> radius, shadow) and migrate the literals where the substitution is
> mechanical *and* visually confirmed by Phase 6.

1. **Define scales** in `css/ar5iv/tokens.css` under `@layer tokens`.
   Use the histograms in §A to pick anchor values. Document in
   `docs/TOKENS.md`.
2. **Auto-generate the token table.** A short Node script reads
   `tokens.css` and emits a markdown fragment for `TOKENS.md`. Run
   in CI; fail the build if the doc is out of sync.
3. **Migrate literals** in `ar5iv.css` *one cluster at a time*, with
   a render-corpus diff between each cluster. Order:
   - margin/padding (highest-volume, cleanest cluster).
   - font-size (twelve distinct values per §A — most rules will
     map to chosen anchors; outliers stay as literals with a
     comment).
   - line-height (1.5rem dominates; outliers are singletons —
     investigate before substituting).
   - border-radius (single site today; substituting is just to
     future-proof callouts).
4. **Leave genuinely perceptual values alone.** The `0.66rem` margin
   for `.ltx_flex_size_3 .ltx_tabular.ltx_minipage` is *not*
   `--space-md` — it's a hand-tuned interaction with the flex-grow
   ratio.

**Exit.** The biggest clusters (margin, font-size, line-height) read
in token names not literals. No visual regression in the corpus.
Picking a literal exit threshold (e.g. "60 % reduction") is too
prescriptive — some literals legitimately stay.

### Phase 8 — Cascade maturation

> Goal: actually fill the layers declared in Phase 1.

1. **Walk by section banner.** For each section, decide its layer.
   Wrap with `@layer <name> { … }`. Render-corpus diff after each
   section.
2. **Targeted `!important` reduction.** Three categories:
   - **Defensible** (LaTeXML inline-style overrides, transformed-
     wrappers cluster). Leave as-is, comment with reason.
   - **Inter-selector conflicts** (e.g. `text-indent: 2em !important`
     in `.ltx_indent`). Resolve by layer ordering or selector
     specificity. Some will drop out; the exact count is to be
     measured, not predicted.
   - **Stylistic accumulation** (e.g. `width: auto !important` on
     `.ltx_inline-block > .ltx_p`). Investigate per-site; the
     starting audit's "minority can be removed" estimate stands.
3. **Re-check the `!important` inversion** on every move. Document in
   the move-PR description.

**Exit.** Bulk of rules layered. A handful of inter-selector
`!important`s have dropped out (specific count to be measured, not
predicted). `CONTRIBUTING.md` updated with the layer-by-section
map and the cascade-priority rules a downstream consumer needs to
understand.

### Phase 9 — Layout maturity v2

> Goal: container queries, reflow audit, wide-content escape.

1. **Fix `a11y.css` breakpoint mismatch.** One-line drop the `.99`,
   align with `< 96rem` / `>= 96rem`. (Cheap; do first.)
2. **Container-query pilot.** Add `container-type: inline-size` to
   `.ltx_document`. Mirror the sidenote-ladder MQs as `@container`
   rules behind `@supports (container-type: inline-size)`. Diff the
   in-tree corpus *and* a synthetic narrow-iframe case.
3. **Reflow audit at 320 px and 400 % zoom.** 320 px is already a
   Phase-6 baseline viewport; this step is *triaging* the failures
   the harness surfaces at that width. 400 % zoom is a different
   mechanism (resolution-relative, not viewport-width) and needs
   a separate harness mode — note this when Phase 6 lands.
   Known suspects:
   - Footnote horizontal scroll on Chrome (known).
   - Blockquote `:before/:after` overflow (known).
   - Wide-table column stacking — pick *one* strategy: collapse to
     row-style at 320 px, or render a "tap to expand" pop-out.
4. **Wide-content escape (optional).** A `.ltx_full_width`
   utility that breaks out of `--main-width` for tables, listings,
   and full-bleed figures. Land only if Phase 8 leaves headroom.

**Exit.** Sidenote layout makes the right call inside at least one
narrow-embed scenario (synthetic test page; exact width is whatever
real consumer reports surface). No new horizontal scroll at 320 px
on the corpus.

### Phase 10 — Theme extensibility

> Goal: deliver the RFC's `--fn-*` API; ship one alt theme; close the
> OKLCH OS-pref mirror gap.

1. **`--fn-*` author-override surface.** Define
   `--fn-{fg,bg,border,fill,stroke}-color-to-dark-mode` in `tokens.css`,
   each defaulting to the corresponding `oklch(from …)` transform
   currently inlined in `ar5iv.css:113-156`. The five inline transform
   rules then reference the tokens. Update the RFC to describe what
   ships.
2. **Sepia alt theme.** Add `:root[data-theme="sepia"]` and
   `color-scheme: only light`. New tokens:
   `--background-color`, `--text-color`, `--link-text-color`,
   `--note-highlight-color` — keep the sepia palette in
   `tokens.css`. Validate the `--fn-*` API by overriding the
   inversion strategy for sepia (probably *no* inversion — sepia is
   a light theme).
3. **OS-pref mirror for OKLCH inversion.** Per §C: ~20 rule bodies
   of duplication under a new `@media (prefers-color-scheme: dark)`
   wrapper, or a single `@scope` block. `@scope` is already
   Baseline (mid-2024) — the no-`@scope` fallback equals current
   behaviour, so adopting it costs nothing. Document the choice in
   `CONTRIBUTING.md`.
4. **Theming cookbook** in `docs/THEMING.md`: how to override one
   token, how to override the inversion, how to add a third theme.

**Exit.** A downstream consumer can re-skin ar5iv without editing
`ar5iv.css`. One alt theme demonstrates the path end-to-end.

### Phase 11 — Accessibility depth + i18n

> Goal: close the remaining a11y gaps; begin the logical-property walk.

1. **Contrast audit over the full token surface.** Tabulate every
   colour token × every theme combination × every background it
   appears on. Fix the failures token-side. Block the PR on a
   render-corpus diff.
2. **Touch targets.** Inflate `.ltx_note_mark` hit area to ≥ 24×24 px
   via transparent pseudo-element padding. Verify no visual change.
3. **Low-speculation a11y selectors.** Add `[hidden]` (force
   non-rendering) and a `.ltx_sr_only` utility (the standard
   screen-reader-only pattern). These have stable semantics no
   matter what LaTeXML emits. **Defer** skip-links, `<nav>`
   styling, `[aria-expanded]`, `details/summary`, and landmark
   role overrides — those depend on actual upstream emission and
   are better left to UA defaults until LaTeXML's contract is set.
4. **Logical-property walk — pass 1.** Headings, paragraphs, lists,
   ToC entries. Skip table alignment, numeric columns, blockquote
   decoration. Render-corpus diff per section.
5. **`:lang(zh), :lang(ja), :lang(ko), :lang(th) { hyphens:
   manual }`** added once a real document surfaces incorrect
   behaviour. Do not pre-emptively land. (Use the explicit
   multi-selector form — the Selectors-4 comma-list `:lang(a,
   b, c)` is Baseline 2023 but the multi-selector form is
   universally supported and was what the starting audit used.)

**Exit.** Every **token-defined** foreground/background pair audited
and ≥ WCAG AA in both themes; author-colour inversion sampled across
the corpus with no AA failures on common author colours. Logical-
property pass-1 sections render unchanged in LTR; a synthetic RTL
test page renders acceptably (arXiv itself has very few native-RTL
papers, so the test page is the realistic gate).

### Phase 12 — Performance & distribution

> Goal: ship a build pipeline, optimise font loading, document the
> deployment-side bits we can't ship from a CSS-only repo.

1. **Collapse the `@import` chain.** Either:
   - **CSS-only path**: a single bundled `ar5iv.css` produced by a
     build step (preserves source structure under `css/`).
   - **HTML-side guidance**: README block on `<link rel="preconnect">`
     and `<link>`-per-stylesheet, with a sample integration snippet.
2. **`unicode-range`** on local `@font-face` blocks. Test the
   air-gapped path.
3. **Self-host option.** Ship `dist/fonts/` for Noto + Latin Modern
   Math. Provide `ar5iv-fonts-local.css` alongside the existing
   CDN-based file.
4. **Build script.** `npm run build` → concat, minify, sourcemap
   to `dist/`. One dev dependency (`lightningcss`). **Decide
   commit-or-gitignore for `dist/` up front**: committing creates
   a diff on every build (and tempts hand-editing the artefact);
   gitignoring forces a release/publish workflow before consumers
   see updates. For an `npm install`-able CSS library, the
   convention is gitignored `dist/` plus a published-to-npm
   artefact built in CI on tag.
5. **`content-visibility: auto`** pilot on `section.ltx_section`,
   gated on `@supports`. Validate that anchor navigation and
   in-page search still work via the corpus harness.

**Exit.** A consumer can `npm install ar5iv-css` and get a built
bundle, *or* follow a README integration recipe that produces
equivalent loading characteristics. If `content-visibility` lands,
its first-paint impact is measured (pick a long arXiv paper from
the corpus as the baseline) — never asserted.

### Phase 13 — Documentation finalisation + sunset of code-smell residue

> Goal: close the long tail. Probably rolling, not a single PR.

1. **TODO triage.** Each of the 14 TODOs gets one of four labels:
   `upstream-blocked` (needs a LaTeXML change), `harness-pending`
   (needs a visual diff to confirm), `resolved` (the underlying
   issue has been fixed elsewhere; comment is now stale), or
   `delete` (never relevant). Acted on accordingly.
2. **`--fo_width` resolution.** Investigate the legacy underscore
   fallback; either remove or document its external contract.
3. **MathML focus styling refinement.** Restore a toned-down ring on
   root `math`, suppress only on descendants.
4. **5-deep `:not()` refactor.** Conditional on LaTeXML adding a
   positive-class marker for layout-managed containers.
5. **Theming cookbook expansion.** Cover the sepia/high-contrast/
   third-theme recipes; the `--fn-*` override flow; the override-
   token pattern for *one* of each: a single colour, the full
   palette, the inversion strategy.

---

## 3. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 6 harness is brittle (network flakes, ar5iv.labs availability) | medium | high | local HTML cache; allow per-paper opt-out |
| Token scale chosen wrongly; widespread visual drift | medium | high | one cluster per PR; render-diff per PR |
| Layering moves change downstream consumers' specificity | medium | medium | document each move in PR description; cross-link to CONTRIBUTING |
| Container-query pilot regresses sidenotes on real papers | low | high | viewport-MQ fallback for one full release; gate on `@supports` |
| `--fn-*` API ships but no theme uses it | medium | low | the sepia theme is the proof; document the recipe |
| `content-visibility: auto` breaks anchor navigation in long papers | medium | high | gate on `@supports`; verify with anchor-jump test in the harness |
| stylelint warnings explode and team disables the tool | high | medium | land as warnings only at first; promote rules one at a time after triaging warnings; allowlist the inline-style-defeat sites and the transformed-wrappers cluster up front |
| Build artefact diverges from source | medium | medium | source maps; CI step that re-builds and diffs against committed `dist/` |
| RTL walk over-mirrors numeric tables | medium | medium | section-by-section, not global; manual review per section |
| OS-pref mirror duplicates ~20 rule bodies | low | low | accept the duplication, or use `@scope` (Baseline mid-2024 — already shipped in target browsers; fallback equals current behaviour, so no regression on older browsers) |

---

## 4. Out of scope (for this iteration)

- A redesign. The visual identity stays put; we're hardening.
- A JS layer. ar5iv-css is CSS only; theme toggling is the host
  application's job.
- A general-purpose component library. We style what LaTeXML emits,
  not arbitrary HTML.
- Replacing `.ltx_*` class names — that contract is LaTeXML's.
- Anything that requires a LaTeXML release. The upstream-blocked
  items in this iteration are: focusable footnote mark (iteration-1
  Phase 2.2a — keyboard footnote popovers need a focusable
  element), positive `.ltx_long` class on long equations (§1.G #4),
  and a positive layout-managed class to retire the 5-deep `:not()`
  chain (§1.L). Track separately in upstream issues.

---

## 5. Progress log

> Append-only. ISO-8601 date. Phase numbers reference §2. Brief
> entries preferred; multi-line is acceptable for substantive
> critique passes that span many sections.

- **2026-05-13** — End of first iteration (Phases 0–5). Tokens
  introduced, a11y module landed, `light-dark()` adopted, OKLCH
  inversion gated, breakpoints rationalised, print stylesheet landed.
  Full record in `GLOWUP_WISDOM.md`.
- **2026-05-13** — This document drafted. Twelve categories
  catalogued for iteration 2; eight phases planned (6–13).
- **2026-05-13** — Critique pass: corrected the `!important` count
  (37 → 27; the original grep matched comments), softened the
  "1/194" logical-property framing (most physical-direction sites
  legitimately stay physical), dropped fabricated contrast numbers
  in §1.D, fixed WCAG citation (2.5.5 AAA → 2.5.8 AA Min), restored
  the `.ltx_document` containing-block caveat for the container-
  query pilot, flagged the RFC's overly-broad `[style*="color:"]`
  selector, noted `@scope` baseline maturity, replaced "SSIM ≥
  0.999" with a perceptual-diff-with-tolerance approach, moved
  snapshot output out of `dist/`, deferred `details/summary` and
  `[aria-expanded]` styling until LaTeXML emits them, separated
  "structural" from "perceptual" phases re: Phase 6 prerequisites,
  and grounded the "production-ready" definition concretely.
- **2026-05-13** — Set up `examples/` (gitignored) with a
  `fetch.sh` that pulls an arXiv ID from ar5iv.labs.arxiv.org and
  rewrites the two repo-owned stylesheets to local paths; chrome
  CSS, logo, sibling-page links are absolutised back to the live
  site so the page renders end-to-end. Bridges the gap until the
  Phase 6 harness lands — supports manual eyeball checks now.
- **2026-05-13** — Second critique pass: reconciled three
  count/value inconsistencies between §A/§C/§E and the Phase plans
  (font-size 12 vs 6; mirror lines 20 vs 24; sidenote MQs 7 vs 6);
  corrected technical confusions (`@scope` ≠ negation flattener,
  use `:not(:is(...))`; the 7-mrow rewrite needs a positive
  `.ltx_long`, not `:not(.ltx_short)`; "untreeshaken" was the wrong
  framing for CSS; MathML focus ring is a sighted-keyboard concern,
  not a screen-reader one); deferred speculative skip-link/role
  styling alongside `details/summary`; reframed wide-content
  popout as an opportunity not a gap; downgraded "@layer wired"
  to ⚠️; updated stale `@scope` "when it ships" references;
  corrected the out-of-scope cross-references to actual upstream-
  blocked items; tightened the production-ready definition to
  acknowledge that exhaustive auditing of author-colour inversion
  is impossible.
- **2026-05-13** — Caught a real iteration-1 regression: the
  `flow-root` swap on `.ltx_page_content` pushed the document title
  ~2 rem lower than before, because the new BFC blocked the
  parent-first-child margin collapse that the original `:after`-only
  clearfix preserved. Fix: dropped `margin-top: 2rem` from
  `.ltx_document`. Full write-up in `GLOWUP_WISDOM.md`. Strongest
  case yet for Phase 6's mechanical pixel-diff: human review
  did not catch this in two prior passes.
- **2026-05-13** — Third critique pass: corrected `.ltx_sr_only`
  description (visually hidden, AT-announced — opposite of how I
  had it); fixed the MathML focus claim (current rule already
  preserves root; real bug is killing rings on interactive
  descendants); withdrew the unsupported "31 → 27 because of
  vendor prefixes" attribution (vendor-prefix transitions weren't
  `!important`); reframed line-height as "less of a ladder",
  not "cleaner"; resolved the Phase 9 vs Phase 6 double-counting
  of the 320 px viewport; switched the i18n plan to the
  multi-selector `:lang()` form for portability; calibrated the
  bundle-size argument with the ~15 KB gzipped reality;
  acknowledged that the eight section banners are too coarse for
  Phase 8's "walk by section banner" without sub-section
  judgement; specified `dist/` commit-vs-gitignore disposition;
  noted that the `[hidden]` issue isn't UA-default but our own
  `display:` overrides defeating it.
- _(next)_ — Phase 6.1: render-corpus script. No CSS edits.
