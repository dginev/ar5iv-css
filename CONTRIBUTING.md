# Contributing to ar5iv-css

Welcome. ar5iv-css styles LaTeXML's HTML output for arXiv articles.
This file orients new contributors; for the longer story of recent
architectural decisions, see `docs/GLOWUP_WISDOM.md`.

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

- Rules left **un-layered** participate in the implicit highest-priority
  layer — that's where most of `ar5iv.css` still lives.
- The `tokens` layer holds variable declarations (lowest among named).
- The `base` layer holds additive utilities (focus, ::selection, etc.).

**Subtlety:** with `!important`, layer order *inverts*. An `!important`
declaration in an earlier layer beats one in a later layer. Un-layered
`!important` beats all named-layer `!important`. If you need a fix to
override *everything*, leave it un-layered (or in the `fixes` layer
without `!important`).

## :is() vs :where()

- `:where(…)` has zero specificity — use it for resets and
  default-styling utilities that should lose to any author override.
- `:is(…)` takes the **highest** specificity of its arguments — use it
  for selector-list compression where the rule should keep its
  natural specificity.

## Regression corpus

The CSS file's comments cite ~43 distinct arXiv IDs as live test cases
(e.g. `1810.10704`, `astro-ph/0001001`, `2510.11037`). Treat these as
the canonical visual-regression corpus. When changing a rule that
references one of these IDs in a nearby comment, render that paper
and confirm no visual diff.

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
