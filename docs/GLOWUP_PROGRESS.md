# GLOWUP_PROGRESS — iteration 3 punch list

> Iteration 2 closed with a long deferred-per-YAGNI list. That was
> the right call for the immediate sprint, but the original brief
> asked for *best-in-class*. A theme can be production-ready and not
> best-in-class — the difference being roughly "works for the user
> we have now" vs "ready for any plausible user on any device".
>
> Frozen archives: `GLOWUP_AUDIT_START.md` (pre-iter-1),
> `GLOWUP_PHASE2_AUDIT.md` (pre-iter-2). Wisdom record:
> `GLOWUP_WISDOM.md`.

## How to pick this up

Standing workflow for each iteration-3 item, in order:

1. **Verify build clean** before starting: `npm run build` should
   succeed on `main`/`glowup` HEAD. lightningcss is strict about
   brace balance, so a clean build is the quickest sanity check.
2. **Open the three demos** for the eyeball-loop fallback:
   ```bash
   ./examples/fetch.sh ar5iv-1910.06709          # baseline math paper
   ./examples/fetch.sh -s arxiv 2407.16893       # moderate colour
   ./examples/fetch.sh -s arxiv 2501.11021       # heavy TikZ colour
   google-chrome examples/ar5iv-*.html examples/arxiv-*.html &
   ```
   The demos are the manual harness while iteration-3 item #1 is
   pending.
3. **Make the change**, ideally as one focused commit per item.
4. **Verify**: `npm run build`, reload the demos, spot-check
   DevTools' computed styles for the affected selectors. Toggle
   `data-theme="dark"` via DevTools console to verify both themes.
5. **Update the status table** and append a `Change log` entry in
   this file in the same commit.
6. **Commit message convention**: lowercase first letter, short
   subject describing the *outcome*, body explaining the *reasoning*
   and any non-obvious choices. Always include the
   `Co-Authored-By:` trailer.

### House conventions

- **YAGNI**: don't ship token surfaces, utilities, or build artefacts
  that have no current consumer. Each iteration-2 case where we
  almost did is recorded in `GLOWUP_WISDOM.md`.
- **`!important` discipline**: only inside the allowlisted clusters
  (transformed-wrappers + the per-rule inline-style defeats).
  Anywhere else, the right answer is a layered rule or a more
  specific selector.
- **Visual changes**: must be intentional. Pixel-shift regressions
  are the class of bug iteration-2 caught twice (`flow-root` title
  drift, fill/stroke colour-space inconsistency); demos help, but
  human review reliably misses small shifts.
- **Tag commits with line numbers** when describing the *intent*
  of a rule in the wisdom log — line numbers drift, but the
  intent claim stays anchored to a moment in time.

## What "best-in-class" means here

To stop the phrase being unfalsifiable, naming the dimensions that
matter for a scholarly-document CSS theme:

| Dimension | Status |
|---|---|
| Light/dark theming | ✅ landed (`light-dark()` + `[data-theme]` + OS-pref + `prefers-contrast: more` + `forced-colors`) |
| Author-colour adaptation (the `--ltx-*` surface) | ✅ landed (`--fn-*` override API) |
| WCAG AA contrast across token surface | ✅ audited and fixed for both themes |
| Focus / target / selection / reduced-motion | ✅ in `a11y.css` |
| Touch-target minimum (WCAG 2.5.8) | ✅ on `.ltx_note_mark` |
| Print | ✅ in `print.css` |
| Typography token system (spacing / type / line-height scales) | ⚠️ spacing scale + prose line-height tokenised; font-size scale deferred (mostly singletons) |
| Reflow at 320 CSS-px and 400 % zoom (WCAG 1.4.10) | ⚠️ four structural fixes landed; full DevTools walk still pending |
| i18n / RTL via logical properties | ✅ ~60 sites converted; LaTeXML-internal `.ltx_border_*` / `.ltx_framed_*` / `.ltx_nopad_*` / `.ltx_align_*` stay physical (LaTeXML emits physical-side semantics) |
| Container-aware layout for embedded / side-by-side readers | ✅ verified not-needed: iframe embedding picks correctly via own-viewport media query; no other consumer in scope |
| Override-friendly cascade for downstream themes (`@layer`) | ✅ bulk in `components`; B1/B3 in `fixes`; transformed-wrappers stays un-layered for !important priority |
| Demonstrated extensibility (at least one alt theme) | ✅ first-party `data-theme="sepia"` + real-world arxiv-browse vendor theme cross-referenced in cookbook |
| Repeatable visual-regression check | ❌ human eye only |
| Build / distribution (`dist/`, minified, source-map) | ✅ `npm run build` → `dist/ar5iv.min.css` + map via lightningcss; jsDelivr/unpkg distribution recipe in README |
| Code-quality enforcement (stylelint or equivalent) | ✅ `npm run lint` with tuned ruleset; allowlisted `!important` as warning |
| Theming cookbook (recipes beyond the RFC's worked example) | ✅ `docs/THEMING.md` with four recipes |

One ❌ row and two ⚠️ rows on a sixteen-row checklist. Thirteen ✅.
Honest verdict: production-ready, not best-in-class — but the gap is
shrinking.

A reader should note the rows mix four kinds of dimension:
**CSS capabilities** (themes, contrast, scales, reflow, RTL,
containers, cascade), **codebase tooling** (visual-regression,
build, stylelint), **documentation** (cookbook), and **validation
artefacts** (alt theme as proof the token surface generalises).
These don't all weigh equally — a stronger argument can be made for
the CSS-capabilities rows than for the others.

## Priority list (flat — tier classifications dropped as forced)

### 1. Visual-regression harness — has retrospective evidence

The iteration-1 `flow-root` swap moved the document title ~32 px
without anyone noticing for the whole iteration-2 critique cycle.
That's the clean case for mechanical pixel-diff: a real, geometric,
unintended change that text review reliably misses. Shape sketched
in the frozen `GLOWUP_PHASE2_AUDIT.md` §J — extract arXiv IDs from
in-tree comments, fetch HTML, capture screenshots across viewport ×
theme, diff against a committed baseline.

(The fill/stroke OKLCH/HSL change is *not* harness evidence — the
output rendered acceptably either way, only the expressed intent was
inconsistent. Stylelint or code review would catch that class;
pixel-diff would just flag a difference and require human judgement
to call it a regression.)

**Next move.** Decide rendering tool (Playwright is the
best-supported via `@playwright/test`; Puppeteer is lighter).
Sketch `tools/render-corpus.{mjs,sh}` that fetches the in-tree
corpus, renders at 320 / 768 / 1280 / 1920 CSS-px × {light, dark},
and writes PNGs under `tools/.cache/snapshots/<id>/`. Use
`pixelmatch` for the diff with a *count* tolerance (not SSIM —
anti-aliasing variance is too high). Baseline shipped as
`tools/snapshots-baseline.tar.zst` so commit history doesn't carry
binary churn. Tie it to `npm test`.

### 2. Reflow audit at 320 CSS-px and 400 % zoom (WCAG 1.4.10) — ⚠️ partial

Structural reflow bugs found by code audit and fixed
2026-05-14:

- **Author-block fly-out** at `ar5iv.css:374-385` used a 52rem fixed
  width plus a negative centering offset that ran off-canvas on
  narrow viewports. Now `width: min(--main-width, 100dvw)` and
  `inset-inline-start: max(0px, …)` clamp both.
- **Conversion-report panel** had `width: var(--main-width)` —
  forced horizontal scroll at <52rem. Now `max-width:
  var(--main-width); width: 100%; box-sizing: border-box`.
- **Title-page image** capped at `max-width: 30rem` overflowed
  20rem viewports. Now `max-width: min(30rem, 100%)`.
- **Footnote popover overflow** — the 20rem-band hover popover
  plus 2rem padding either side computed to 24rem under
  `content-box`. Added `box-sizing: border-box` to both
  small-screen and wide-screen popover rules.
- **Epigraph fly-out math** — width capped at 100% combined with
  margin-inline-start capped at 50% summed to >100% on narrow
  viewports (10rem overflow at 320 CSS-px). Now both share the
  same 50/45 ratio and the same rem cap so the geometry stays
  inside the column at any width.

**Remaining for full WCAG 1.4.10 conformance.** A live
DevTools walk at 320×568 and at 400 % zoom on 1280, scrolling
top-to-bottom on each of the three corpus demos, marking
horizontal-scroll triggers and clipped content. Code audit
catches structural overflow; only an in-browser walk catches
content-driven cases (a long URL in a footnote, a wide formula
straining `.ltx_eqn_table`, a TikZ figure with embedded
ginormous text). Per-site fixes per finding;
`overflow-wrap: anywhere` for URL strings,
`overflow-x: auto` on equation containers if needed.

### ~~3. Logical-property walk for i18n / RTL~~ — ✅ landed 2026-05-14

~60 sites converted to logical equivalents (`margin-inline-*`,
`padding-inline-*`, `inset-inline-*`, `text-align: start/end`,
`border-inline-*`, `float: inline-start/end`, `margin-inline: auto`).
Stays-physical decisions documented in the borders section:
LaTeXML-internal `.ltx_border_l/r/ll/rr/L/R/r_dashed`,
`.ltx_framed_left/right/leftright`, `.ltx_nopad_l/r`, and
`.ltx_align_left/right` keep `left/right` because LaTeXML emits
physical-side semantics in its class names. Listing line-number
gutter, SVG text, verbatim, conversion-report, math-overflow
text-align, and `.ltx_INFO/WARNING/ERROR/FATAL` also stay
physical (intrinsically LTR content streams). Synthetic RTL test
page at `examples/ar5iv-1910.06709-rtl.html`.

### 4. Spacing / type / line-height scales as tokens — ⚠️ partial

Landed 2026-05-14: `--space-xs/sm/md/lg/xl` (0.5/1/1.5/2/4 rem)
and `--line-height-prose` (1.5rem) anchored on the audited
histograms. 45 margin sites and 7 line-height sites migrated.
Long-tail spacing literals (0.1, 0.2, 0.25, 0.3, 0.66, 0.75rem)
stay as literals — each is hand-tuned. Font-size scale deferred:
the histogram is mostly singletons (12 distinct values for ~24
total sites), so a scale would either invent anchors or freeze
hand-tuned values into a fake ladder. Pick up a font-size scale
only if a second sweep finds genuine clusters.

**Remaining next move (font-size sweep).** Re-run the font-size
histogram in a few releases. If anchors emerge for ≥3 consumers
each (e.g. 1.4rem for headings, 0.85rem for notes), promote
those to `--font-size-*`. Until then, the singleton-anchor
overhead isn't worth it.

### ~~5. Cascade maturation — fill the `@layer` order~~ — ✅ landed 2026-05-14

Bulk of `ar5iv.css` now sits in `@layer components`; the B1/B3
known-bug patches at the bottom sit in `@layer fixes`. The
transformed-wrappers feature flag stays un-layered (preserves
`!important` priority over inline LaTeXML transforms). `reset`,
`structure`, `math` are declared but empty — reserved for future
sub-divisions and as override slots for downstream themes.
Verified via the lightningcss build: 11/11 transformed-rule
occurrences un-layered; B1 fix correctly in `@layer fixes`.

### ~~6. Container-query pilot~~ — ✅ closed 2026-05-14 (hypothesis falsified)

Hypothesis-driven step from the iteration-3 plan: build a
synthetic iframe-in-wide-host page, verify whether the sidenote
ladder picks the wrong band. Test page at
`examples/embedded-iframe.html` (a 600 CSS-px iframe inside a
wide host page, both `ar5iv-1910.06709.html` and the
embedded-arxiv variant load fine).

**Result:** the hypothesis is wrong. Inside an iframe with
`<meta name="viewport" content="width=device-width">`, the
`width` media feature evaluates against the iframe's own
viewport (600 CSS-px) and the `@media (width >= 96rem)` query
correctly fails — the narrow-screen sidenote band applies.

Container queries would still be useful for scenarios that
don't exist today (ar5iv embedded directly in a CMS sidebar
without iframe isolation; side-by-side dual-article reader
view). Per YAGNI: defer until a real consumer surfaces. Closed
as no-action with the test page retained for future
re-verification.

### ~~7. Build pipeline + minified bundle~~ — ✅ landed 2026-05-14

`npm run build` → `lightningcss --bundle --minify --sourcemap` →
`dist/ar5iv.min.css` (~46 KB, ~37 % smaller than source) + map.
Inlines the four local `@import`s (tokens, a11y, dark-mode, print)
into a single file; subsumes the iteration-2 `@import` chain collapse
perf item. CDN integration recipe in `README.md`
(jsDelivr/unpkg auto-mirror after `npm publish`). Manual publish for
now; the GH-Actions tag-push variant is deferred until the manual
flow is proven once.

### ~~8. stylelint with a tuned ruleset~~ — ✅ landed 2026-05-14

`npm run lint` runs `stylelint-config-standard` plus rule
overrides in `.stylelintrc.json`. `declaration-no-important` is
on at warning severity; the 45 surviving warnings all sit in the
allowlist (transformed-wrappers feature flag + per-rule
inline-style defeats in `ar5iv.css`; `[hidden]` reset in
`a11y.css`; the print override stack in `print.css`). First run
also surfaced 10 hard errors that became real cleanups: four
deprecated `word-wrap` → `overflow-wrap` substitutions, one
deprecated `word-break: break-word` keyword, four legacy
single-colon `:before` / `:after` pseudo-elements promoted to
double-colon, and one dead rule (`span.ltx_personname span:first`
— `:first` is not a valid pseudo-class outside `@page`; the rule
has been silently inert since it was written). Bare-rem rule
deferred per the original next-move: now that #4 has tokenised
the spacing scale, a future custom plugin could enforce
"prefer `--space-*` over bare rem" — but it's ~80 LoC of churn
risk for marginal value, deferred until a second offender ships.

### ~~9. Demonstrated extensibility~~ — ✅ landed 2026-05-14

Both paths shipped:

- **Path (a)** — first-party `data-theme="sepia"` variant in
  `css/ar5iv/tokens.css`. Validates the palette-token override
  pathway (it's exercised on every build and lint). Demo at
  `examples/ar5iv-1910.06709-sepia.html`.
- **Path (b)** — `docs/THEMING.md` (item #10) cross-references
  the production arxiv-browse `arxiv-html-papers-*.css` /
  `arxiv-html-papers-theme-*.css` stack. The cross-check
  surfaced a real cookbook gap (the `--text-color-author-black-dark`
  token was not mentioned as the answer to the arxiv-browse
  TODO comment about the author-black rescue); fixed in the
  same commit. Also added an "Extending the token surface"
  section after recipe 3 covering net-new tokens for downstream
  chrome (headers, footers, nav), which the arxiv-browse stack
  exercises heavily but the cookbook had only implied.

### ~~10. Theming cookbook (`docs/THEMING.md`)~~ — ✅ landed 2026-05-14

`docs/THEMING.md` with four recipes: override one palette colour;
change the dark-mode inversion strategy (three variants); add a
third `data-theme` value (sepia + high-contrast); ship a downstream
npm package with `@layer myTheme` ordering. Linked from README +
CONTRIBUTING. Pitfalls section documents the `light-dark(var(),
var())` caveat, `color-scheme` requirement per `data-theme`,
`@layer` first-appearance ordering, and the `!important` inversion
rule.

## Dependency summary

```
#1 visual-regression harness  (no dependency)
  ↘ soft: faster/safer for #2, #3, #4 — not a gate
       (the examples/ fetch-and-eye loop is the fallback)

#4 typography scales  ──hard──→  #8 stylelint bare-rem rule
                                 (the rule needs the tokens to exist;
                                 stylelint's !important and physical-
                                 direction rules can ship without #4)

#5 cascade maturation        ✅ done
#6 container-query pilot     (independent, after verification)
#7 build pipeline            ✅ done
#9 demonstrated extensibility (independent)
#10 theming cookbook         (independent; #9(b) overlaps with it)
```

Hard dependency: only `#4 → #8` (for one of stylelint's rules).
Everything else is soft. #1 is justified by the iteration-2
flow-root regression evidence; the others are best-in-class gaps
without retrospective impact evidence.

## Out of scope (will stay deferred)

- A redesign, a JS layer, a general-purpose component library,
  renaming `.ltx_*` classes. CSS-only repo.
- `unicode-range` on local fonts, `content-visibility: auto` —
  measurable-but-unmeasured perf items. Pick up only once first
  paint has been actually instrumented.
- `TOKENS.md` auto-generation. Small doc; hand-curation still fine.

## Upstream-blocked (tracking only, no CSS task)

- Focusable footnote mark (LaTeXML PR).
- Positive `.ltx_long` class on long equations.
- Positive layout-managed class to retire the `:not(:is(…))` chain
  and the `.ltx_overlay > :nth-child(2)` positional selector.
- LaTeXML `\scalebox` / `\resizebox` HTML output — when stable, the
  ~50-line transformed-wrappers feature flag deletes cleanly.

---

## Change log

- **2026-05-13** — Fill/stroke OKLCH/HSL inconsistency cleaned up.
  Pre-iter-1 code used HSL for fill/stroke even inside the
  OKLCH-supports branch. The rendered output was correct, but the
  expressed intent was inconsistent. Now: fill uses the bg scale
  (0.8237), stroke uses the fg/border scale (0.7), under both
  branches.
- **2026-05-13** — Iteration 2 declared not-yet-best-in-class.
  Iteration-3 punch list opened with explicit dimension-by-dimension
  checklist and a flat priority order.
- **2026-05-13** — Critique pass: dropped the "strongest CSS for
  LaTeXML-rendered arXiv articles" comparative overclaim; removed
  the fill/stroke from harness retrospective evidence (rendered
  output was fine; intent was off — different class of issue);
  moved the reflow audit down from Tier 1 since it lacks
  retrospective-impact evidence (it's a real WCAG gap, just not
  one we have a story for being missed today); dropped the loose
  tier classification in favour of a flat priority list; added an
  explicit dependency diagram; flagged that the container-query
  benefit is a hypothesis not a finding; defined "best-in-class" as
  a sixteen-row dimension checklist rather than a vibe.
- **2026-05-13** — Second critique pass: fixed ❌/⚠️ count (8/2
  not 8/3); corrected the layer claim (`print` is *not* in a named
  layer; only `tokens` and `base`); softened the hard-vs-soft
  dependency framing on #2/#3/#4 (harness makes the work
  faster/safer, doesn't gate it — fallback is the
  `examples/` fetch-and-eye loop); rewrote the dependency diagram
  to mark only the genuinely-hard `#4 → #8` dependency as hard;
  swapped the "ar5iv aspires globally" framing for the more
  accurate "LaTeXML can convert non-English / RTL papers; ar5iv-css
  doesn't currently render them correctly"; dropped the `lightningcss`
  prescription in favour of tool-choice-defers-to-PR; reframed
  "demonstrated extensibility" to allow either a shipped alt theme
  *or* a worked override example in the cookbook; flagged that #7
  build pipeline implicitly subsumes the iteration-2 `@import`
  chain collapse item; added a note that the dimension checklist
  mixes four kinds of dimension (CSS capabilities, tooling, docs,
  validation) that don't weigh equally.
- **2026-05-14** — Iteration-2 work committed as three commits
  (`6c54c29` CSS substance, `39cbcb8` docs sync, `fc43f10` build
  pipeline). Item #7 of the iteration-3 punch list landed: `npm run
  build` produces `dist/ar5iv.min.css` (~46 KB minified, source
  inlined from the four `@import`s) via `lightningcss-cli`; CDN
  integration recipe in `README.md` for `cdn.jsdelivr.net/npm` and
  `unpkg.com`; `dist/` gitignored, shipped via `npm publish` (manual
  for now). Status table updated 8❌/2⚠️/6✅ → 7❌/2⚠️/7✅.
- **2026-05-14** — Item #5 landed: the bulk of `ar5iv.css` now sits
  in `@layer components`; B1/B3 fixes in `@layer fixes`; the
  transformed-wrappers feature flag stays un-layered. Pragmatic
  two-layer split — `reset`, `structure`, `math` are declared but
  empty, reserved as override slots for downstream themes. Verified
  via lightningcss build (transformed-wrappers correctly un-layered,
  B1 fix in `fixes`). CONTRIBUTING.md updated with the new
  placements. Status table 7❌/2⚠️/7✅ → 7❌/1⚠️/8✅.
- **2026-05-14** — Item #9 landed both paths. Path (a):
  first-party `data-theme="sepia"` declared in
  `css/ar5iv/tokens.css` with cream/brown palette overrides, no
  `--fn-*` inversion (the application rules' gate doesn't fire
  for `sepia`), and a synthetic demo at
  `examples/ar5iv-1910.06709-sepia.html`. Path (b): the user
  pointed at the production arxiv-browse stack
  (`arxiv-html-papers-20260131.css` + theme variant) as a real
  in-the-wild consumer; the cookbook (#10) now cites it as the
  validation case. The cross-check surfaced one real gap: the
  downstream had a TODO comment about wanting a dedicated token
  for the dark-mode author-black rescue, which iteration 2
  introduced as `--text-color-author-black-dark` but the
  cookbook hadn't called out. Cookbook updated with a
  short callout in recipe 2 and a new "Extending the token
  surface" section covering net-new downstream tokens (headers,
  footers, nav) — these are common in real themes but only
  implicit in recipe 4. Status table: 2 ❌ / 2 ⚠️ / 12 ✅ →
  1 ❌ / 2 ⚠️ / 13 ✅.
- **2026-05-14** — Item #6 closed: hypothesis falsified. The
  iframe-in-wide-host test (`examples/embedded-iframe.html`)
  confirmed that the sidenote-ladder media query evaluates
  against the iframe's own viewport when
  `width=device-width` is declared in the iframe's HTML — which
  every LaTeXML output declares. So the predicted misclassification
  doesn't happen. Container queries deferred per YAGNI until a
  real consumer surfaces (e.g. ar5iv embedded in a CMS sidebar
  without iframe isolation). Status table: 3 ❌ / 2 ⚠️ / 11 ✅ →
  2 ❌ / 2 ⚠️ / 12 ✅.
- **2026-05-14** — Item #2 landed (partial — ⚠️): five structural
  reflow bugs identified by code audit and fixed (author-block
  fly-out width/offset clamps, conversion-report panel
  max-width, title-page image clamp, footnote popover
  `box-sizing: border-box` in both bands, epigraph width/margin
  ratio fix that prevented a 10rem overflow at 320 CSS-px).
  Remaining: a live DevTools walk at 320×568 and 400 % zoom on
  the corpus demos to catch content-driven cases — code audit
  only catches structural overflow.
- **2026-05-14** — Item #8 landed: stylelint with tuned ruleset.
  `npm run lint` against `stylelint-config-standard`;
  `.stylelintrc.json` overrides allowlist `!important` (warning),
  ignores LaTeXML-driven naming conventions, and exempts
  `light-dark()` from `function-no-unknown`. First run surfaced
  10 real errors that became part of the same commit: four
  deprecated `word-wrap` → `overflow-wrap` substitutions, one
  deprecated `word-break: break-word` keyword, four legacy
  single-colon `:before` / `:after` promoted to double-colon, and
  one silently-dead rule (`span:first` is invalid outside `@page`).
  CONTRIBUTING.md updated with the lint workflow. Status table:
  4 ❌ / 2 ⚠️ / 10 ✅ → 3 ❌ / 2 ⚠️ / 11 ✅.
- **2026-05-14** — Item #4 landed (partial — ⚠️): spacing scale and
  prose line-height tokenised in `css/ar5iv/tokens.css`
  (`--space-xs/sm/md/lg/xl` mapping to 0.5/1/1.5/2/4 rem and
  `--line-height-prose: 1.5rem`). Migrated 45 margin literals and
  7 `line-height: 1.5rem` sites to the tokens. Long-tail values
  (0.1, 0.2, 0.25, 0.3, 0.66, 0.75 rem) stay as literals — each
  is hand-tuned. Font-size scale deferred: histogram is mostly
  singletons. Also fixed stale colour values in TOKENS.md (the
  iteration-2 contrast bumps for `--email-link-color`,
  `--info-text-color`, `--error-text-color`) and added their
  computed-on-light/dark contrast ratios. Status table:
  5 ❌ / 1 ⚠️ / 10 ✅ → 4 ❌ / 2 ⚠️ / 10 ✅.
- **2026-05-14** — Item #3 landed: logical-property walk through
  `ar5iv.css`. ~60 sites converted to inline-direction equivalents
  (`margin-inline-*`, `padding-inline-*`, `inset-inline-*`,
  `text-align: start/end`, `border-inline-*`, `float:
  inline-start/end`, `margin-inline: auto`). LaTeXML-internal
  classes with physical-side suffixes (`.ltx_border_l/r/...`,
  `.ltx_framed_left/right/...`, `.ltx_nopad_l/r`,
  `.ltx_align_left/right`) stay physical, with an explanatory
  comment in the borders section. Intrinsically-LTR content
  streams (listing line-number gutter, SVG text, verbatim,
  conversion-report, math-overflow alignment,
  `.ltx_INFO/WARNING/ERROR/FATAL`) also stay physical. Synthetic
  RTL demo at `examples/ar5iv-1910.06709-rtl.html` (gitignored).
  Status table: 6 ❌ / 1 ⚠️ / 9 ✅ → 5 ❌ / 1 ⚠️ / 10 ✅.
- **2026-05-14** — Item #10 landed: `docs/THEMING.md` shipped with
  four cookbook recipes (single-token override; three
  inversion-strategy variants including `color-mix()`; third
  `data-theme` value with sepia + high-contrast walk-throughs;
  downstream-npm-package distribution with `@layer myTheme`).
  Linked from README + CONTRIBUTING. Status table
  7❌/1⚠️/8✅ → 6❌/1⚠️/9✅. Path-(b) of item #9 is now covered
  by the cookbook — path-(a) (a shipped alt theme) still
  available if a user need surfaces.
- **2026-05-14** — Doc-handoff pass: added a "How to pick this up"
  workflow section at the top (build verification, demo loop,
  commit conventions, YAGNI/!important/visual-change house rules);
  added a "**Next move**" paragraph at the end of each unfinished
  item with concrete first-action guidance, tool choices, anti-
  patterns, and verification approach. The doc is now self-contained
  for tomorrow's pickup — no item should require re-discovery from
  the frozen audit archives.
