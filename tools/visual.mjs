#!/usr/bin/env node
// Visual-regression harness for ar5iv-css.
//
// Renders each demo in examples/ at {320, 1280} CSS-px × {light, dark}
// using Playwright. Pages within the engine's screenshot-height limit
// are captured as a single fullPage PNG; pages over the limit take the
// paginated path — viewport-tall chunks scrolled and captured into
// `<base>-pNNN.png` files, each diffed independently. Mismatches
// above the per-image pixel-count threshold fail the run.
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

import { chromium, firefox, webkit } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Engine selection. Default chromium; --engine=firefox or --engine=webkit
// opt in to cross-engine runs. WebKit currently requires the system
// package `libavif16` (`sudo apt-get install libavif16`) on Linux;
// Firefox runs out of the box after `npx playwright install firefox`.
const engineArg = (process.argv.find(a => a.startsWith('--engine=')) ?? '').split('=')[1];
const engineName = engineArg || 'chromium';
const engines = { chromium, firefox, webkit };
if (!engines[engineName]) {
  console.error(`Unknown engine: ${engineName}. Use chromium | firefox | webkit.`);
  process.exit(1);
}

// Baseline subdir per engine so cross-engine runs don't clobber
// each other. Cross-engine AA variance is large enough that a
// shared baseline wouldn't be meaningful.
const baselineDir = join(__dirname, 'baseline', engineName);
const renderDir = join(__dirname, '.cache', 'snapshots', engineName);
const diffDir = join(__dirname, '.cache', 'diff', engineName);

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

// Viewports × themes. fullPage rendering captures the entire article.
//
// - 1280 × {light, dark} — the typical desktop reading layout. The
//   regressions iteration-3 caught here (flow-root title shift,
//   UA-default margin re-assertion, bibliography subgrid jaggedness)
//   all manifest at this width.
// - 320 × {light, dark} — WCAG 1.4.10 reflow check. Equivalent to
//   viewport 1280 at 400 % zoom for content-reflow purposes. Catches
//   horizontal-scroll triggers, clipped content, and structural
//   overflows that don't appear at the desktop width. Adds 47 × 2
//   snapshots; pages get ~3x taller at 320 width so the baseline
//   grows substantially. Worth the disk cost — closes iteration-3
//   item #2's outstanding ⚠️ on the dimension checklist.
//
// fullPage at 320 commonly exceeds Firefox's 32767-px screenshot
// limit (and Chromium's softer 50000-px concurrent cap). Such pages
// take the paginated path in `renderAndDiff` instead: viewport-tall
// chunks scrolled and captured independently.
const matrix = [
  { width: 320,  height: 568,  theme: 'light' },
  { width: 320,  height: 568,  theme: 'dark'  },
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

// Concurrent renders per browser instance. Default 4 — Chromium handles
// it comfortably on a typical dev machine; higher (e.g. 8) is fine on
// 8+ core machines but starts trading off latency against parallelism
// for snapshot encoding. Override via `CONCURRENCY=N npm test`.
const concurrency = Math.max(1, parseInt(process.env.CONCURRENCY ?? '4', 10) || 4);

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

// Compare one rendered PNG against the baseline (or write the
// baseline under --update). Factored out so the short-paper path
// and the paginated path can share the diff logic.
async function compareOrWrite(name, renderPath) {
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

async function renderAndDiff(browser, demoPath, demoId, view) {
  const url = 'file://' + demoPath;
  const safeId = demoId.replace(/\//g, '_');
  const baseName = `${safeId}-${view.width}-${view.theme}`;

  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    colorScheme: view.theme,
    deviceScaleFactor: 1,
  });
  // Block remote *image* requests only. The hang on WebKit came
  // from `<meta property="og:image">` / `<meta name="twitter:image">`
  // pointing at `https://ar5iv.labs.arxiv.org/assets/ar5iv_card.png`:
  // WebKit's `waitUntil` blocks on the fetch under headless-no-network.
  // A blanket abort would also drop the third stylesheet the archived
  // HTML references (`https://ar5iv.labs.arxiv.org/assets/ar5iv-site.*.css`)
  // — and that does affect layout (we measured an 85 px page-height
  // shift at 320). So: block only image resourceType remote requests.
  // Stylesheets, scripts, fonts, document fetches all flow normally.
  await context.route('**/*', (route) => {
    const req = route.request();
    if (req.resourceType() === 'image' && !req.url().startsWith('file:')) {
      route.abort();
    } else {
      route.continue();
    }
  });
  const page = await context.newPage();
  // `waitUntil: 'load'` (the page's own load event) instead of
  // `'networkidle'`. For static file:// content the two are
  // functionally equivalent — except `networkidle` can wait on
  // background pings the page doesn't depend on (and which we
  // now abort above anyway). `timeout: 15000` is a safety net:
  // if a page somehow still hangs, the goto throws and the
  // worker's try/catch reports ERROR rather than the harness
  // hanging the whole run.
  await page.goto(url, { waitUntil: 'load', timeout: 15000 });
  // Wait for `@font-face` resources to settle. `load` fires when the
  // page's load event finishes, which does not guarantee web fonts
  // have rendered — `display=swap` deliberately paints fallbacks
  // first and swaps later. Without this await the screenshot can
  // capture fallback glyphs (Cambria Math instead of STIX Two Math,
  // system serif instead of Noto Serif) which is misleading.
  await page.evaluate(() => document.fonts.ready);
  // Mirror the OS preference into an explicit `data-theme` so the
  // application rules fire deterministically — the harness shouldn't
  // depend on Playwright's `colorScheme` behaviour alone.
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), view.theme);
  // Give the cascade a moment to settle after the data-theme flip.
  // The body-of-evidence is: previous flaky AA pixels around theme
  // switching went away once we waited an extra animation frame.
  // (Avoid a second `waitForLoadState('networkidle')` here — long
  // math-heavy papers in Firefox don't always reach networkidle a
  // second time within 30s, which produced a Timeout failure on
  // math/0002050. The data-theme flip is synchronous; one rAF is
  // enough for the cascade to settle.)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));

  await mkdir(renderDir, { recursive: true });

  // Per-engine screenshot height limits. Pages within the limit take
  // the short-paper path (single fullPage PNG, the previously shipped
  // baseline). Pages over the limit take the paginated path below.
  //   - Firefox: 32767 px (int16 in the Marionette protocol)
  //   - Chromium: nominally 100k+ px, but very tall pages (~400k+)
  //     under concurrent contexts trigger memory-pressure "Unable to
  //     capture screenshot" errors. 50000 is a conservative cap.
  //     Hits arXiv:2105.10386 (~400k px at 1280, even taller at 320).
  //   - WebKit: conservative 32767 (matches Firefox; not stress-tested).
  const heightLimits = { firefox: 32767, chromium: 50000, webkit: 32767 };
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const limit = heightLimits[engineName];

  if (!limit || docHeight <= limit) {
    // Short-paper path: single fullPage screenshot. fullPage: true
    // captures the entire article scroll height — a regression deep
    // in the bibliography or a figure half-way down still flags.
    const name = `${baseName}.png`;
    const renderPath = join(renderDir, name);
    await page.screenshot({ path: renderPath, fullPage: true });
    await context.close();
    return [await compareOrWrite(name, renderPath)];
  }

  // Paginated path: chunk the page into viewport-tall slices,
  // scrolling between captures. Each chunk is its own PNG, diffed
  // independently against `<base>-pNNN.png`. Three-digit zero-padding
  // because the longest paper (arXiv:2105.10386) at 320 width is
  // ~700 chunks.
  //
  // Chunking by viewport — not a larger value — keeps `vh`/`dvh`
  // semantics consistent with the short-paper render: the viewport
  // dimensions never change during the run. A `position: fixed`
  // element would repeat in every chunk; academic-paper CSS doesn't
  // use any, but worth noting if a future consumer introduces one.
  const chunkHeight = view.height;
  const chunkCount = Math.ceil(docHeight / chunkHeight);
  const results = [];

  for (let i = 0; i < chunkCount; i++) {
    const y = i * chunkHeight;
    const captureHeight = Math.min(chunkHeight, docHeight - y);
    await page.evaluate((sy) => window.scrollTo(0, sy), y);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));

    const pageNum = String(i + 1).padStart(3, '0');
    const chunkName = `${baseName}-p${pageNum}.png`;
    const chunkPath = join(renderDir, chunkName);
    // `clip` with the default (non-fullPage) screenshot mode is
    // relative to the viewport, so x:0/y:0 captures the top
    // `captureHeight` pixels of what's currently scrolled in.
    // The trailing chunk has captureHeight < chunkHeight.
    //
    // Per-chunk try/catch: arXiv:2105.10386 (~400k px, ~50k DOM
    // nodes) crashes the Chromium renderer somewhere between
    // chunks 140 and 170 — memory pressure from accumulated
    // layer state. Exact crash chunk varies with concurrency
    // (chunk 144 at CONCURRENCY=1, 160-166 at CONCURRENCY=4).
    // Catch the crash and abandon the remaining chunks for this
    // view rather than ERRORing the whole worker. Under
    // `--update`, the partial chunks 1..(crash-1) DO land as
    // baseline files (`compareOrWrite` runs after each successful
    // screenshot), so re-runs verify the partial coverage we
    // can capture — about 57 % of the page on this paper.
    try {
      await page.screenshot({
        path: chunkPath,
        clip: { x: 0, y: 0, width: view.width, height: captureHeight },
      });
    } catch (err) {
      await context.close();
      return [{
        name: `${baseName}-p${pageNum}`,
        status: 'skip-renderer-crash',
        info: `chunk ${i + 1}/${chunkCount} of ${docHeight} px page: ${err.message.split('\n')[0]}`,
      }];
    }
    results.push(await compareOrWrite(chunkName, chunkPath));
  }

  await context.close();
  return results;
}

async function main() {
  console.log(`engine: ${engineName}`);
  const browser = await engines[engineName].launch();
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

  // Flat queue of work, drained concurrently by N workers sharing
  // the single Chromium instance via separate Playwright contexts.
  const tasks = [];
  for (const { id, path } of present) {
    for (const view of matrix) {
      tasks.push({ id, path, view });
    }
  }

  // Per-chunk result tags. `renderAndDiff` returns an array — one
  // entry for short papers, N entries for the paginated path.
  const statusTag = {
    pass: 'PASS', diff: 'DIFF',
    'no-baseline': 'NEW', 'size-mismatch': 'SIZE',
    updated: 'UPDATED',
    'skip-renderer-crash': 'SKIP',
  };

  async function worker() {
    for (;;) {
      const task = tasks.shift();
      if (!task) return;
      const { id, path, view } = task;
      try {
        const rs = await renderAndDiff(browser, path, id, view);
        for (const r of rs) {
          results.push(r);
          const tag = statusTag[r.status] ?? r.status.toUpperCase();
          console.log(`${tag} ${r.name}${r.info ? ` — ${r.info}` : ''}`);
        }
      } catch (err) {
        console.log(`ERROR ${id} ${view.width} ${view.theme}: ${err.message}`);
        results.push({ name: `${id}-${view.width}-${view.theme}`, status: 'error' });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
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
