#!/usr/bin/env node
// Visual-regression harness for ar5iv-css.
//
// Renders each demo in examples/ at the configured viewport/theme matrix
// and diffs against tools/baseline/. Mismatches above the pixel-count
// threshold fail the run.
//
// Usage:
//   node tools/visual.mjs            # diff against baseline
//   node tools/visual.mjs --update   # refresh baseline (use after intentional change)
//
// First-time setup: `./examples/fetch.sh ar5iv-1910.06709`, etc.
// (`examples/` is gitignored — corpus is fetched per-developer.)

import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const baselineDir = join(__dirname, 'baseline');
const renderDir = join(__dirname, '.cache', 'snapshots');
const diffDir = join(__dirname, '.cache', 'diff');

// Corpus: each entry is a demo HTML present under examples/.
// Add IDs here by running `./examples/fetch.sh <id>` first.
const corpus = [
  { file: 'ar5iv-1910.06709.html', id: 'ar5iv-1910.06709' },
  { file: 'arxiv-2407.16893.html', id: 'arxiv-2407.16893' },
  { file: 'arxiv-2501.11021.html', id: 'arxiv-2501.11021' },
];

// Viewports × themes matrix. Kept minimal for the smoke baseline;
// extend if a class of regression starts slipping through.
const matrix = [
  { width: 1280, height: 1600, theme: 'light' },
  { width: 1280, height: 1600, theme: 'dark' },
];

// Pixel-count tolerance. Anti-aliasing variance and font hinting make
// a strict 0 threshold flaky across browser builds; the threshold below
// is the maximum count of differing pixels per snapshot. Tune up if
// false-positives appear; tune down if real regressions slip through.
const pixelTolerance = 400;

const update = process.argv.includes('--update');

async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function renderAndDiff(browser, demo, view) {
  const url = 'file://' + join(repoRoot, 'examples', demo.file);
  const name = `${demo.id}-${view.width}-${view.theme}.png`;

  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    colorScheme: view.theme,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  if (view.theme === 'dark') {
    // Mirror the OS preference into an explicit `data-theme` so the
    // application rules fire deterministically — the harness shouldn't
    // depend on Playwright's `colorScheme` behaviour alone.
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  } else {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  }
  // Give styles + fonts a moment to settle after the data-theme flip.
  await page.waitForLoadState('networkidle');

  await mkdir(renderDir, { recursive: true });
  const renderPath = join(renderDir, name);
  // First-viewport only (not fullPage) — keeps baselines small enough
  // to commit. The regressions iteration-2 caught (title/frontmatter
  // shifts under flow-root BFC) all manifest in the first viewport;
  // body-paragraph regressions show up here too because page chrome
  // sits at the top of every paper. If a class of below-the-fold
  // regression starts slipping through, switch this to `fullPage`
  // and migrate the baseline to a `tools/snapshots-baseline.tar.zst`
  // out-of-tree blob.
  await page.screenshot({ path: renderPath, fullPage: false });
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

  for (const demo of corpus) {
    const demoPath = join(repoRoot, 'examples', demo.file);
    if (!await fileExists(demoPath)) {
      console.log(`SKIP ${demo.id} (run ./examples/fetch.sh first)`);
      continue;
    }
    for (const view of matrix) {
      try {
        const r = await renderAndDiff(browser, demo, view);
        results.push(r);
        const tag = {
          pass: 'PASS', diff: 'DIFF',
          'no-baseline': 'NEW', 'size-mismatch': 'SIZE',
          updated: 'UPDATED',
        }[r.status];
        console.log(`${tag} ${r.name}${r.info ? ` — ${r.info}` : ''}`);
      } catch (err) {
        console.log(`ERROR ${demo.id} ${view.width} ${view.theme}: ${err.message}`);
        results.push({ name: `${demo.id}-${view.width}-${view.theme}`, status: 'error' });
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
    console.log('No demos rendered. Run ./examples/fetch.sh <id> first.');
    process.exit(1);
  }
  console.log(`\n${results.length} snapshot(s) OK.`);
}

main().catch(err => { console.error(err); process.exit(1); });
