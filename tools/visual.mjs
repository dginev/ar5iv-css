#!/usr/bin/env node
// Visual-regression harness for ar5iv-css.
//
// Renders each demo in examples/ at 1280 CSS-px × {light, dark}
// using Playwright, in fullPage mode so the entire article is captured.
// Diffs against tools/baseline/. Mismatches above the per-image
// pixel-count threshold fail the run.
//
// Usage:
//   node tools/visual.mjs            # diff against baseline
//   node tools/visual.mjs --update   # refresh baseline (use after intentional change)
//
// First-time setup:
//   ./examples/fetch-corpus.sh ar5iv   # fetches every paper ID cited
//                                        in ar5iv.css comments (~120 MB)
//   node tools/visual.mjs --update    # generates baseline locally
//                                        (~400 MB, gitignored)
//
// The baseline is per-developer because the comprehensive fullPage set
// is too large to commit to git history. Anti-aliasing variance across
// font/OS versions also makes a "ground truth" baseline less portable
// than the previous 1.6 MB header-only baseline implied.
//
// For shared CI verification, a release-artifact tarball published
// to `tools/snapshots-baseline.tar.zst` is the planned approach
// (deferred until first CI/PR pipeline lands).

import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const baselineDir = join(__dirname, 'baseline');
const renderDir = join(__dirname, '.cache', 'snapshots');
const diffDir = join(__dirname, '.cache', 'diff');

// Corpus: read from `tools/corpus.txt`, the single source of truth
// shared with `examples/fetch-corpus.sh`. One ID per non-blank,
// non-comment line. For each ID we look for any
// `<source>-<safe-id>.html` file in examples/; whichever fetch
// source you used (arxiv.org/html or ar5iv.labs.arxiv.org/html)
// is fine. Missing IDs are reported as SKIP rather than failing.
const corpusFile = join(__dirname, 'corpus.txt');
const corpusIds = (await readFile(corpusFile, 'utf-8'))
  .split('\n')
  .map(s => s.replace(/#.*/, '').trim())
  .filter(s => s.length > 0);

// Viewports × themes. 1280 × {light, dark}, fullPage rendering so the
// entire article is captured (the previous first-viewport-only design
// missed below-the-fold regressions, including everything past the
// frontmatter — most of an arXiv paper). 320 is dropped from the matrix
// because fullPage × 47 papers at narrow viewports balloons the
// baseline disk cost without proportional regression coverage; reflow
// regressions at narrow viewports are now tracked manually under
// iteration-3 item #2.
const matrix = [
  { width: 1280, height: 1600, theme: 'light' },
  { width: 1280, height: 1600, theme: 'dark'  },
];

// Pixel-count tolerance. Anti-aliasing variance and font hinting make
// a strict 0 threshold flaky across browser builds; the threshold below
// is the maximum count of differing pixels per snapshot. Tune up if
// false-positives appear; tune down if real regressions slip through.
// (fullPage snapshots are larger so the absolute count scales with
// page height — consider this when interpreting the diff number.)
const pixelTolerance = 400;

const update = process.argv.includes('--update');

async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function findDemoFile(id) {
  // Match either `arxiv-<id>.html` or `ar5iv-<id>.html` (forward
  // slashes in old-format IDs become underscores).
  const safeId = id.replace(/\//g, '_');
  for (const prefix of ['arxiv', 'ar5iv']) {
    const path = join(repoRoot, 'examples', `${prefix}-${safeId}.html`);
    if (await fileExists(path)) return path;
  }
  return null;
}

async function renderAndDiff(browser, demoPath, demoId, view) {
  const url = 'file://' + demoPath;
  const safeId = demoId.replace(/\//g, '_');
  const name = `${safeId}-${view.width}-${view.theme}.png`;

  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    colorScheme: view.theme,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // Mirror the OS preference into an explicit `data-theme` so the
  // application rules fire deterministically — the harness shouldn't
  // depend on Playwright's `colorScheme` behaviour alone.
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), view.theme);
  // Give the cascade a moment to settle after the data-theme flip.
  // The body-of-evidence is: previous flaky AA pixels around theme
  // switching went away once we waited an extra animation frame.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));

  await mkdir(renderDir, { recursive: true });
  const renderPath = join(renderDir, name);
  // fullPage: true captures the entire article scroll height, not just
  // the first viewport. The previous header-only baseline missed
  // everything past the frontmatter and was rightly called out as
  // misleading. With fullPage, a regression deep in the bibliography
  // or in a figure half-way down still flags.
  await page.screenshot({ path: renderPath, fullPage: true });
  await context.close();

  if (update) {
    await mkdir(baselineDir, { recursive: true });
    await writeFile(join(baselineDir, name), await readFile(renderPath));
    return { name, status: 'updated' };
  }

  const baselinePath = join(baselineDir, name);
  if (!await fileExists(baselinePath)) {
    return { name, status: 'no-baseline' };
  }

  const baselinePng = PNG.sync.read(await readFile(baselinePath));
  const renderPng = PNG.sync.read(await readFile(renderPath));

  if (baselinePng.width !== renderPng.width || baselinePng.height !== renderPng.height) {
    return { name, status: 'size-mismatch',
             info: `${renderPng.width}x${renderPng.height} vs baseline ${baselinePng.width}x${baselinePng.height}` };
  }

  const { width, height } = baselinePng;
  const diffPng = new PNG({ width, height });
  const diffPixels = pixelmatch(
    baselinePng.data, renderPng.data, diffPng.data,
    width, height,
    { threshold: 0.1 },  // per-pixel YIQ tolerance; pairs with pixelTolerance for the overall count
  );

  if (diffPixels > pixelTolerance) {
    await mkdir(diffDir, { recursive: true });
    await writeFile(join(diffDir, name), PNG.sync.write(diffPng));
    return { name, status: 'diff', info: `${diffPixels} pixels (tolerance ${pixelTolerance})` };
  }
  return { name, status: 'pass', info: `${diffPixels} pixels` };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];
  const present = [];
  const missing = [];

  for (const id of corpusIds) {
    const path = await findDemoFile(id);
    if (path) present.push({ id, path }); else missing.push(id);
  }

  if (missing.length) {
    console.log(`Missing ${missing.length} of ${corpusIds.length} corpus papers:`);
    console.log('  ' + missing.join(', '));
    console.log(`Run ./examples/fetch-corpus.sh ar5iv to fetch them all.\n`);
  }

  for (const { id, path } of present) {
    for (const view of matrix) {
      try {
        const r = await renderAndDiff(browser, path, id, view);
        results.push(r);
        const tag = {
          pass: 'PASS', diff: 'DIFF',
          'no-baseline': 'NEW', 'size-mismatch': 'SIZE',
          updated: 'UPDATED',
        }[r.status];
        console.log(`${tag} ${r.name}${r.info ? ` — ${r.info}` : ''}`);
      } catch (err) {
        console.log(`ERROR ${id} ${view.width} ${view.theme}: ${err.message}`);
        results.push({ name: `${id}-${view.width}-${view.theme}`, status: 'error' });
      }
    }
  }
  await browser.close();

  const fails = results.filter(r => r.status === 'diff' || r.status === 'size-mismatch' || r.status === 'error');
  if (fails.length) {
    console.log(`\n${fails.length} snapshot(s) failed. Diffs in tools/.cache/diff/.`);
    console.log(`If the change is intentional, run: node tools/visual.mjs --update`);
    process.exit(1);
  }
  if (results.length === 0) {
    console.log('No demos rendered. Run ./examples/fetch-corpus.sh first.');
    process.exit(1);
  }
  console.log(`\n${results.length} snapshot(s) OK across ${present.length} papers.`);
}

main().catch(err => { console.error(err); process.exit(1); });
