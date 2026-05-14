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
| Typography token system (spacing / type / line-height scales) | ❌ literals only |
| Reflow at 320 CSS-px and 400 % zoom (WCAG 1.4.10) | ⚠️ spot fixes only |
| i18n / RTL via logical properties | ❌ one site, the rest physical |
| Container-aware layout for embedded / side-by-side readers | ❌ viewport-only |
| Override-friendly cascade for downstream themes (`@layer`) | ✅ bulk in `components`; B1/B3 in `fixes`; transformed-wrappers stays un-layered for !important priority |
| Demonstrated extensibility (at least one alt theme) | ❌ no consumer yet |
| Repeatable visual-regression check | ❌ human eye only |
| Build / distribution (`dist/`, minified, source-map) | ✅ `npm run build` → `dist/ar5iv.min.css` + map via lightningcss; jsDelivr/unpkg distribution recipe in README |
| Code-quality enforcement (stylelint or equivalent) | ❌ none |
| Theming cookbook (recipes beyond the RFC's worked example) | ✅ `docs/THEMING.md` with four recipes |

Six ❌ rows and one ⚠️ row on a sixteen-row checklist. Nine ✅.
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

### 2. Reflow audit at 320 CSS-px and 400 % zoom (WCAG 1.4.10)

Real conformance gap, partially addressed (epigraph wrapped in
`min(100%, …)`, author block on `100dvw`). Never systematically
swept. Known suspects: Chrome footnote horizontal scroll
(`ar5iv.css:555-558` author-acknowledged), blockquote
`:before/:after` overflow, wide-table column stacking. Can be
triaged by hand in DevTools' responsive mode; #1 makes it
*faster and safer*, not a hard prerequisite.

**Next move.** Open one demo in DevTools, set viewport to 320×568,
walk the page top to bottom noting horizontal-scroll triggers and
clipped content. Then set browser zoom to 400 % at viewport 1280 ×
and walk again. Each finding gets a per-site fix:
`overflow-wrap: anywhere` for long URLs in footnotes; wrap
absolute-positioned decorations in `clamp(0, ..., …)`; for tables
either `overflow-x: auto` (current behaviour) or a stack-rows
strategy. Verify each fix doesn't regress 768/1280 in the demo
loop. **Anti-pattern**: blanket `min-width: 0` everywhere — it
fixes the symptom but hides the structural issue.

### 3. Logical-property walk for i18n / RTL

LaTeXML can convert non-English and RTL papers; ar5iv-css doesn't
currently render them correctly (one logical-property site in the
file; the rest is physical). Case-by-case per section — numeric
columns and blockquote decoration stay physical. #1 protects
against accidental LTR regression but isn't strictly required:
visual diff against the existing in-tree corpus catches most cases.

**Next move.** Build a one-off synthetic RTL test page (arXiv has
very few native-RTL papers in the corpus): take a demo's HTML,
flip `<html dir="rtl" lang="ar">`, load in Chrome. Then:
1. `grep -nE 'margin-(left|right)|padding-(left|right)|border-(left|right)|^\s*(left|right):\s|text-align:\s*(left|right)' css/ar5iv.css` — produces ~190 sites.
2. Classify each: **mirror** (most cases — convert to
   `margin-inline-start/end`, `padding-inline-*`, `inset-inline-*`,
   `text-align: start/end`) vs **stays physical** (numeric-column
   alignment, blockquote `:before/:after`, border-bottom underlines).
3. Convert in batches by section banner; reload demos in LTR to
   confirm no regression; reload synthetic RTL page to confirm
   the mirror is right.

**Conventions.** `start/end` not `left/right` for text-align. The
`text-align: right` in numeric table columns is the canonical
"don't mirror" case — that's the original audit's example.

### 4. Spacing / type / line-height scales as tokens

The typographic grammar is expressed as ~60 distinct `rem` literals
today. Tuning the design requires grep, not a single token edit.
Scale anchors documented in the frozen `GLOWUP_PHASE2_AUDIT.md` §A.
#1 makes cluster-by-cluster migration safer; without it, the
`examples/` fetch-and-eye loop is the fallback (slower, but works).

**Next move.** Pick anchors first (read PHASE2_AUDIT §A
histograms), define them in `css/ar5iv/tokens.css`, document in
TOKENS.md — but **don't migrate literals yet**. Defining the
scales without consumers is YAGNI; we migrate in the same commit
where we substitute the first cluster. Suggested first cluster:
`margin` 0 / 0.5 / 1 / 1.5 / 2 / 4 rem (six anchors cover ~70 %).
Verify each substitution by demo reload + diff. Leave hand-tuned
non-scale values (e.g. `0.66rem` flex-grow interaction) as
literals with a clarifying comment.

**Conventions.** Scale anchors live in tokens.css. Outliers stay
as literals (a scale step is for *repeated* values; one-off
typography stays raw). The `:where()` wrap is for rules that
consume tokens — *not* for the variable declarations themselves.

### ~~5. Cascade maturation — fill the `@layer` order~~ — ✅ landed 2026-05-14

Bulk of `ar5iv.css` now sits in `@layer components`; the B1/B3
known-bug patches at the bottom sit in `@layer fixes`. The
transformed-wrappers feature flag stays un-layered (preserves
`!important` priority over inline LaTeXML transforms). `reset`,
`structure`, `math` are declared but empty — reserved for future
sub-divisions and as override slots for downstream themes.
Verified via the lightningcss build: 11/11 transformed-rule
occurrences un-layered; B1 fix correctly in `@layer fixes`.

### 6. Container-query pilot on the sidenote ladder (hypothesis)

The sidenote layout currently switches on viewport width. *Hypothesis*
(not empirically verified): in a narrow embedding iframe with a wide
host viewport, the sidenote ladder picks the wrong band — needs an
actual test page before this becomes a justified item. Side effect to
verify: `.ltx_document { container-type: inline-size }` re-anchors
absolute/fixed descendants (today's absolute author block uses
`100dvw`, so the side effect may bite).

**Next move.** First, *verify the hypothesis* before any CSS edit:
build a synthetic `examples/embedded-iframe.html` with
`<iframe src="arxiv-2501.11021.html" width="600">` inside a wide
viewport. If the sidenote ladder picks viewport-1280 layout
despite the iframe being 600 px, the gap is real. **If
hypothesis is wrong** (sidenote picks correctly via some other
mechanism), close as no-action. **If confirmed**: add
`container-type: inline-size` to `.ltx_document`, mirror the
seven `@media` rules in `ar5iv.css:575-668` as `@container`
rules behind `@supports (container-type: inline-size)`, keep
viewport fallback for one release. **Critical verification**:
the absolutely-positioned author block at `ar5iv.css:457-466`
must still anchor correctly to viewport center, not to
`.ltx_document`'s left edge.

### ~~7. Build pipeline + minified bundle~~ — ✅ landed 2026-05-14

`npm run build` → `lightningcss --bundle --minify --sourcemap` →
`dist/ar5iv.min.css` (~46 KB, ~37 % smaller than source) + map.
Inlines the four local `@import`s (tokens, a11y, dark-mode, print)
into a single file; subsumes the iteration-2 `@import` chain collapse
perf item. CDN integration recipe in `README.md`
(jsDelivr/unpkg auto-mirror after `npm publish`). Manual publish for
now; the GH-Actions tag-push variant is deferred until the manual
flow is proven once.

### 8. stylelint with a tuned ruleset

Forbid new `!important` outside allowlisted sites (transformed-
wrappers, inline-style defeats); warn on `margin-left/right` in
favour of logical equivalents; **after #4 lands**, warn on bare `rem`
literals in the spacing/type cluster. Land all rules as warnings,
promote one at a time.

**Next move.** `npm i -D stylelint stylelint-config-standard`. Add
`.stylelintrc.json` with `extends: "stylelint-config-standard"` +
rule overrides:
- `declaration-no-important: [true, { severity: "warning" }]` with
  per-selector `disableFix` for the allowlist.
- `selector-no-id: [true, { severity: "warning" }]`.
- `unit-allowed-list: [ ["rem", "em", "%", "ch", "dvw", "dvh", "vh", "vw"], { severity: "warning" } ]`.
Add `npm run lint` script. Triage warnings before promoting any rule
to error. **Do not** add a custom plugin for the "no bare rem"
rule until #4 has settled — premature plugin code is ~80 LoC of
churn-risk.

### 9. Demonstrated extensibility — shipped theme *or* worked example

Two ways to prove the token surface generalises beyond the
light/dark pair: (a) ship an additional `data-theme="sepia"` /
`data-theme="high-contrast"` as a first-party variant, or (b)
walk a downstream-override example in `docs/THEMING.md` that
re-skins ar5iv-css without forking. (b) is the cheaper proof;
(a) is the stronger one because it's exercised on every build.
Pick when an actual user need surfaces.

**Next move (path b).** Bundled with #10 — the cookbook *is*
the worked example. **Next move (path a).** Pick the theme:
sepia validates *palette* tokens; `data-theme="high-contrast"`
(static replacement for the dynamic `prefers-contrast: more`
override) validates the *override* pathway. Add the new
`:root[data-theme="..."]` block in `tokens.css` setting only the
tokens that change; set `color-scheme: only light` (or only dark);
override `--fn-*-color-to-dark-mode` to `var(--ltx-*-color)` (no
inversion) if it's a light theme. Test via `data-theme="..."` in
DevTools console on a demo.

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
