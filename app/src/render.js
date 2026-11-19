// Sunset Press — the cover renderer.
//
// One function, renderCover, paints a whole poster: the graded sky with its
// sun and skyline, the photo panels (each graded through the grade's LUT on
// its own small canvas, then inked and bordered), the halftone title band
// with its gradient lettering, a badge and a star meter, then grain and
// vignette. The same renderer paints the live preview and the exports —
// only the pixel size changes.

import { GRADES, gradeLut, applyGrade } from './grades.js';
import { layoutGeometry } from './layouts.js';
import {
  drawSunburst,
  drawSkyline,
  drawPalm,
  drawHalftone,
  makeGrainTile,
  drawFinish,
  drawStars,
} from './decor.js';
import { drawTitleBlock } from './lettering.js';
import { photoSize } from './photos.js';

let grainTile = null;
const lutCache = new Map();

function lutFor(gradeId, grade) {
  if (!lutCache.has(gradeId)) lutCache.set(gradeId, gradeLut(grade));
  return lutCache.get(gradeId);
}

/** Load the three poster fonts, giving up quietly after a timeout. */
export async function ensureFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 80px Anton'),
        document.fonts.load('400 40px "Bebas Neue"'),
        document.fonts.load('40px Pacifico'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch {
    // System fallbacks still render; the poster just loses its lettering.
  }
}

/** Paint the graded sky: gradient, sun with rays, skyline, palms. */
function drawSky(ctx, W, H, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const sunX = W * 0.72;
  const sunY = H * 0.3;
  const sunR = Math.min(W, H) * 0.17;
  drawSunburst(ctx, sunX, sunY, Math.max(W, H) * 0.75, 'rgba(255,255,255,0.05)');
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.2);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.45, grade.sun);
  glow.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  drawSkyline(ctx, 0, H * 0.86, W, H * 0.14, 42, 'rgba(10,4,20,0.55)');
  drawPalm(ctx, W * 0.015, H * 0.985, H * 0.24, 'rgba(10,4,20,0.8)', -0.3);
  drawPalm(ctx, W * 0.985, H * 0.985, H * 0.19, 'rgba(10,4,20,0.8)', 0.3);
}

/** Cover-fit draw of a photo into a rectangle, with zoom and offset. */
function drawPhotoCover(tctx, img, tw, th, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.max(tw / iw, th / ih) * (panel.zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  const dx = (tw - dw) / 2 + (panel.dx || 0) * Math.max(0, (dw - tw) / 2);
  const dy = (th - dh) / 2 + (panel.dy || 0) * Math.max(0, (dh - th) / 2);
  tctx.drawImage(img, dx, dy, dw, dh);
}

/** Paint one photo panel, graded, inked and bordered. */
function drawPanel(ctx, panel, photo, grade, lut, W, H, tilted) {
  const { x, y, w, h, rot } = panel;
  // Grade on a small canvas: fast in the preview, still exact at export.
  const cap = 900;
  const scale = Math.min(1, cap / Math.max(w, h));
  const tw = Math.max(2, Math.round(w * scale));
  const th = Math.max(2, Math.round(h * scale));
  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  const tctx = tmp.getContext('2d');
  if (photo) {
    drawPhotoCover(tctx, photo.img, tw, th, panel);
    const img = tctx.getImageData(0, 0, tw, th);
    applyGrade(img, grade, lut);
    tctx.putImageData(img, 0, 0);
  } else {
    tctx.fillStyle = '#241a33';
    tctx.fillRect(0, 0, tw, th);
  }
  tctx.fillStyle = grade.tint;
  tctx.fillRect(0, 0, tw, th);

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot || 0);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.max(6, Math.min(W, H) * 0.02);
  ctx.shadowOffsetY = Math.max(3, Math.min(W, H) * 0.008);
  if (tilted) {
    // A snapshot print: white frame, thicker at the bottom.
    const fw = Math.max(4, w * 0.035);
    ctx.fillStyle = '#fdf6e9';
    ctx.fillRect(-w / 2 - fw, -h / 2 - fw, w + fw * 2, h + fw * 2.6);
    ctx.drawImage(tmp, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(tmp, -w / 2, -h / 2, w, h);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Inked border: thick dark line, thin white inner line, corner ticks.
  const bw = Math.max(3, Math.min(W, H) * 0.008);
  ctx.lineWidth = bw;
  ctx.strokeStyle = '#0d0618';
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = Math.max(1.2, bw * 0.28);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeRect(-w / 2 + bw * 0.9, -h / 2 + bw * 0.9, w - bw * 1.8, h - bw * 1.8);
  const tick = Math.max(8, Math.min(w, h) * 0.08);
  ctx.lineWidth = Math.max(2, bw * 0.5);
  ctx.strokeStyle = '#ffffff';
  const corners = [
    [-w / 2, -h / 2, 1, 1],
    [w / 2, -h / 2, -1, 1],
    [-w / 2, h / 2, 1, -1],
    [w / 2, h / 2, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * tick, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * tick);
    ctx.stroke();
  }
  ctx.restore();
}

/** The title band: inked background, neon rule, halftone, lettering. */
function drawTitleBand(ctx, rect, state, grade, layoutId) {
  const { x, y, w, h } = rect;
  ctx.save();
  if (layoutId === 'fullbleed') {
    const g = ctx.createLinearGradient(0, y - h * 0.5, 0, y + h);
    g.addColorStop(0, 'rgba(12,6,24,0)');
    g.addColorStop(1, 'rgba(12,6,24,0.94)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y - h * 0.5, w, h * 1.5);
  } else {
    ctx.fillStyle = 'rgba(12,6,24,0.92)';
    ctx.fillRect(x, y, w, h);
    drawHalftone(ctx, x, y, w, Math.min(h * 0.3, 30), 'rgba(255,255,255,0.14)', 3, 12);
  }
  // Neon top rule.
  const rule = ctx.createLinearGradient(x, 0, x + w, 0);
  rule.addColorStop(0, grade.title[0]);
  rule.addColorStop(0.5, grade.title[1]);
  rule.addColorStop(1, grade.title[2]);
  ctx.fillStyle = rule;
  ctx.fillRect(x, y, w, Math.max(2, h * 0.035));
  drawTitleBlock(ctx, rect, state, grade);

  // Star meter, tucked into the band's bottom edge.
  const starSize = Math.max(8, h * 0.07);
  const rowW = starSize * 1.25 * 5;
  const sx = rect.align === 'left' ? x + (rect.pad || 0) : x + w / 2 - rowW / 2;
  drawStars(ctx, sx, y + h * 0.95, starSize, 5);
  ctx.restore();
}

/** A circular badge overlapping the title band's right end. */
function drawBadge(ctx, rect) {
  const r = Math.max(14, rect.h * 0.42);
  if (rect.w < rect.h * 4) return;
  const cx = rect.x + rect.w - r * 0.85;
  const cy = rect.y + rect.h * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ff2e4d';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${r * 0.34}px "Bebas Neue", sans-serif`;
  ctx.fillText('EST.', cx, cy - r * 0.22);
  ctx.font = `400 ${r * 0.52}px Anton, sans-serif`;
  ctx.fillText('2026', cx, cy + r * 0.28);
  ctx.restore();
}

/**
 * Render the whole cover onto `canvas` at W × H. Awaits the poster fonts
 * first so the lettering never falls back mid-render.
 */
export async function renderCover(canvas, state, W, H) {
  await ensureFonts();
  if (!grainTile) grainTile = makeGrainTile();
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const lut = lutFor(state.grade, grade);
  const geo = layoutGeometry(state.layout, W, H);

  if (geo.bg === 'sky') {
    if (state.showDecor) drawSky(ctx, W, H, grade);
    else {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
    }
  }
  const tilted = state.layout === 'tilted';
  geo.panels.forEach((panel, i) => {
    const slot = state.panels[i] ?? { photo: 0, zoom: 1.15, dx: 0, dy: 0 };
    const photo = state.photos[slot.photo] ?? state.photos[0] ?? null;
    drawPanel(ctx, panel, photo, grade, lut, W, H, tilted);
  });
  drawTitleBand(ctx, geo.title, state, grade, state.layout);
  if (geo.bg === 'sky') drawBadge(ctx, geo.title);
  drawFinish(ctx, W, H, grainTile, state.showGrain ? grade.grain : 0, grade.vignette);
  return canvas;
}

/** Render a cover onto a fresh canvas and return it. */
export async function renderCoverToCanvas(state, W, H) {
  const canvas = document.createElement('canvas');
  await renderCover(canvas, state, W, H);
  return canvas;
}

/** The preview geometry (panel rects in preview pixels) for hit-testing. */
export function previewGeometry(state, W, H) {
  return layoutGeometry(state.layout, W, H);
}

export { photoSize };
