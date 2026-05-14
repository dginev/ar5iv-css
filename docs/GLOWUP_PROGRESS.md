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
| Override-friendly cascade for downstream themes (`@layer`) | ⚠️ order declared, bulk un-layered |
| Demonstrated extensibility (at least one alt theme) | ❌ no consumer yet |
| Repeatable visual-regression check | ❌ human eye only |
| Build / distribution (`dist/`, minified, source-map) | ✅ `npm run build` → `dist/ar5iv.min.css` + map via lightningcss; jsDelivr/unpkg distribution recipe in README |
| Code-quality enforcement (stylelint or equivalent) | ❌ none |
| Theming cookbook (recipes beyond the RFC's worked example) | ❌ |

Seven ❌ rows and two ⚠️ rows on a sixteen-row checklist. Seven ✅.
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

### 2. Reflow audit at 320 CSS-px and 400 % zoom (WCAG 1.4.10)

Real conformance gap, partially addressed (epigraph wrapped in
`min(100%, …)`, author block on `100dvw`). Never systematically
swept. Known suspects: Chrome footnote horizontal scroll
(`ar5iv.css:555-558` author-acknowledged), blockquote
`:before/:after` overflow, wide-table column stacking. Can be
triaged by hand in DevTools' responsive mode; #1 makes it
*faster and safer*, not a hard prerequisite.

### 3. Logical-property walk for i18n / RTL

LaTeXML can convert non-English and RTL papers; ar5iv-css doesn't
currently render them correctly (one logical-property site in the
file; the rest is physical). Case-by-case per section — numeric
columns and blockquote decoration stay physical. #1 protects
against accidental LTR regression but isn't strictly required:
visual diff against the existing in-tree corpus catches most cases.

### 4. Spacing / type / line-height scales as tokens

The typographic grammar is expressed as ~60 distinct `rem` literals
today. Tuning the design requires grep, not a single token edit.
Scale anchors documented in the frozen `GLOWUP_PHASE2_AUDIT.md` §A.
#1 makes cluster-by-cluster migration safer; without it, the
`examples/` fetch-and-eye loop is the fallback (slower, but works).

### 5. Cascade maturation — fill the `@layer` order

`tokens` and `base` (via a11y.css) inhabit named layers; `print`
and `dark-mode` are imported un-layered; ~2,400 lines of `ar5iv.css`
are un-layered. Filling the named layers lets `@layer`-using
downstream themes override without specificity wars. Rare today,
non-zero. Per the iteration-2 wisdom note: most consumers using
`!important` or specificity-based overrides are *unaffected* by
this change.

### 6. Container-query pilot on the sidenote ladder (hypothesis)

The sidenote layout currently switches on viewport width. *Hypothesis*
(not empirically verified): in a narrow embedding iframe with a wide
host viewport, the sidenote ladder picks the wrong band — needs an
actual test page before this becomes a justified item. Side effect to
verify: `.ltx_document { container-type: inline-size }` re-anchors
absolute/fixed descendants (today's absolute author block uses
`100dvw`, so the side effect may bite).

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

### 9. Demonstrated extensibility — shipped theme *or* worked example

Two ways to prove the token surface generalises beyond the
light/dark pair: (a) ship an additional `data-theme="sepia"` /
`data-theme="high-contrast"` as a first-party variant, or (b)
walk a downstream-override example in `docs/THEMING.md` that
re-skins ar5iv-css without forking. (b) is the cheaper proof;
(a) is the stronger one because it's exercised on every build.
Pick when an actual user need surfaces.

### 10. Theming cookbook (`docs/THEMING.md`)

The RFC's worked example covers the `--fn-*` override pattern;
a cookbook adds recipes (override one colour; override the
inversion; add a third theme; ship a downstream extension package
cleanly).

## Dependency summary

```
#1 visual-regression harness  (no dependency)
  ↘ soft: faster/safer for #2, #3, #4 — not a gate
       (the examples/ fetch-and-eye loop is the fallback)

#4 typography scales  ──hard──→  #8 stylelint bare-rem rule
                                 (the rule needs the tokens to exist;
                                 stylelint's !important and physical-
                                 direction rules can ship without #4)

#5 cascade maturation        (independent)
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
