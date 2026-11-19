// Sunset Press — node smoke test.
//
// Checks, without a browser: every entry file exists, every JS file parses
// (node --check), main.ts hands the app in (MAKEFUN_OUTPUT_DIR to a scratch
// directory) and the dossier it writes is valid JSON with the expected
// shape. Usage: node tests/smoke-node.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const node22 = '/home/hatch/workspace/tools/node-v22.21.1-linux-x64/bin/node';
const node = existsSync(node22) ? node22 : process.execPath;

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

console.log('node smoke test:');

// Every entry file exists.
const expected = [
  'main.ts', 'serve.ts', 'README.md', 'LICENSE', 'shots.json',
  'app/index.html', 'app/style.css',
  'app/src/state.js', 'app/src/grades.js', 'app/src/layouts.js',
  'app/src/decor.js', 'app/src/lettering.js', 'app/src/render.js',
  'app/src/photos.js', 'app/src/export.js', 'app/src/main.js', 'app/src/shots.js',
  'app/fonts/Anton-Regular.ttf', 'app/fonts/BebasNeue-Regular.ttf',
  'app/fonts/Pacifico-Regular.ttf', 'app/fonts/OFL.txt',
  'app/samples/boulevard.jpg', 'app/samples/pier.jpg',
  'vendor/makefun-app.ts',
];
for (const f of expected) {
  check(`exists ${f}`, existsSync(join(root, f)));
}

// Every JS file parses.
const jsFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(m?js)$/.test(entry.name)) jsFiles.push(p);
  }
})(join(root, 'app'));
jsFiles.push(join(root, 'serve.ts'));
for (const f of jsFiles) {
  try {
    execFileSync(node, ['--check', f], { stdio: 'pipe' });
    check(`parses ${f.replace(root + '/', '')}`, true);
  } catch (err) {
    check(`parses ${f.replace(root + '/', '')}`, false, String(err.message).slice(0, 200));
  }
}

// No network references in the app (offline by construction).
const appFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(html|js|mjs|css)$/.test(entry.name)) appFiles.push(p);
  }
})(join(root, 'app'));
let netRefs = [];
for (const f of appFiles) {
  const text = readFileSync(f, 'utf8');
  const hits = text.match(/https?:\/\/[^\s"'<>)]+/g) ?? [];
  // make.fun links in comments/README are fine; the app must not fetch.
  const bad = hits.filter((u) => !u.startsWith('https://make.fun'));
  if (bad.length > 0) netRefs.push(`${f.replace(root + '/', '')}: ${bad.join(', ')}`);
}
check('no network references in app code', netRefs.length === 0, netRefs.join('; '));

// main.ts hands the app in and writes a valid dossier.
const outDir = '/tmp/sunset-press-out';
rmSync(outDir, { recursive: true, force: true });
try {
  execFileSync(node, ['main.ts'], {
    cwd: root,
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: outDir },
    stdio: 'pipe',
  });
  check('main.ts runs', true);
} catch (err) {
  check('main.ts runs', false, String(err.message).slice(0, 300));
}
const dossierPath = join(outDir, 'dossier.json');
if (existsSync(dossierPath)) {
  try {
    const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
    check('dossier.json is valid JSON', true);
    check('dossier schema is makefun/dossier/v1', dossier.schema === 'makefun/dossier/v1', `got ${dossier.schema}`);
    const textBytes = Buffer.byteLength(dossier.text ?? '', 'utf8');
    check('dossier text under 160 KiB', textBytes <= 163840, `${textBytes} bytes`);
    check('dossier holds 4 screenshots', Array.isArray(dossier.images) && dossier.images.length === 4, `${(dossier.images ?? []).length} images`);
    check('app/ handed in', existsSync(join(outDir, 'app', 'index.html')));
    check('screenshots/ handed in', existsSync(join(outDir, 'screenshots')));
  } catch (err) {
    check('dossier.json parses', false, String(err.message).slice(0, 200));
  }
} else {
  check('dossier.json exists', false);
}

// Screenshots, when present, are within the gate caps.
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
  check('3–4 screenshots', shots.length >= 3 && shots.length <= 4, `${shots.length} found`);
  for (const f of shots) {
    const size = statSync(join(shotsDir, f)).size;
    check(`screenshot ${f} ≤ 256 KiB`, size <= 262144, `${size} bytes`);
  }
} else {
  check('screenshots/ exists', false, 'run tests/capture-shots.mjs first');
}

console.log(`\nnode smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
