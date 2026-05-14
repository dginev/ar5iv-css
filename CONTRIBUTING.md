# Contributing to ar5iv-css

Welcome. ar5iv-css styles LaTeXML's HTML output for arXiv articles.
This file orients new contributors; for the longer story of recent
architectural decisions, see `docs/GLOWUP_WISDOM.md`.

## Provenance

ar5iv-css was forked from LaTeXML's bundled `LaTeXML.css`
(`lib/LaTeXML/resources/CSS/LaTeXML.css` in the LaTeXML repo). The
custom properties LaTeXML emits inline (`--ltx-fg-color`,
`--ltx-bg-color`, `--ltx-fo-width`, `--ltx-fo-height`,
`--ltx-fo-depth`, etc.) are an *upstream contract*: LaTeXML
deposits them per-element from its TeX-box machinery, and any
stylesheet for LaTeXML output reads them back. We've diverged
significantly on presentation (ar5iv.css is ~2,500 lines vs
LaTeXML.css's ~600) but the contract surface stays in lockstep.
When LaTeXML adds or changes a custom-property name, ar5iv-css
follows. Vanilla LaTeXML.css is worth checking when adding rules
that consume LaTeXML-deposited inline styles or class names —
the contract may already be documented there.

## Layout of the codebase

```
css/
├── ar5iv.css            ← the main entry point
├── ar5iv-fonts.css      ← @import of remote font sources + local fallbacks
└── ar5iv/
    ├── tokens.css       ← design tokens (single source of truth)
    ├── a11y.css         ← focus, :target, ::selection, reduced-motion, forced-colors
    └── print.css        ← @media print overrides

docs/
├── TOKENS.md            ← reference for every token defined in tokens.css
├── THEMING.md           ← downstream-override cookbook (four worked recipes)
├── GLOWUP_WISDOM.md     ← decisions / surprises uncovered during the modernisation
├── GLOWUP_AUDIT_START.md← read-only snapshot of the initial audit
├── GLOWUP_PROGRESS.md   ← living document; what remains to do
├── rfc_latexml_custom_properties.md ← contract with LaTeXML for inline --ltx-* tokens
└── ar5iv_colors_report.md           ← background on arXiv's colour distribution
```

## Cascade layer order

```css
@layer reset, tokens, base, structure, components, math, fixes;
```

Current placements:
- `tokens` — variable declarations (`css/ar5iv/tokens.css`).
- `base` — additive utilities (focus, `:target`, `::selection`,
  forced-colors, `[hidden]` reset; `css/ar5iv/a11y.css`).
- `components` — the bulk of `css/ar5iv.css` (page chrome, document
  body, paragraphs, frontmatter, footnotes, bibliography, lists,
  tables, math, the whole catalogue of `.ltx_*` rules).
- `fixes` — the B1/B3 known-bug patches at the bottom of `ar5iv.css`.
- `reset`, `structure`, `math` — declared but currently empty.
  Reserved for future sub-divisions and for downstream themes that
  want to slot their own rules between ours.

Two things stay **un-layered**, deliberately:
- The transformed-wrappers feature flag in `ar5iv.css` (its
  `!important` rules need maximum priority to defeat LaTeXML's
  inline `style="transform:…"`).
- `dark-mode.css` and `print.css` imports (their selectors carry
  enough specificity / media-query gating that they don't need a
  layer; staying un-layered keeps them at the top of the cascade).

**Subtlety:** with `!important`, layer order *inverts*. An `!important`
declaration in an earlier layer beats one in a later layer. Un-layered
`!important` beats all named-layer `!important`. If you need a fix to
override *everything*, leave it un-layered (or place it in `reset`
which is the earliest named layer).

## :is() vs :where()

- `:where(…)` has zero specificity — use it for resets and
  default-styling utilities that should lose to any author override.
- `:is(…)` takes the **highest** specificity of its arguments — use it
  for selector-list compression where the rule should keep its
  natural specificity.

## Regression corpus

The CSS file's comments cite 47 distinct arXiv IDs as live test
cases (e.g. `1810.10704`, `astro-ph/0001001`, `2510.11037`). They
are the canonical visual-regression corpus. The full set is
maintained in `examples/fetch-corpus.sh` and consumed by
`tools/visual.mjs`. When you change a rule that cites one of
these IDs in a nearby comment, the harness will render that paper
as part of `npm test` — but it doesn't hurt to also open the
paper locally and eyeball.

## Visual regression

```bash
./examples/fetch-corpus.sh ar5iv               # fetch all 47 corpus papers
                                               # (~120 MB to examples/)
node tools/visual.mjs --update                 # generate baseline
                                               # (~440 MB to tools/baseline/, ~3 min)
npm test                                       # diff against baseline
                                               # (~5 min for the full corpus)
```

`npm test` runs `node tools/visual.mjs`, which uses Playwright +
pixelmatch to compare **fullPage** renders of every corpus paper
at 1280 CSS-px × {light, dark} against PNG baselines under
`tools/baseline/`. fullPage means the entire article scroll height
is captured, not just the frontmatter — a regression in the
bibliography or in a mid-paper figure still flags. Differences
above the per-image pixel-count tolerance (default 400) fail the
run; diff PNGs land in `tools/.cache/diff/` for inspection.

**Baselines are gitignored**, not committed. fullPage rendering of
46 papers × 2 themes is ~440 MB — too large for git history. Each
developer generates locally via `node tools/visual.mjs --update`.
For shared CI verification, a release-artifact tarball at
`tools/snapshots-baseline.tar.zst` is the planned approach
(deferred until the first CI/PR pipeline lands).

After an intentional visual change, refresh the baseline:

```bash
node tools/visual.mjs --update
```

When `npm test` fails, three artefacts help diagnose:
- `tools/.cache/snapshots/<name>.png` — the fresh render
- `tools/.cache/diff/<name>.png` — pink overlay marking differing
  pixels against the baseline
- `tools/baseline/<name>.png` — your local baseline

Open all three side by side in an image viewer (or in the
browser via `file://` URLs). The diff PNG points at *what
moved*; the snapshot vs baseline shows *which direction*.

## Linting

```bash
npm run lint
```

Runs stylelint on `css/**/*.css` with a tuned ruleset
(`.stylelintrc.json`). Errors fail the run; `!important`
warnings are advisory — every current `!important` is in the
allowlist (transformed-wrappers feature flag, per-rule inline-style
defeats in `ar5iv.css`; `[hidden]` reset in `a11y.css`; the print
override stack in `print.css`). New `!important` outside those
clusters should be the exception, justified by a comment.

## Token discipline

Add tokens to `css/ar5iv/tokens.css`. Use `light-dark(L, D)` when the
token differs between themes. Update `docs/TOKENS.md` in the same
change.

**Do not** retroactively substitute literals for tokens unless the
substitution is **mechanical and lossless** — token-naming a value
that was chosen perceptually requires re-deciding what the original
code meant, and there's no visual-diff pipeline to catch the
consequences yet.

## What not to change

- `.ltx_*` class names — those are LaTeXML's contract.
- `.ltx_INFO`/`.ltx_WARNING`/`.ltx_ERROR`/`.ltx_FATAL` upper-case naming
  — deliberate mirror of LaTeX macro names.
- The OKLCH `0.7` / `0.8237` inversion constants — the `0.8237`
  derives from the OKLCH lightness of `#0d1117` (see the RFC).
- The arXiv-ID-referenced rules without re-rendering the cited
  paper.

## Reporting issues

Open a GitHub issue with a link to a problem arXiv paper (or local
reproduction). Screenshots help, but the arXiv ID is the most
important detail — many rules in ar5iv exist specifically to handle
edge cases in a particular paper.
