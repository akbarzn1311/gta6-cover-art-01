// Sunset Press — the editor.
//
// Wires the studio UI to the renderer: photo uploads and thumbnails, the
// layout and grade pickers, the caption fields, per-panel crop controls, the
// preview canvas (click to select a panel, drag to move its photo, scroll
// to zoom it) and the PNG exports. Every change re-renders the cover; the
// preview is exactly what an export paints, only smaller on screen.

import { defaultState, panelCountOf, EXPORT_SIZES } from './state.js';
import { GRADES } from './grades.js';
import { LAYOUTS } from './layouts.js';
import { renderCover, previewGeometry } from './render.js';
import { loadPhotoFile, loadSamples, photoSize } from './photos.js';
import { exportPng, exportAll } from './export.js';

const state = defaultState();
const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');
let renderQueued = false;
let statusTimer = null;

/** Show a one-line status message in the header. */
function status(text) {
  const el = $('status');
  if (el) el.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    if (el) el.textContent = 'Ready — your photos never leave this machine.';
  }, 5000);
}

/** The cover's pixel size for the currently chosen export size. */
function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.size) ?? EXPORT_SIZES[0];
}

/** Re-render the preview, at most once per animation frame. */
function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(async () => {
    renderQueued = false;
    const size = currentSize();
    try {
      await renderCover(preview, state, size.w, size.h);
      drawSelection();
    } catch (err) {
      status(`Render failed: ${err.message}`);
    }
  });
}

/** A dashed outline around the selected panel, on top of the preview. */
function drawSelection() {
  const size = currentSize();
  const geo = previewGeometry(state, size.w, size.h);
  const count = panelCountOf(state.layout);
  const panel = geo.panels[Math.min(state.selected, count - 1)];
  if (!panel) return;
  pctx.save();
  pctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  pctx.rotate(panel.rot || 0);
  pctx.setLineDash([14, 10]);
  pctx.lineWidth = Math.max(3, size.w * 0.004);
  pctx.strokeStyle = '#ffffff';
  pctx.strokeRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  pctx.setLineDash([]);
  pctx.restore();
}

/** Cover-fit draw size of a photo inside a panel, for drag math. */
function drawRectOf(photo, pw, ph, panel) {
  const { w: iw, h: ih } = photoSize(photo);
  const s = Math.max(pw / iw, ph / ih) * (panel.zoom || 1);
  return { dw: iw * s, dh: ih * s };
}

// ------------------------------------------------------------ photos

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const photo = await loadPhotoFile(file);
      state.photos.push(photo);
      added += 1;
    } catch (err) {
      status(`Could not load ${file.name}: ${err.message}`);
    }
  }
  if (added > 0) {
    buildPhotoStrip();
    status(`Added ${added} photo${added > 1 ? 's' : ''}. Click one to put it in the selected panel.`);
    queueRender();
  }
}

function buildPhotoStrip() {
  const strip = $('photos');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('button');
    thumb.className = 'thumb';
    thumb.type = 'button';
    thumb.title = `${photo.name} — click: use in selected panel · double-click: use everywhere`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    img.draggable = true;
    thumb.appendChild(img);
    thumb.addEventListener('click', () => {
      assignPhoto(i, state.selected);
    });
    thumb.addEventListener('dblclick', () => {
      state.panels.forEach((p) => {
        p.photo = i;
      });
      status(`Photo ${i + 1} fills every panel.`);
      queueRender();
    });
    img.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/photo-index', String(i));
    });
    strip.appendChild(thumb);
  });
}

function assignPhoto(photoIndex, panelIndex) {
  if (!state.photos[photoIndex]) return;
  state.panels[panelIndex].photo = photoIndex;
  status(`Panel ${panelIndex + 1} uses photo ${photoIndex + 1}.`);
  queueRender();
}

// ------------------------------------------------------------ pickers

function buildPickers() {
  const layoutBox = $('layouts');
  Object.entries(LAYOUTS).forEach(([id, layout]) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.type = 'button';
    b.dataset.layout = id;
    b.innerHTML = `<b>${layout.name}</b><span>${layout.blurb}</span>`;
    b.addEventListener('click', () => {
      state.layout = id;
      state.selected = 0;
      syncPickers();
      syncPanelControls();
      queueRender();
    });
    layoutBox.appendChild(b);
  });

  const gradeBox = $('grades');
  Object.entries(GRADES).forEach(([id, grade]) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.type = 'button';
    b.dataset.grade = id;
    b.title = grade.name;
    b.style.background = `linear-gradient(135deg, ${grade.sky[1]}, ${grade.sky[2]} 55%, ${grade.title[2]})`;
    b.innerHTML = `<span>${grade.name}</span>`;
    b.addEventListener('click', () => {
      state.grade = id;
      syncPickers();
      queueRender();
    });
    gradeBox.appendChild(b);
  });

  const sizeBox = $('sizes');
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.type = 'button';
    b.dataset.size = size.id;
    b.innerHTML = `<b>${size.label}</b>`;
    b.addEventListener('click', () => {
      state.size = size.id;
      syncPickers();
      queueRender();
    });
    sizeBox.appendChild(b);
  });
}

function syncPickers() {
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
}

// ------------------------------------------------------------ panel controls

function syncPanelControls() {
  const count = panelCountOf(state.layout);
  const slot = state.panels[Math.min(state.selected, count - 1)];
  $('panel-label').textContent = `Panel ${Math.min(state.selected, count - 1) + 1} of ${count}`;
  const sel = $('panel-photo');
  sel.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1} · ${photo.name}`;
    sel.appendChild(opt);
  });
  sel.value = String(slot.photo);
  $('panel-zoom').value = String(slot.zoom);
  $('panel-x').value = String(slot.dx * 100);
  $('panel-y').value = String(slot.dy * 100);
}

function bindPanelControls() {
  $('panel-photo').addEventListener('change', (e) => {
    assignPhoto(Number(e.target.value), state.selected);
  });
  $('panel-zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value);
    queueRender();
  });
  $('panel-x').addEventListener('input', (e) => {
    state.panels[state.selected].dx = Number(e.target.value) / 100;
    queueRender();
  });
  $('panel-y').addEventListener('input', (e) => {
    state.panels[state.selected].dy = Number(e.target.value) / 100;
    queueRender();
  });
}

// ------------------------------------------------------------ preview interaction

function canvasPoint(e) {
  const rect = preview.getBoundingClientRect();
  const size = currentSize();
  return {
    x: ((e.clientX - rect.left) / rect.width) * size.w,
    y: ((e.clientY - rect.top) / rect.height) * size.h,
  };
}

function hitPanel(point) {
  const size = currentSize();
  const geo = previewGeometry(state, size.w, size.h);
  const count = panelCountOf(state.layout);
  for (let i = count - 1; i >= 0; i -= 1) {
    const p = geo.panels[i];
    // Undo the panel's rotation for the hit test.
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const rot = -(p.rot || 0);
    const rx = dx * Math.cos(rot) - dy * Math.sin(rot);
    const ry = dx * Math.sin(rot) + dy * Math.cos(rot);
    if (Math.abs(rx) <= p.w / 2 && Math.abs(ry) <= p.h / 2) return i;
  }
  return -1;
}

let drag = null;

function bindPreview() {
  preview.addEventListener('pointerdown', (e) => {
    const point = canvasPoint(e);
    const hit = hitPanel(point);
    if (hit < 0) return;
    state.selected = hit;
    syncPanelControls();
    const size = currentSize();
    const geo = previewGeometry(state, size.w, size.h);
    const panel = geo.panels[hit];
    const slot = state.panels[hit];
    const photo = state.photos[slot.photo];
    drag = { startX: point.x, startY: point.y, dx: slot.dx, dy: slot.dy, panel, photo };
    preview.setPointerCapture(e.pointerId);
    queueRender();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag || !drag.photo) return;
    const point = canvasPoint(e);
    const { dw, dh } = drawRectOf(drag.photo, drag.panel.w, drag.panel.h, state.panels[state.selected]);
    const slot = state.panels[state.selected];
    const rangeX = Math.max(0, (dw - drag.panel.w) / 2);
    const rangeY = Math.max(0, (dh - drag.panel.h) / 2);
    if (rangeX > 0) slot.dx = Math.max(-1, Math.min(1, drag.dx + (point.x - drag.startX) / rangeX));
    if (rangeY > 0) slot.dy = Math.max(-1, Math.min(1, drag.dy + (point.y - drag.startY) / rangeY));
    syncPanelControls();
    queueRender();
  });
  preview.addEventListener('pointerup', () => {
    drag = null;
  });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.panels[state.selected];
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * Math.exp(-e.deltaY * 0.0012)));
    syncPanelControls();
    queueRender();
  }, { passive: false });
  preview.addEventListener('dragover', (e) => e.preventDefault());
  preview.addEventListener('drop', (e) => {
    e.preventDefault();
    const index = Number(e.dataTransfer.getData('text/photo-index'));
    const hit = hitPanel(canvasPoint(e));
    if (Number.isFinite(index) && hit >= 0) assignPhoto(index, hit);
  });
}

// ------------------------------------------------------------ caption + export

function bindCaption() {
  const bind = (id, key) => {
    $(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      queueRender();
    });
  };
  bind('cap-title', 'title');
  bind('cap-sub', 'subtitle');
  bind('cap-kicker', 'kicker');
  $('title-fill').addEventListener('change', (e) => {
    state.titleFill = e.target.value;
    queueRender();
  });
  $('toggle-grain').addEventListener('change', (e) => {
    state.showGrain = e.target.checked;
    queueRender();
  });
  $('toggle-decor').addEventListener('change', (e) => {
    state.showDecor = e.target.checked;
    queueRender();
  });
}

function bindExport() {
  $('export-one').addEventListener('click', async () => {
    status('Exporting…');
    try {
      const r = await exportPng(state, state.size);
      status(`Exported ${r.name} (${r.w} × ${r.h}, ${(r.bytes / 1024).toFixed(0)} KB).`);
    } catch (err) {
      status(`Export failed: ${err.message}`);
    }
  });
  $('export-all').addEventListener('click', async () => {
    status('Exporting all three sizes…');
    try {
      const results = await exportAll(state, (r) => status(`Exported ${r.name}…`));
      status(`Exported ${results.length} PNGs — square, portrait and wide.`);
    } catch (err) {
      status(`Export failed: ${err.message}`);
    }
  });
  $('add-photos').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
}

// ------------------------------------------------------------ boot

async function boot() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot && shot !== 'editor') {
    document.body.classList.add('shot-mode');
    const { runShot } = await import('./shots.js');
    await runShot(shot);
    return;
  }
  buildPickers();
  bindPanelControls();
  bindPreview();
  bindCaption();
  bindExport();
  syncPickers();
  try {
    state.photos = await loadSamples();
  } catch (err) {
    status(`Samples failed to load: ${err.message}`);
  }
  buildPhotoStrip();
  syncPanelControls();
  $('cap-title').value = state.title;
  $('cap-sub').value = state.subtitle;
  $('cap-kicker').value = state.kicker;
  if (shot === 'editor') {
    // The editor screenshot: hero layout, sunset grade, samples loaded, in
    // the wide size so the whole preview fits the capture frame.
    state.layout = 'hero-three';
    state.grade = 'sunset';
    state.size = '1920x1080';
    syncPickers();
  }
  queueRender();
  if (shot === 'editor') {
    // Signal the capture tool once the first preview has painted.
    setTimeout(() => {
      window.__shotReady = true;
    }, 1200);
  }
  // Test hook for the browser smoke test (harmless in normal use).
  window.__sunsetPress = { state, exportPng, exportAll };
}

boot();
