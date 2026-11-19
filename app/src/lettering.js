// Sunset Press — poster lettering.
//
// The title is Anton, filled with the grade's sunset gradient, stroked in
// white and dropped in black — the bold caption lettering of the genre. The
// subtitle is Pacifico with a neon glow; the kicker is letterspaced Bebas
// Neue. Text is fitted to its box: the font size shrinks until the title
// fits on one line (or two, for very long titles).

/** Fit a font size so `text` fits `maxW` (and `maxH` for two lines). */
export function fitFont(ctx, text, fontFamily, weight, startPx, maxW, maxH) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${fontFamily}`;
  const single = ctx.measureText(text).width <= maxW;
  if (single && px <= maxH) return { px, lines: [text] };
  while (px > 12) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxW && px <= maxH) {
      return { px, lines: [text] };
    }
  }
  // Still too wide: split on the middle word boundary into two lines.
  const words = text.split(' ');
  if (words.length > 1) {
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i += 1) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const diff = Math.abs(a.length - b.length);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    const lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    px = startPx;
    while (px > 12) {
      ctx.font = `${weight} ${px}px ${fontFamily}`;
      if (lines.every((ln) => ctx.measureText(ln).width <= maxW) && px * 2.1 <= maxH) {
        return { px, lines };
      }
      px -= 2;
    }
    return { px, lines };
  }
  return { px, lines: [text] };
}

/**
 * Draw the title block: kicker above, big gradient title, neon subtitle
 * below, all centred or left-aligned in `rect`. Returns the title baseline
 * metrics so the caller can place a ribbon or stars beside it.
 */
export function drawTitleBlock(ctx, rect, state, grade) {
  const { x, y, w, h, align = 'center', pad = 0 } = rect;
  const cx = align === 'left' ? x + pad : x + w / 2;
  const title = (state.title || 'UNTITLED').toUpperCase();
  const subtitle = state.subtitle || '';
  const kicker = state.kicker || '';

  ctx.save();
  ctx.textAlign = align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';

  // Kicker: letterspaced Bebas Neue, small, warm white.
  const kickerPx = Math.max(10, Math.round(h * 0.09));
  ctx.font = `400 ${kickerPx}px "Bebas Neue", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.round(kickerPx * 0.32)}px`;
  } catch {
    // Older canvas: letterSpacing unsupported — plain spacing still reads.
  }
  ctx.fillStyle = 'rgba(255,244,214,0.92)';
  const kickerY = y + h * 0.13;
  ctx.fillText(kicker, cx, kickerY);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    /* ignore */
  }

  // Title: Anton, gradient fill, white stroke, black drop shadow. The
  // stack is laid out as fractions of the band so kicker, title, subtitle
  // and stars never crowd each other, even in a short band.
  const titleTop = y + h * 0.16;
  const fit = fitFont(ctx, title, 'Anton', 400, Math.round(h * 0.46), w - pad * 2, h * 0.46);
  const titlePx = fit.px;
  const grad = ctx.createLinearGradient(0, titleTop, 0, titleTop + titlePx * fit.lines.length * 1.02);
  const stops = grade.title;
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);
  ctx.font = `400 ${titlePx}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  const lineH = titlePx * 1.02;
  fit.lines.forEach((line, i) => {
    const ly = titleTop + titlePx + i * lineH;
    // Drop shadow.
    ctx.save();
    ctx.translate(titlePx * 0.045, titlePx * 0.06);
    ctx.fillStyle = 'rgba(10,4,20,0.85)';
    ctx.fillText(line, cx, ly);
    ctx.restore();
    // White outline, then gradient fill.
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = Math.max(1.5, titlePx * 0.045);
    ctx.strokeText(line, cx, ly);
    if (state.titleFill === 'solid') {
      ctx.fillStyle = stops[1];
    } else if (state.titleFill === 'outline') {
      ctx.fillStyle = 'rgba(20,8,32,0.9)';
    } else {
      ctx.fillStyle = grad;
    }
    ctx.fillText(line, cx, ly);
  });

  // Subtitle: Pacifico, neon glow, on its own line below the title.
  if (subtitle) {
    const subPx = Math.max(11, Math.round(h * 0.13));
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subPx * 0.9;
    ctx.fillText(subtitle, cx, y + h * 0.84);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
