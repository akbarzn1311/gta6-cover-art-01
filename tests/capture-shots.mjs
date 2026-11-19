// Sunset Press — screenshot capture.
//
// Stages the app's four screenshot scenes in headless Chromium and saves
// them as JPEGs into screenshots/. Usage:
//   node serve.ts            (in another shell, serves on :8080)
//   node tests/capture-shots.mjs

import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/home/hatch/shot-tool/package.json');
const puppeteer = require('puppeteer-core');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/home/hatch/shot-tool/chrome/linux-158.0.8127.36/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8080/';
const OUT = join(root, 'screenshots');

const SHOTS = [
  ['1-cover.jpg', '?shot=cover'],
  ['2-editor.jpg', '?shot=editor'],
  ['3-cover2.jpg', '?shot=cover2'],
  ['4-sizes.jpg', '?shot=sizes'],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
try {
  for (const [name, query] of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    page.on('console', (m) => console.log(`[${name}] console.${m.type()}:`, m.text().slice(0, 300)));
    page.on('pageerror', (e) => console.log(`[${name}] pageerror:`, String(e).slice(0, 300)));
    await page.goto(BASE + query, { waitUntil: 'load', timeout: 60000 });
    try {
      await page.waitForFunction('window.__shotReady === true', { timeout: 60000, polling: 250 });
    } catch {
      console.log(`[${name}] WARNING: __shotReady did not become true in 60s; capturing anyway`);
    }
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${OUT}/${name}`, type: 'jpeg', quality: 80 });
    console.log(`[${name}] saved`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('done');
