// Sunset Press — colour grades.
//
// A grade is a gradient map: a photo's luminance is remapped through three
// stops (shadows, midtones, highlights) and mixed back with the original, so
// the photo keeps its detail and takes on the grade's palette. The sky, the
// sun and the title gradient follow the same palette, so the whole poster
// feels like one piece of art.

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    sky: ['#1d0b3d', '#7b1e5b', '#ff7e2e', '#ffd166'],
    sun: '#fff3b0',
    map: { shadows: [26, 8, 48], mids: [255, 110, 60], highs: [255, 232, 175] },
    mix: 0.72,
    title: ['#ffe66d', '#ff9e3d', '#ff3d68'],
    tint: 'rgba(255,120,40,0.08)',
    grain: 0.1,
    vignette: 0.32,
  },
  neon: {
    name: 'Neon Nights',
    sky: ['#0a0618', '#2b0a4d', '#c81d8f', '#00e5ff'],
    sun: '#ff9de2',
    map: { shadows: [10, 4, 34], mids: [200, 30, 140], highs: [120, 240, 255] },
    mix: 0.78,
    title: ['#7df9ff', '#ff6ec7', '#b967ff'],
    tint: 'rgba(190,40,255,0.10)',
    grain: 0.12,
    vignette: 0.38,
  },
  noir: {
    name: 'Noir',
    sky: ['#0b0b0e', '#23232e', '#4a4a58', '#8a8a9a'],
    sun: '#f5f0e6',
    map: { shadows: [8, 8, 10], mids: [120, 118, 126], highs: [245, 242, 235] },
    mix: 0.85,
    title: ['#f5f0e6', '#d8d2c4', '#ff2e4d'],
    tint: 'rgba(255,46,77,0.06)',
    grain: 0.16,
    vignette: 0.45,
  },
  gold: {
    name: 'Palm Gold',
    sky: ['#231303', '#7a4a06', '#e8a020', '#ffe9a8'],
    sun: '#fff8d6',
    map: { shadows: [40, 20, 4], mids: [232, 160, 32], highs: [255, 240, 190] },
    mix: 0.7,
    title: ['#fff3b0', '#ffc93d', '#e07b00'],
    tint: 'rgba(255,190,60,0.08)',
    grain: 0.09,
    vignette: 0.3,
  },
  dusk: {
    name: 'Aqua Dusk',
    sky: ['#04101f', '#0b3b5e', '#1e7fa8', '#7fe0d4'],
    sun: '#dffcf5',
    map: { shadows: [6, 18, 34], mids: [30, 127, 168], highs: [190, 240, 230] },
    mix: 0.74,
    title: ['#a8f0e0', '#4fc3f7', '#7c4dff'],
    tint: 'rgba(40,160,200,0.08)',
    grain: 0.1,
    vignette: 0.34,
  },
  retro: {
    name: 'Retro Fade',
    sky: ['#3d1f2b', '#8a4b3a', '#e08a5a', '#f7d9a0'],
    sun: '#fdeecf',
    map: { shadows: [58, 32, 40], mids: [214, 130, 92], highs: [250, 224, 178] },
    mix: 0.6,
    title: ['#f7d9a0', '#e08a5a', '#c94f5e'],
    tint: 'rgba(224,138,90,0.10)',
    grain: 0.14,
    vignette: 0.3,
  },
};

/** Build a 256-entry RGB look-up table for a grade's gradient map. */
export function gradeLut(grade) {
  const lut = new Uint8ClampedArray(256 * 3);
  const { shadows, mids, highs } = grade.map;
  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    let c;
    if (t < 0.5) {
      const k = t / 0.5;
      c = [
        shadows[0] + (mids[0] - shadows[0]) * k,
        shadows[1] + (mids[1] - shadows[1]) * k,
        shadows[2] + (mids[2] - shadows[2]) * k,
      ];
    } else {
      const k = (t - 0.5) / 0.5;
      c = [
        mids[0] + (highs[0] - mids[0]) * k,
        mids[1] + (highs[1] - mids[1]) * k,
        mids[2] + (highs[2] - mids[2]) * k,
      ];
    }
    lut[i * 3] = c[0];
    lut[i * 3 + 1] = c[1];
    lut[i * 3 + 2] = c[2];
  }
  return lut;
}

/**
 * Apply a grade to an ImageData in place: luminance through the LUT, mixed
 * back with the original pixels so detail survives the grade.
 */
export function applyGrade(imageData, grade, lut) {
  const d = imageData.data;
  const mix = grade.mix;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const j = lum * 3;
    d[i] = d[i] * (1 - mix) + lut[j] * mix;
    d[i + 1] = d[i + 1] * (1 - mix) + lut[j + 1] * mix;
    d[i + 2] = d[i + 2] * (1 - mix) + lut[j + 2] * mix;
  }
}
