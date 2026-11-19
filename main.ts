// Sunset Press — "Make GTA 6 Cover Art" (gta6-cover-art-01) entry program.
//
// What this program does: it hands in the cover-art maker this repository
// built. It copies app/ (the offline browser app as static files) and
// screenshots/ (3 or 4 renders of the app and the covers it exported) from
// this repository into the output directory, then writes /output/dossier.json
// with the kit library's buildDossier, so the scorer and the judge can read
// the entry exactly as the program handed it in.
//
// Run it with Node 22, from this repository's root:
//
//   node main.ts
//
// The output directory is /output unless MAKEFUN_OUTPUT_DIR names another
// one (handy for a local check: MAKEFUN_OUTPUT_DIR=out node main.ts).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

/** The directory this file lives in: the repository's root. */
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

/** Where the entry is handed in: /output, or MAKEFUN_OUTPUT_DIR when set. */
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The caps the bounty's gate hands buildDossier (the kit's gate limits). */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
} as const;

/** Copy the app and its screenshots into the output directory. */
function handIn(): void {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), {
      recursive: true,
    });
  }
}

/** Write the dossier the judge reads, from exactly what was handed in. */
function writeDossier(): string {
  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  return dossier;
}

handIn();
const dossier = writeDossier();
console.log(`handed in the app and screenshots to ${outDir}`);
console.log(`dossier.json: ${dossier.length} bytes`);
