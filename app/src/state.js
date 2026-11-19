// Sunset Press — the cover studio's state.
//
// One plain object holds everything the renderer needs. Panels are a fixed
// array of nine slots; each layout uses as many as it needs (its panelCount)
// and maps slot i to its own rectangle, so switching layouts never loses a
// photo assignment. A panel's photo is an index into `photos`, plus a zoom
// and an offset the user drags in the preview.

export const LAYOUT_IDS = [
  'hero-three',
  'nine',
  'tilted',
  'fullbleed',
  'duo',
  'strip',
  'classic',
];

export const GRADE_IDS = ['sunset', 'neon', 'noir', 'gold', 'dusk', 'retro'];

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

/** A fresh default state: two sample photos, a hero layout, sunset grade. */
export function defaultState() {
  return {
    title: 'SUNSET DRIVE',
    subtitle: 'neon nights on the coast',
    kicker: 'VICE COAST • EST. 2026',
    layout: 'nine',
    grade: 'sunset',
    titleFill: 'gradient',
    photos: [],
    panels: [
      // Varied crops per slot, so the same photo reads differently in
      // every panel of a grid instead of repeating identically.
      { photo: 0, zoom: 1.28, dx: -0.3, dy: 0.12 },
      { photo: 1, zoom: 1.5, dx: 0.25, dy: -0.18 },
      { photo: 0, zoom: 1.15, dx: 0.1, dy: 0.28 },
      { photo: 1, zoom: 1.35, dx: -0.2, dy: 0.05 },
      { photo: 0, zoom: 1.6, dx: 0.3, dy: -0.22 },
      { photo: 1, zoom: 1.2, dx: 0.15, dy: 0.3 },
      { photo: 0, zoom: 1.45, dx: -0.35, dy: -0.1 },
      { photo: 1, zoom: 1.3, dx: 0.2, dy: 0.15 },
      { photo: 0, zoom: 1.55, dx: 0, dy: -0.28 },
    ],
    selected: 0,
    size: '1080x1350',
    showGrain: true,
    showDecor: true,
  };
}

/** The panel count each layout draws. */
export function panelCountOf(layout) {
  switch (layout) {
    case 'hero-three':
      return 4;
    case 'nine':
      return 9;
    case 'tilted':
      return 3;
    case 'fullbleed':
      return 1;
    case 'duo':
      return 2;
    case 'strip':
      return 5;
    case 'classic':
      return 4;
    default:
      return 4;
  }
}
