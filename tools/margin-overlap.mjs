#!/usr/bin/env node
// Margin-collision check for ar5iv-css's wide layout (>= 96rem with CSS anchor positioning).
//
// On wide screens the title page's side-margin boxes form one stack: the title's notes, the publication
// metadata lifted out of the title (`.ltx_pubnotes_meta`), and the authors' notes each sit under the one
// before. A box that floats into the margin but is not an anchor of the stack collides with the next one
// (latexml-oxide 1607.07280: "KEK-TH 1909" under an author's "* E-mail:", fixed in #72). This renders each
// given page with dist/ar5iv.min.css at each width and fails on any two intersecting margin boxes.
//
// Usage:
//   node tools/margin-overlap.mjs page.html [page2.html …]          # widths 1536, 1800, 2400
//   WIDTHS=1800 node tools/margin-overlap.mjs examples/*.html
// Pages are converted HTML (e.g. latexml_oxide --format=html5 output, or examples/ from fetch-corpus.sh);
// the stylesheet is linked in, so the pages need no other CSS. Exit status 1 when any page collides.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = path.join(repoRoot, 'dist', 'ar5iv.min.css');
const widths = (process.env.WIDTHS || '1536,1800,2400').split(',').map(Number);
const pages = process.argv.slice(2);
if (pages.length === 0) {
  console.error('usage: node tools/margin-overlap.mjs page.html [...]');
  process.exit(2);
}
// The margin boxes of the title page's stack (ar5iv.css, the wide `@supports (anchor-name)` block).
const MARGIN_BOXES = [
  '.ltx_title_document .ltx_pubnotes .ltx_pubnotes_content',
  '.ltx_pubnotes.ltx_pubnotes_meta .ltx_pubnotes_content',
  '.ltx_authors .ltx_annotated_personname > .ltx_note:not(.ltx_role_footnotemark) > .ltx_note_outer',
];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || undefined,
});
let failed = 0;
for (const file of pages) {
  const src = fs.readFileSync(file, 'utf8').replace('</head>', `<link rel="stylesheet" href="file://${css}">\n</head>`);
  const tmp = path.join(path.dirname(path.resolve(file)), `.margin-overlap.${path.basename(file)}`);
  fs.writeFileSync(tmp, src);
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto('file://' + tmp, { waitUntil: 'load', timeout: 15000 });
    const hits = await page.evaluate((selectors) => {
      const boxes = [];
      for (const s of selectors) {
        for (const e of document.querySelectorAll(s)) {
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || getComputedStyle(e).display === 'none') continue;
          boxes.push({ t: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), x: r.left, y: r.top + scrollY, w: r.width, h: r.height });
        }
      }
      const out = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push(`"${a.t}" × "${b.t}"`);
        }
      }
      return out;
    }, MARGIN_BOXES);
    await page.close();
    if (hits.length) {
      failed++;
      console.log(`FAIL ${path.basename(file)} @${width}px: ${hits.join('; ')}`);
    }
  }
  fs.unlinkSync(tmp);
}
await browser.close();
console.log(`${pages.length} page(s) × ${widths.length} width(s): ${failed ? failed + ' collision(s)' : 'no margin collisions'}`);
process.exit(failed ? 1 : 0);
