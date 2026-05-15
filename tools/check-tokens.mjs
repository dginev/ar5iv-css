#!/usr/bin/env node
// TOKENS.md drift check.
//
// Parses `css/ar5iv/tokens.css` for `--*` custom-property declarations
// on `:root` and compares against the token names mentioned in
// `docs/TOKENS.md`. Reports tokens missing from docs and (less
// importantly) tokens documented but no longer declared.
//
// Tied to `npm run lint` so drift fails the lint pass.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Tokens declared on `:root` in tokens.css. We only check :root-scoped
// tokens (not per-element scoped tokens like the `--fn-*` indirection
// in dark-mode.css). Tokens prefixed `--fn-*` and `--ltx-*` are
// upstream contracts and are documented separately in
// `rfc_latexml_custom_properties.md`, not in TOKENS.md — exclude.
const css = await readFile(join(repoRoot, 'css/ar5iv/tokens.css'), 'utf-8');

const cssTokens = new Set();
// Match `:root { ... }` blocks and per-data-theme override blocks,
// then extract `--name:` from inside each block.
const rootBlockRe = /:root[^{]*\{([^}]*)\}/g;
let m;
while ((m = rootBlockRe.exec(css)) !== null) {
  const body = m[1];
  for (const match of body.matchAll(/--([a-zA-Z0-9-]+):/g)) {
    const name = '--' + match[1];
    if (name.startsWith('--fn-') || name.startsWith('--ltx-')) continue;
    cssTokens.add(name);
  }
}

// Also pull `@media (prefers-contrast: more)` overrides — same
// :root token surface, just under the media gate.
for (const match of css.matchAll(/@media[^{]+\{[^}]*:root[^{]*\{([^}]*)\}/g)) {
  for (const m2 of match[1].matchAll(/--([a-zA-Z0-9-]+):/g)) {
    const name = '--' + m2[1];
    if (name.startsWith('--fn-') || name.startsWith('--ltx-')) continue;
    cssTokens.add(name);
  }
}

// Tokens mentioned in TOKENS.md. Match `--foo-bar` inside the doc
// (typically inside backticks within markdown tables). Same prefix
// exclusions.
const md = await readFile(join(repoRoot, 'docs/TOKENS.md'), 'utf-8');
const mdTokens = new Set();
for (const match of md.matchAll(/`--([a-zA-Z0-9-]+)`/g)) {
  const name = '--' + match[1];
  if (name.startsWith('--fn-') || name.startsWith('--ltx-')) continue;
  mdTokens.add(name);
}

const cssOnly = [...cssTokens].filter(t => !mdTokens.has(t)).sort();
const mdOnly = [...mdTokens].filter(t => !cssTokens.has(t)).sort();

if (cssOnly.length === 0 && mdOnly.length === 0) {
  console.log(`TOKENS.md ↔ tokens.css in sync: ${cssTokens.size} :root tokens documented.`);
  process.exit(0);
}

if (cssOnly.length) {
  console.log('Declared in tokens.css but missing from TOKENS.md:');
  for (const t of cssOnly) console.log(`  ${t}`);
}
if (mdOnly.length) {
  console.log('Documented in TOKENS.md but not declared in tokens.css:');
  for (const t of mdOnly) console.log(`  ${t}`);
}
process.exit(1);
