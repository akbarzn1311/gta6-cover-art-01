// Sunset Press — screenshot scenes.
//
// `?shot=cover`, `?shot=editor`, `?shot=cover2` or `?shot=sizes` stages a
// scene for the capture tool, renders it with the app's own renderer, then
// sets window.__shotReady. The scenes use the kit's two sample photos, so
// every screenshot shows real app output, never a mock-up.

import { defaultState } from './state.js';
import { renderCover } from './render.js';
import { loadSamples } from './photos.js';

/** Stage one scene and signal the capture tool. */
export async function runShot(shot) {
  const stage = document.getElementById('shot-stage');
  stage.hidden = false;
  const state = defaultState();
  try {
    state.photos = await loadSamples();
  } catch {
    // No photos: the renderer paints graded placeholders instead.
  }

  if (shot === 'cover') {
    // The hero cover, wide, filling the frame.
    state.layout = 'nine';
    state.grade = 'sunset';
    state.title = 'SUNSET DRIVE';
    state.subtitle = 'neon nights on the coast';
    state.kicker = 'VICE COAST • EST. 2026';
    const canvas = document.createElement('canvas');
    canvas.className = 'shot-cover';
    stage.appendChild(canvas);
    await renderCover(canvas, state, 1280, 720);
  } else if (shot === 'cover2') {
    // A second cover: tilted snapshots, neon grade, portrait.
    state.layout = 'tilted';
    state.grade = 'neon';
    state.title = 'NEON COAST';
    state.subtitle = 'drive it like you stole it';
    state.kicker = 'SUNSET PRESS • VOL. 02';
    const canvas = document.createElement('canvas');
    canvas.className = 'shot-cover';
    stage.appendChild(canvas);
    await renderCover(canvas, state, 592, 740);
  } else if (shot === 'sizes') {
    // One step, all three post sizes.
    const sizes = [
      { label: 'Square · 1080 × 1080', w: 360, h: 360, layout: 'hero-three', grade: 'sunset' },
      { label: 'Portrait · 1080 × 1350', w: 320, h: 400, layout: 'nine', grade: 'gold' },
      { label: 'Wide · 1920 × 1080', w: 427, h: 240, layout: 'classic', grade: 'dusk' },
    ];
    const wrap = document.createElement('div');
    wrap.className = 'shot-sizes';
    stage.appendChild(wrap);
    for (const s of sizes) {
      const cell = document.createElement('figure');
      const canvas = document.createElement('canvas');
      const sub = { ...state, layout: s.layout, grade: s.grade, title: 'SUNSET DRIVE' };
      await renderCover(canvas, sub, s.w * 2, s.h * 2);
      canvas.style.width = `${s.w}px`;
      canvas.style.height = `${s.h}px`;
      const cap = document.createElement('figcaption');
      cap.textContent = s.label;
      cell.appendChild(canvas);
      cell.appendChild(cap);
      wrap.appendChild(cell);
    }
    const note = document.createElement('p');
    note.className = 'shot-note';
    note.textContent = 'One click exports all three sizes — square, portrait and wide.';
    stage.appendChild(note);
  } else {
    // The editor shot is staged by main.js (it boots the real editor with
    // a preset); this module only handles the rendered-cover scenes.
    throw new Error(`unknown shot: ${shot}`);
  }
  window.__shotReady = true;
}
