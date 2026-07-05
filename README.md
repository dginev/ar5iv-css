# ar5iv-css

The "ar5iv theme" for arXiv HTML documents converted via LaTeXML.

## Quick start

### CDN (recommended for production)

After a tagged release lands on npm, jsDelivr and unpkg auto-serve
the built minified bundle. No CDN sign-up or configuration needed.

```html
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/ar5iv-css@0.9.0/css/ar5iv-fonts.css">
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/ar5iv-css@0.9.0/dist/ar5iv.min.css">
```

unpkg is a drop-in alternative:
`https://unpkg.com/ar5iv-css@0.9.0/dist/ar5iv.min.css`.

Pin the version (`@0.9.0`) for reproducibility. Use `@0.9` for the
latest patch within a minor or `@latest` if you want the bleeding
edge — at the cost of cache poisoning on version bumps.

### Self-hosted from a git checkout

Link the unminified source directly. Pulls in tokens, accessibility,
dark-mode behaviour, and print styles automatically via `@import`.

```html
<link rel="stylesheet" href="css/ar5iv-fonts.css">
<link rel="stylesheet" href="css/ar5iv.css">
```

### Built locally

```bash
npm install
npm run build
```

Produces `dist/ar5iv.min.css`. The build inlines all local
`@import`s into a single file via
[lightningcss](https://lightningcss.dev/) and minifies. (Fonts are
served separately from the unminified `css/ar5iv-fonts.css` — it is
mostly `@import` + `@font-face`, so minifying it saves nothing.)

## Theming

The theme honours `<html data-theme="light|dark|sepia">`, OS
`prefers-color-scheme`, and `prefers-contrast: more`. Author-supplied
inline colours (LaTeXML's `--ltx-*-color` custom properties) are
inverted under dark mode via an override-friendly `--fn-*` indirection
— see `docs/rfc_latexml_custom_properties.md` for the contract and an
override example. For recipes on overriding tokens, changing the
inversion strategy, or shipping a downstream theme, see
`docs/THEMING.md`.

## Browser support

The theme targets **modern evergreen browsers** — roughly mid-2024
onward (Chrome/Edge 123+, Firefox 120+, Safari 17.5+). The gating
feature is `light-dark()`; the theme also uses relative-colour
syntax, `:has()`, `subgrid`, and cascade layers. On older engines the
document still renders and stays readable, but theme colours fall
back to the browser's default light/dark canvas (accents, link
colours, and highlights are lost). See
[`docs/BASELINE_AUDIT.md`](./docs/BASELINE_AUDIT.md) for the
feature-by-feature baseline.

## Docs

- [Design tokens reference](./docs/TOKENS.md)
- [Theming cookbook](./docs/THEMING.md) — four worked recipes
  (override one colour, change the dark-mode inversion, add a
  third `data-theme`, ship a downstream npm package).
- [Contributor guide](./CONTRIBUTING.md)
- [CSS custom properties for LaTeX-authored colours](./docs/rfc_latexml_custom_properties.md)

## Releasing (maintainer notes)

Release tags are **unprefixed** (`0.9.0`, not `v0.9.0`) to match the
tag history, the `release.yml` trigger, and `.npmrc`
(`tag-version-prefix=""`). A `v`-prefixed tag will silently *not*
trigger the release workflow.

When `package.json` is already at the target version (as for the
initial `0.9.0`), tag it directly:

```bash
npm run lint                          # stylelint + TOKENS.md drift (the preversion gate)
npm run build                         # refresh dist/
git add -A && git commit -m "release: 0.9.0"
git tag 0.9.0                         # UNPREFIXED
git push origin HEAD --follow-tags
npm publish                           # prepublishOnly re-runs the build
```

For subsequent releases, prefer `npm version <patch|minor|major>`:
its `version` lifecycle rebuilds and stages `dist/`, and `postversion`
pushes the commit and tag; then `npm publish`.

The published artefact contains both the unminified source (`css/`)
and the minified bundle (`dist/`). Pushing the tag runs `release.yml`,
which re-verifies the committed `dist/` against a fresh build and
warms the jsDelivr cache. jsDelivr and unpkg mirror the npm release
within minutes — no further action required.
