// Sunset Press — cover layouts.
//
// Every layout is a pure function of the canvas size, so the same cover
// adapts to a square, a portrait and a wide export without redrawing the
// editor. Coordinates are pixels. `title` is the rectangle the lettering
// fills; `panels` are the photo rectangles (a `rot` in radians tilts a
// panel). Gutters and margins scale with the smaller side so a layout keeps
// its proportions at any size.

export const LAYOUTS = {
  'hero-three': {
    name: 'Hero + Three',
    blurb: 'One big hero, three stacked beside it',
    geometry(W, H) {
      const m = Math.round(Math.min(W, H) * 0.022);
      const g = Math.round(Math.min(W, H) * 0.014);
      const titleH = Math.round(H * 0.2);
      const bodyH = H - titleH - m * 2;
      const bodyY = m;
      const heroW = Math.round((W - m * 2 - g) * 0.6);
      const sideX = m + heroW + g;
      const sideW = W - sideX - m;
      const sideH = Math.round((bodyH - g * 2) / 3);
      return {
        panels: [
          { x: m, y: bodyY, w: heroW, h: bodyH, rot: 0 },
          { x: sideX, y: bodyY, w: sideW, h: sideH, rot: 0 },
          { x: sideX, y: bodyY + sideH + g, w: sideW, h: sideH, rot: 0 },
          { x: sideX, y: bodyY + (sideH + g) * 2, w: sideW, h: sideH, rot: 0 },
        ],
        title: { x: m, y: H - titleH - m, w: W - m * 2, h: titleH, align: 'left' },
        bg: 'sky',
      };
    },
  },
  nine: {
    name: 'Nine-Panel Grid',
    blurb: 'The classic 3 × 3 poster grid',
    geometry(W, H) {
      const m = Math.round(Math.min(W, H) * 0.022);
      const g = Math.round(Math.min(W, H) * 0.014);
      const titleH = Math.round(H * 0.17);
      const gridY = m + titleH + g;
      const gridH = H - gridY - m;
      const gridW = W - m * 2;
      const cw = Math.round((gridW - g * 2) / 3);
      const ch = Math.round((gridH - g * 2) / 3);
      const panels = [];
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          panels.push({
            x: m + c * (cw + g),
            y: gridY + r * (ch + g),
            w: cw,
            h: ch,
            rot: 0,
          });
        }
      }
      return {
        panels,
        title: { x: m, y: m, w: W - m * 2, h: titleH, align: 'center' },
        bg: 'sky',
      };
    },
  },
  tilted: {
    name: 'Tilted Snapshots',
    blurb: 'Overlapping tilted prints on the sunset',
    geometry(W, H) {
      const m = Math.round(Math.min(W, H) * 0.03);
      const titleH = Math.round(H * 0.22);
      const rowY = Math.round(H * 0.1);
      const rowH = Math.round(H * 0.56);
      const pw = Math.round(W * 0.34);
      const cx = W / 2;
      return {
        panels: [
          { x: cx - pw * 0.92, y: rowY, w: pw, h: rowH, rot: -0.1 },
          { x: cx - pw / 2, y: rowY + Math.round(H * 0.02), w: pw, h: rowH, rot: 0.02 },
          { x: cx - pw * 0.08, y: rowY, w: pw, h: rowH, rot: 0.1 },
        ],
        title: { x: m, y: H - titleH - m, w: W - m * 2, h: titleH, align: 'center' },
        bg: 'sky',
      };
    },
  },
  fullbleed: {
    name: 'Full-Bleed Hero',
    blurb: 'One photo, edge to edge, banded title',
    geometry(W, H) {
      const titleH = Math.round(H * 0.26);
      return {
        panels: [{ x: 0, y: 0, w: W, h: H, rot: 0 }],
        title: { x: 0, y: H - titleH, w: W, h: titleH, align: 'left', pad: Math.round(W * 0.04) },
        bg: 'photo',
      };
    },
  },
  duo: {
    name: 'Split Duo',
    blurb: 'Two tall panels, one title band',
    geometry(W, H) {
      const m = Math.round(Math.min(W, H) * 0.022);
      const g = Math.round(Math.min(W, H) * 0.014);
      const titleH = Math.round(H * 0.18);
      const bodyH = H - titleH - m * 2;
      const halfW = Math.round((W - m * 2 - g) / 2);
      return {
        panels: [
          { x: m, y: m, w: halfW, h: bodyH, rot: 0 },
          { x: m + halfW + g, y: m, w: halfW, h: bodyH, rot: 0 },
        ],
        title: { x: m, y: H - titleH - m, w: W - m * 2, h: titleH, align: 'center' },
        bg: 'sky',
      };
    },
  },
  strip: {
    name: 'Comic Strip',
    blurb: 'Wide hero over a four-panel strip',
    geometry(W, H) {
      const m = Math.round(Math.min(W, H) * 0.022);
      const g = Math.round(Math.min(W, H) * 0.014);
      const titleH = Math.round(H * 0.13);
      const heroH = Math.round((H - titleH - m * 2 - g * 2) * 0.52);
      const stripY = m + heroH + g;
      const stripH = H - stripY - titleH - g - m;
      const sw = Math.round((W - m * 2 - g * 3) / 4);
      const panels = [{ x: m, y: m, w: W - m * 2, h: heroH, rot: 0 }];
      for (let i = 0; i < 4; i += 1) {
        panels.push({ x: m + i * (sw + g), y: stripY, w: sw, h: stripH, rot: 0 });
      }
      return {
        panels,
        title: { x: m, y: H - titleH - m, w: W - m * 2, h: titleH, align: 'center' },
        bg: 'sky',
      };
    },
  },
  classic: {
    name: 'Poster Classic',
    blurb: 'Top feature, three below, title on the seam',
    geometry(W, H) {
      const m = Math.round(Math.min(W, H) * 0.022);
      const g = Math.round(Math.min(W, H) * 0.014);
      const topH = Math.round((H - m * 2 - g) * 0.5);
      const botY = m + topH + g;
      const botH = H - botY - m;
      const bw = Math.round((W - m * 2 - g * 2) / 3);
      const titleH = Math.round(H * 0.2);
      return {
        panels: [
          { x: m, y: m, w: W - m * 2, h: topH, rot: 0 },
          { x: m, y: botY, w: bw, h: botH, rot: 0 },
          { x: m + bw + g, y: botY, w: bw, h: botH, rot: 0 },
          { x: m + (bw + g) * 2, y: botY, w: bw, h: botH, rot: 0 },
        ],
        title: {
          x: m,
          y: botY - titleH / 2,
          w: W - m * 2,
          h: titleH,
          align: 'center',
          overlap: true,
        },
        bg: 'sky',
      };
    },
  },
};

/** Geometry for a layout id at a canvas size; falls back to hero-three. */
export function layoutGeometry(layoutId, W, H) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS['hero-three'];
  return layout.geometry(W, H);
}
