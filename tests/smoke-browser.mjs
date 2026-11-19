// Sunset Press — browser smoke test.
//
// Drives the real app in headless Chromium: loads the editor, checks the
// preview paints real pixels with no page errors, switches layout and
// grade, drags a panel's photo, and exports a PNG in all three sizes,
// verifying each download lands on disk. Usage:
//   node tests/smoke-browser.mjs   (the app must be served on :8080 first:
//   node serve.ts in another shell, or this script starts it itself)

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/home/hatch/shot-tool/package.json');
const puppeteer = require('puppeteer-core');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/home/hatch/shot-tool/chrome/linux-158.0.8127.36/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8080/';
const DL = '/tmp/sunset-press-dl';

let passed = 0;
let failed = 0;
function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('browser smoke test:');

rmSync(DL, { recursive: true, force: true });
mkdirSync(DL, { recursive: true });

// Start the app server ourselves.
const server = spawn(process.execPath, ['serve.ts'], {
  cwd: root,
  env: { ...process.env, PORT: '8080' },
  stdio: 'pipe',
});
await sleep(1500);

let browser = null;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });

  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);

  // The preview canvas paints real (non-blank) pixels.
  const painted = await page.evaluate(() => {
    const c = document.getElementById('preview');
    if (!c) return { ok: false, why: 'no preview canvas' };
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let distinct = new Set();
    for (let i = 0; i < d.length; i += 401 * 4) {
      sum += d[i] + d[i + 1] + d[i + 2];
      distinct.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    }
    return { ok: sum > 0 && distinct.size > 20, sum, distinct: distinct.size };
  });
  check('preview paints varied pixels', painted.ok, JSON.stringify(painted));

  // The editor loaded its sample photos.
  const photos = await page.evaluate(() => document.querySelectorAll('#photos .thumb').length);
  check('sample photos in the strip', photos === 2, `${photos} thumbnails`);

  // Switch layout + grade and confirm the preview changes.
  const before = await page.evaluate(() => {
    const c = document.getElementById('preview');
    return c.toDataURL('image/png').length;
  });
  await page.evaluate(() => {
    document.querySelector('[data-layout="tilted"]').click();
    document.querySelector('[data-grade="neon"]').click();
  });
  await sleep(1500);
  const after = await page.evaluate(() => {
    const c = document.getElementById('preview');
    return c.toDataURL('image/png').length;
  });
  check('layout + grade switch re-renders', before !== after, `before ${before} after ${after}`);

  // Drag the selected panel's photo: dx must move away from 0.
  const drag = await page.evaluate(() => {
    const api = window.__sunsetPress;
    if (!api) return { ok: false, why: 'no test hook' };
    api.state.panels[0].dx = 0;
    return { ok: true };
  });
  if (drag.ok) {
    const box = await page.evaluate(() => {
      const c = document.getElementById('preview');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.move(box.x + box.w * 0.5, box.y + box.h * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w * 0.6, box.y + box.h * 0.35, { steps: 8 });
    await page.mouse.up();
    await sleep(800);
    const moved = await page.evaluate(() => {
      const api = window.__sunsetPress;
      return Math.abs(api.state.panels[api.state.selected].dx);
    });
    check('drag moves the panel photo', moved > 0.05, `dx=${moved}`);
  } else {
    check('drag moves the panel photo', false, drag.why);
  }

  // Export all three sizes and verify the downloads.
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  await page.evaluate(async () => {
    await window.__sunsetPress.exportAll(window.__sunsetPress.state);
  });
  await sleep(4000);
  const files = readdirSync(DL);
  check('three PNGs exported', files.length === 3, files.join(', '));
  for (const f of files) {
    const size = statSync(join(DL, f)).size;
    check(`export ${f} is a real PNG`, size > 20000, `${size} bytes`);
  }

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(`\nbrowser smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
