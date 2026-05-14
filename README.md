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

Produces `dist/ar5iv.min.css` + `dist/ar5iv.min.css.map`. The build
inlines all local `@import`s into a single file via
[lightningcss](https://lightningcss.dev/) and minifies.

## Theming

The theme honours `<html data-theme="light|dark">`, OS
`prefers-color-scheme`, and `prefers-contrast: more`. Author-supplied
inline colours (LaTeXML's `--ltx-*-color` custom properties) are
inverted under dark mode via an override-friendly `--fn-*` indirection
— see `docs/rfc_latexml_custom_properties.md` for the contract and an
override example.

## Docs

- [Design tokens reference](./docs/TOKENS.md)
- [Contributor guide](./CONTRIBUTING.md)
- [CSS custom properties for LaTeX-authored colours](./docs/rfc_latexml_custom_properties.md)
- [Glow-up wisdom log](./docs/GLOWUP_WISDOM.md) — decisions & surprises
  from the recent modernisation.

## Releasing (maintainer notes)

Manual `npm publish` while the build pipeline settles:

```bash
git tag v0.9.0
git push --tags
npm publish      # `prepublishOnly` runs `npm run build` automatically
```

The published artefact contains both the unminified source (`css/`)
and the minified bundle (`dist/`). jsDelivr and unpkg mirror it
within minutes — no further action required.
