# CSS feature audit — Baseline status

*As of 2026-05-14.*

ar5iv-css aims for **Baseline: Widely Available** (supported in all
major browsers for 30+ months). The project accepts targeted
exceptions for high-impact features that are *Newly Available*
(supported in all current browsers but for less than 30 months) —
explicitly so for `:has()`, which is too useful for scholarly-document
selectors to forgo, and implicitly for a small set of additional
features that either ship with `@supports` fallbacks or degrade
gracefully.

## Newly Available (NOT yet Widely Available)

| Feature | Newly available | Widely available ETA | Uses | Risk profile |
|---|---|---|---|---|
| `:has()` | Dec 2023 | Jun 2026 (~1 mo) | 11 in `ar5iv.css` | **EXEMPTED** per project policy |
| CSS Nesting (`&`) | Dec 2023 | Jun 2026 (~1 mo) | 10 in `ar5iv.css` | Stylistic; trivially flattenable |
| `float: inline-start` / `inline-end` | Mar 2024 | Sep 2026 (~4 mo) | 3 in `ar5iv.css` | Degrades to no-float; RTL-only benefit |
| `light-dark()` | May 2024 | Nov 2026 (~6 mo) | 22 in `tokens.css` + 3 in `dark-mode.css` | **Load-bearing**; entire theming surface |
| `text-wrap: balance` | May 2024 | Nov 2026 (~6 mo) | 1 in `ar5iv.css` (`.ltx_title`) | Progressive enhancement; default wrap fallback |
| `oklch(from …)` relative color | Jul 2024 | Jan 2027 (~8 mo) | 7 in `dark-mode.css` | **`@supports`-gated** with HSL fallback |

## Just-Widely-Available (crossed the 30-month line in the last few months)

| Feature | Widely-available since | Uses |
|---|---|---|
| `subgrid` | Mar 2026 | 8 in `ar5iv.css` (bibliography + enumerate lists) |

## Already Widely Available (no concern)

`@layer`, `@supports`, `oklch()`, `color-mix()`, `dvw`/`dvh`,
range media queries (`width >= …`),
`text-decoration-thickness: from-font`, `:focus-visible`,
`:focus-within`, `:is()`, `:where()`, `forced-colors` media,
`prefers-contrast`, `prefers-reduced-motion`,
logical properties (`margin-inline-*`, `padding-inline-*`,
`inset-inline-*`, `max-inline-size`), `fit-content()`,
`clamp()`/`min()`/`max()`, `color-scheme`.

## Deliberately not used

`@container`, `@scope`, `@starting-style`, anchor positioning
(`anchor-name`, `position-anchor`), view transitions
(`view-transition-name`), `aspect-ratio`, `container-type`,
`place-items`, `:user-invalid`/`:user-valid`, `text-wrap: pretty`,
`::backdrop`. None of these have a current consumer in ar5iv-css.

## Per-feature decision: KEEP all

The project accepts each non-widely-available feature, with the
following rationale per feature:

1. **`light-dark()` — keep.** 25 uses; the entire theming surface
   routes through it. Re-expressing this in pre-`light-dark()` terms
   (`@media (prefers-color-scheme: dark)` plus `[data-theme=dark]`
   selectors per-token) would roughly double the size of
   `tokens.css` and lose the elegant single-line declarations.
   Within ~6 months it's widely available.

2. **`oklch(from …)` — keep, already gated.** 7 uses in
   `dark-mode.css`, all inside
   `@supports (color: oklch(from white l c h)) { … }` with an
   `hsl(from … h s calc(100 - l))` fallback in the
   `@supports not (…)` branch. Older browsers get the HSL fallback
   automatically. The exemplar of "use newly available with a fallback".

3. **`text-wrap: balance` — keep.** Single use on `.ltx_title`. The
   fallback (default wrap) is the typography ar5iv lived with for
   years. Pure progressive enhancement; no risk.

4. **`float: inline-start` / `inline-end` — keep, accept the risk
   window.** 3 uses from the iteration-3 logical-property walk.
   Unsupported browsers ignore the declaration and the element
   renders un-floated. The visible degradation: a sidenote that
   would have floated to the right margin ends up inline.
   Acceptable. Sep 2026 widely available.

5. **CSS Nesting (`&`) — keep.** 1 month from widely available.
   Flattening would be mechanical but offers no benefit by the time
   anyone re-audits.

6. **`:has()` — exempted as documented.** 11 uses. Without `:has()`
   the `:not(:is(…))` chain at the bottom of `ar5iv.css` returns,
   plus the `.ltx_overlay > :nth-child(2)` positional selector
   cleanup undoes itself.

## Projected date for "entire CSS at Baseline: Widely Available"

The latest-graduating un-gated, load-bearing features are
`light-dark()` and `text-wrap: balance`, both reaching Widely
Available in **November 2026**.

After that, the only remaining Newly-Available feature is
`oklch(from …)` (Jan 2027) — but it's `@supports`-gated with a
deployed fallback, so it does not block "the whole CSS is Widely
Available" by the strict reading (every consuming browser already
gets correct rendering today via the HSL fallback).

**Projected milestone:**

- **Nov 2026** — every un-gated feature ar5iv-css uses is Widely
  Available. The CSS can be served to any browser that meets the
  Baseline: Widely Available bar without `@supports` gating.
- **Jan 2027** — `oklch(from …)` reaches Widely Available; the
  `@supports` / HSL fallback in `dark-mode.css` becomes dead
  weight and can be deleted, simplifying the dark-mode application
  rules to a single OKLCH branch.

These dates assume the Baseline thresholds defined by
web.dev/baseline (newly-available + 30 months in all major browsers).
If a major browser regresses on any of these features in the
interim, the date slips.

## Continuous tracking

Re-run the audit by grepping the feature signatures above against
`css/`. New experimental features should be added to the
"deliberately not used" list with rationale, or added to "Newly
Available" with a fallback strategy.
