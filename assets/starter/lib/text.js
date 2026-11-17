// Fit a text block inside a projected quadrilateral.
//
// Canvas maxWidth scales only horizontally and knows nothing about roll or
// perspective; a label drawn into a tilted, narrowing panel either overflows or
// shrinks unevenly. This computes the largest uniform scale whose rotated text
// box still fits the drawn quad, and returns the axis to rotate into.
//
// Pure: corners in, layout out. The renderer decides where to translate to.

/** Signed area of a screen-space polygon; the sign gives the outward normal. */
function area(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i], b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

/**
 * @param corners projected quad, in draw order
 * @param width   unscaled text width in pixels
 * @param height  unscaled text block height in pixels
 * @param pad     clearance from the quad edge, in pixels
 * @param minScale below this the label is unreadable and is dropped instead
 * @returns {{angle:number, scale:number, width:number, height:number}|null}
 */
export function fitQuadText(corners, width, height, {pad = 6, minScale = 0.45} = {}) {
  if (!corners || corners.length < 3) return null;
  if (corners.some(p => !p || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return null;
  if (!(width > 0) || !(height > 0)) return null;

  const cx = corners.reduce((s, p) => s + p[0], 0) / corners.length;
  const cy = corners.reduce((s, p) => s + p[1], 0) / corners.length;
  // Baseline of the first edge, so text follows the panel rather than the horizon.
  const angle = Math.atan2(corners[1][1] - corners[0][1], corners[1][0] - corners[0][0]);
  const c = Math.cos(angle), s = Math.sin(angle);
  const rotated = corners.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    return [dx * c + dy * s, -dx * s + dy * c];
  });

  const sign = area(corners) > 0 ? 1 : -1;
  let scale = 1;
  for (let i = 0; i < rotated.length; i += 1) {
    const a = rotated[i], b = rotated[(i + 1) % rotated.length];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const length = Math.hypot(nx, ny);
    if (!(length > 1e-9)) return null;
    nx = (sign * nx) / length;
    ny = (sign * ny) / length;
    const allowance = nx * a[0] + ny * a[1] - pad;
    if (allowance <= 0) return null;
    const support = (width / 2) * Math.abs(nx) + (height / 2) * Math.abs(ny);
    if (support > 1e-9) scale = Math.min(scale, allowance / support);
  }
  if (!Number.isFinite(scale) || scale < minScale) return null;
  const bounded = Math.min(1, scale);
  return {angle, scale: bounded, width: width * bounded, height: height * bounded};
}

/** Draw one label centred in a projected quad, or nothing when it cannot fit. */
export function drawQuadLabel(ctx, corners, text, {size = 12, color = '#9aefae', pad = 6, minScale = 0.45} = {}) {
  if (!ctx || typeof ctx.fillText !== 'function') return null;
  const measure = typeof ctx.measureText === 'function' ? ctx.measureText(text)?.width : 0;
  const width = Number.isFinite(measure) && measure > 0
    ? measure
    : Array.from(text).reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? size : size * 0.62), 0);
  const layout = fitQuadText(corners, width, size * 1.35, {pad, minScale});
  if (!layout) return null;
  const cx = corners.reduce((sum, p) => sum + p[0], 0) / corners.length;
  const cy = corners.reduce((sum, p) => sum + p[1], 0) / corners.length;
  ctx.save?.();
  ctx.translate(cx, cy);
  ctx.rotate(layout.angle);
  ctx.font = `${Math.max(1, Math.round(size * layout.scale))}px FusionPixel`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore?.();
  return layout;
}
