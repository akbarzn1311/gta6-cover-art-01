// Sunset Press — procedural poster decor.
//
// Everything here is drawn in code: the sunburst behind the title, the
// skyline silhouette, palm silhouettes, the halftone title block, film grain
// and the vignette. No stock art, no Rockstar assets — the poster look comes
// from these shapes plus the grade.

/** A small deterministic pseudo-random generator (seeded per cover). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sunburst rays fanning from (cx, cy) across the canvas. */
export function drawSunburst(ctx, cx, cy, radius, color, rays = 28) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < rays; i += 1) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2 / rays) * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A skyline silhouette along the bottom of a rectangle. */
export function drawSkyline(ctx, x, y, w, h, seed, color) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.fillStyle = color;
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.04 + rnd() * 0.07);
    const bh = h * (0.3 + rnd() * 0.7);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    // A lit window or two on some towers.
    if (rnd() > 0.5) {
      ctx.fillStyle = 'rgba(255,214,120,0.85)';
      ctx.fillRect(bx + bw * 0.3, y + h - bh * 0.7, bw * 0.16, bh * 0.12);
      ctx.fillStyle = color;
    }
    bx += bw + w * 0.008;
  }
  ctx.restore();
}

/** One stylised palm silhouette: a curved trunk and arcing fronds. */
export function drawPalm(ctx, x, y, s, color, lean = -0.25) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a gentle curve.
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * lean * 0.5, y - s * 0.55, x + s * lean, y - s);
  ctx.stroke();
  const topX = x + s * lean;
  const topY = y - s;
  // Fronds: six arcs drooping from the crown.
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  for (let i = 0; i < 6; i += 1) {
    const a = -Math.PI * (0.08 + (i / 5) * 0.84);
    const len = s * (0.42 + (i % 2) * 0.1);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + s * 0.16;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6,
      topY + Math.sin(a) * len * 0.4 - s * 0.1,
      ex,
      ey,
    );
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - s * 0.02, topY + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.04, topY + s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Halftone dots inside a rectangle; dot size grows toward one edge. */
export function drawHalftone(ctx, x, y, w, h, color, maxR = 5, gap = 14) {
  ctx.save();
  ctx.fillStyle = color;
  for (let row = 0, yy = y + gap / 2; yy < y + h; row += 1, yy += gap) {
    for (let col = 0, xx = x + gap / 2; xx < x + w; col += 1, xx += gap) {
      const k = 0.25 + 0.75 * (yy - y) / Math.max(1, h);
      const r = Math.max(0.6, maxR * k * (0.7 + 0.3 * ((row + col) % 2)));
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A reusable film-grain tile, drawn once and reused as a pattern. */
export function makeGrainTile(size = 140, seed = 7) {
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const rnd = mulberry32(seed);
  const img = tctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  return tile;
}

/** Grain + vignette over the whole canvas. */
export function drawFinish(ctx, W, H, grainTile, grainAlpha, vignette) {
  if (grainTile && grainAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = grainAlpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (vignette > 0) {
    const g = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${vignette})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** A five-star heat meter; `filled` stars glow gold, the rest are outlines. */
export function drawStars(ctx, x, y, size, filled, total = 5) {
  ctx.save();
  for (let i = 0; i < total; i += 1) {
    const cx = x + i * size * 1.25;
    drawStar(ctx, cx, y, size / 2, i < filled);
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#ff9e3d';
    ctx.shadowBlur = r * 0.5;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.stroke();
  }
}

/** A diagonal ribbon across a corner, with centred text. */
export function drawRibbon(ctx, W, text, font, bg = '#ff2e4d', fg = '#ffffff') {
  ctx.save();
  ctx.translate(W * 0.86, -W * 0.02);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = bg;
  ctx.fillRect(-W * 0.22, 0, W * 0.44, W * 0.045);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, W * 0.023);
  ctx.restore();
}
