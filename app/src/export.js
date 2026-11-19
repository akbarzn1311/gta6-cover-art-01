// Sunset Press — PNG export.
//
// Exports render the same cover at full post size on an offscreen canvas
// and download it as a PNG. "Export all" renders the three common post
// sizes in one step, one file each.

import { EXPORT_SIZES } from './state.js';
import { renderCoverToCanvas } from './render.js';

/** Render the cover at one size and download it as a PNG file. */
export async function exportPng(state, sizeId) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) ?? EXPORT_SIZES[0];
  const canvas = await renderCoverToCanvas(state, size.w, size.h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('export failed: the canvas produced no PNG');
  const name = `sunset-press-${size.id}.png`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { name, bytes: blob.size, w: size.w, h: size.h };
}

/** Export all three post sizes, one PNG each, in order. */
export async function exportAll(state, onEach) {
  const results = [];
  for (const size of EXPORT_SIZES) {
    const result = await exportPng(state, size.id);
    results.push(result);
    if (onEach) onEach(result);
    // Let the browser breathe between downloads.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return results;
}
