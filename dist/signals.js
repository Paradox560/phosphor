/**
 * Local vector-to-voltage engine for an X–Y oscilloscope.
 * A stroke is an array of [x, y] coordinates; y points upward.
 * Public generators preserve aspect ratio and fit within ±0.9.
 */

const GLYPHS = {
  A: [[[0, 1], [.5, 0], [1, 1]], [[.22, .58], [.78, .58]]],
  B: [[[0, 1], [0, 0], [.62, 0], [.92, .15], [.92, .35], [.62, .5], [0, .5]], [[.62, .5], [1, .65], [1, .83], [.68, 1], [0, 1]]],
  C: [[[1, .15], [.75, 0], [.2, 0], [0, .2], [0, .8], [.2, 1], [.75, 1], [1, .85]]],
  D: [[[0, 1], [0, 0], [.55, 0], [1, .28], [1, .72], [.55, 1], [0, 1]]],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, .5], [.78, .5]]],
  F: [[[1, 0], [0, 0], [0, 1]], [[0, .5], [.78, .5]]],
  G: [[[1, .18], [.75, 0], [.22, 0], [0, .2], [0, .8], [.22, 1], [.8, 1], [1, .8], [1, .53], [.55, .53]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, .5], [1, .5]]],
  I: [[[.15, 0], [.85, 0]], [[.5, 0], [.5, 1]], [[.15, 1], [.85, 1]]],
  J: [[[.2, 0], [1, 0], [1, .8], [.8, 1], [.25, 1], [0, .75]]],
  K: [[[0, 0], [0, 1]], [[1, 0], [0, .55], [1, 1]]],
  L: [[[0, 0], [0, 1], [1, 1]]],
  M: [[[0, 1], [0, 0], [.5, .58], [1, 0], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  O: [[[.22, 0], [.78, 0], [1, .22], [1, .78], [.78, 1], [.22, 1], [0, .78], [0, .22], [.22, 0]]],
  P: [[[0, 1], [0, 0], [.72, 0], [1, .2], [1, .4], [.72, .58], [0, .58]]],
  Q: [[[.22, 0], [.78, 0], [1, .22], [1, .72], [.72, 1], [.22, 1], [0, .78], [0, .22], [.22, 0]], [[.6, .7], [1.1, 1.1]]],
  R: [[[0, 1], [0, 0], [.72, 0], [1, .2], [1, .4], [.72, .55], [0, .55]], [[.48, .55], [1, 1]]],
  S: [[[1, .15], [.78, 0], [.22, 0], [0, .2], [0, .35], [.22, .5], [.78, .5], [1, .65], [1, .8], [.78, 1], [.22, 1], [0, .85]]],
  T: [[[0, 0], [1, 0]], [[.5, 0], [.5, 1]]],
  U: [[[0, 0], [0, .78], [.22, 1], [.78, 1], [1, .78], [1, 0]]],
  V: [[[0, 0], [.5, 1], [1, 0]]],
  W: [[[0, 0], [.22, 1], [.5, .48], [.78, 1], [1, 0]]],
  X: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]],
  Y: [[[0, 0], [.5, .5], [1, 0]], [[.5, .5], [.5, 1]]],
  Z: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  0: [[[.22, 0], [.78, 0], [1, .22], [1, .78], [.78, 1], [.22, 1], [0, .78], [0, .22], [.22, 0]], [[.2, .8], [.8, .2]]],
  1: [[[.2, .2], [.5, 0], [.5, 1]], [[.15, 1], [.85, 1]]],
  2: [[[0, .2], [.22, 0], [.78, 0], [1, .2], [1, .38], [0, 1], [1, 1]]],
  3: [[[0, .1], [.25, 0], [.78, 0], [1, .2], [.78, .5], [.38, .5]], [[.78, .5], [1, .7], [1, .8], [.78, 1], [.2, 1], [0, .9]]],
  4: [[[.78, 1], [.78, 0], [0, .65], [1, .65]]],
  5: [[[1, 0], [0, 0], [0, .48], [.72, .48], [1, .65], [1, .8], [.78, 1], [.22, 1], [0, .85]]],
  6: [[[.93, .1], [.72, 0], [.25, 0], [0, .3], [0, .8], [.22, 1], [.78, 1], [1, .8], [1, .65], [.78, .48], [0, .48]]],
  7: [[[0, 0], [1, 0], [.25, 1]]],
  8: [[[.22, 0], [.78, 0], [1, .18], [1, .32], [.78, .5], [.22, .5], [0, .32], [0, .18], [.22, 0]], [[.22, .5], [0, .68], [0, .82], [.22, 1], [.78, 1], [1, .82], [1, .68], [.78, .5]]],
  9: [[[1, .52], [.22, .52], [0, .35], [0, .2], [.22, 0], [.78, 0], [1, .2], [1, .72], [.72, 1], [.25, 1]]],
  '.': [[[.48, .97], [.52, 1]]],
  ',': [[[.55, .9], [.4, 1.15]]],
  ':': [[[.48, .3], [.52, .33]], [[.48, .8], [.52, .83]]],
  ';': [[[.48, .3], [.52, .33]], [[.55, .85], [.4, 1.1]]],
  '!': [[[.5, 0], [.5, .7]], [[.48, .97], [.52, 1]]],
  '?': [[[0, .2], [.22, 0], [.78, 0], [1, .2], [1, .35], [.5, .6], [.5, .72]], [[.48, .97], [.52, 1]]],
  '-': [[[.1, .5], [.9, .5]]],
  '_': [[[0, 1], [1, 1]]],
  '+': [[[.1, .5], [.9, .5]], [[.5, .1], [.5, .9]]],
  '=': [[[.1, .35], [.9, .35]], [[.1, .65], [.9, .65]]],
  '/': [[[0, 1], [1, 0]]],
  '\\': [[[0, 0], [1, 1]]],
  '(': [[[.7, 0], [.35, .2], [.25, .5], [.35, .8], [.7, 1]]],
  ')': [[[.3, 0], [.65, .2], [.75, .5], [.65, .8], [.3, 1]]],
  '[': [[[.7, 0], [.3, 0], [.3, 1], [.7, 1]]],
  ']': [[[.3, 0], [.7, 0], [.7, 1], [.3, 1]]],
  '<': [[[.9, .1], [.1, .5], [.9, .9]]],
  '>': [[[.1, .1], [.9, .5], [.1, .9]]],
  "'": [[[.5, 0], [.45, .25]]],
  '"': [[[.3, 0], [.25, .25]], [[.7, 0], [.65, .25]]],
  '#': [[[.35, 0], [.2, 1]], [[.8, 0], [.65, 1]], [[.05, .35], [.95, .35]], [[0, .65], [.9, .65]]],
  '*': [[[.5, .1], [.5, .9]], [[.1, .3], [.9, .7]], [[.1, .7], [.9, .3]]],
  '&': [[[1, 1], [.15, .2], [.3, 0], [.6, 0], [.75, .2], [0, .75], [.15, 1], [.65, 1], [1, .55]]],
  '@': [[[.75, .75], [.75, .25], [.3, .25], [.25, .7], [.75, .75], [1, .65], [1, .2], [.8, 0], [.2, 0], [0, .2], [0, .8], [.2, 1], [.85, 1]]],
  '%': [[[0, 1], [1, 0]], [[.15, 0], [.3, .1], [.15, .3], [0, .2], [.15, 0]], [[.85, .7], [1, .8], [.85, 1], [.7, .9], [.85, .7]]],
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function cleanStrokes(strokes) {
  if (!Array.isArray(strokes)) return [];
  return strokes.map(s => Array.isArray(s) ? s.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => [p[0], p[1]]) : []).filter(s => s.length);
}

function normalize(strokes) {
  const clean = cleanStrokes(strokes);
  if (!clean.length) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of clean) for (const [x, y] of s) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return clean.map(s => s.map(([x, y]) => [(x - cx) * 1.8 / span, (y - cy) * 1.8 / span]));
}

/** A single-line vector alphabet; lower-case is displayed as uppercase. */
export function textToStrokes(text) {
  const lines = String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 160).split('\n').slice(0, 5);
  const strokes = [];
  lines.forEach((line, row) => {
    const width = Math.max(0, line.length * 1.35 - .35);
    [...line].forEach((letter, col) => {
      if (/\s/.test(letter)) return;
      for (const stroke of GLYPHS[letter] || GLYPHS['?']) {
        strokes.push(stroke.map(([x, y]) => [x + col * 1.35 - width / 2, -y - row * 1.6]));
      }
    });
  });
  return normalize(strokes);
}

function parametric(fn, count = 360, start = 0, end = Math.PI * 2) {
  return Array.from({ length: count + 1 }, (_, i) => fn(start + (end - start) * i / count));
}

export function presetStrokes(name) {
  let strokes;
  switch (String(name).toLowerCase()) {
    case 'heart':
      strokes = [parametric(t => [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)])]; break;
    case 'saturn': {
      const tilt = -.32;
      const ring = parametric(t => { const x = 1.35 * Math.cos(t), y = .36 * Math.sin(t); return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)]; });
      strokes = [parametric(t => [.65 * Math.cos(t), .65 * Math.sin(t)]), ring]; break;
    }
    case 'butterfly':
      strokes = [parametric(t => { const r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.sin(t / 12) ** 5; return [Math.sin(t) * r, Math.cos(t) * r]; }, 1000, 0, 12 * Math.PI)]; break;
    case 'wave': case 'sine':
      strokes = [parametric(t => [t / Math.PI - 2, .75 * Math.sin(t)], 420, 0, 4 * Math.PI)]; break;
    case 'infinity':
      strokes = [parametric(t => [Math.cos(t) / (1 + Math.sin(t) ** 2), Math.cos(t) * Math.sin(t) / (1 + Math.sin(t) ** 2)])]; break;
    case 'spiral':
      strokes = [parametric(t => [(t / (6 * Math.PI)) * Math.cos(t), (t / (6 * Math.PI)) * Math.sin(t)], 600, 0, 6 * Math.PI)]; break;
    case 'star':
      strokes = [Array.from({ length: 11 }, (_, i) => { const t = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .43 : 1; return [r * Math.cos(t), r * Math.sin(t)]; })]; break;
    case 'flower':
      strokes = [parametric(t => [(1 + .35 * Math.cos(6 * t)) * Math.cos(t), (1 + .35 * Math.cos(6 * t)) * Math.sin(t)], 500), parametric(t => [.25 * Math.cos(t), .25 * Math.sin(t)], 100)]; break;
    case 'atom':
      strokes = [0, Math.PI / 3, -Math.PI / 3].map(a => parametric(t => [Math.cos(t) * Math.cos(a) - .3 * Math.sin(t) * Math.sin(a), Math.cos(t) * Math.sin(a) + .3 * Math.sin(t) * Math.cos(a)])); break;
    case 'square':
      strokes = [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]]; break;
    case 'triangle':
      strokes = [[[0, 1], [-.866, -.5], [.866, -.5], [0, 1]]]; break;
    case 'circle': default:
      strokes = [parametric(t => [Math.cos(t), Math.sin(t)])];
  }
  return normalize(strokes);
}

function rasterize(source, maxSize) {
  const sw = source.naturalWidth || source.videoWidth || source.width;
  const sh = source.naturalHeight || source.videoHeight || source.height;
  if (!(sw > 0 && sh > 0)) throw new Error('This image has no readable pixels.');
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const width = Math.max(3, Math.round(sw * scale)), height = Math.max(3, Math.round(sh * scale));
  if (source.data && source.data.length >= sw * sh * 4) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const from = (Math.min(sh - 1, Math.floor(y * sh / height)) * sw + Math.min(sw - 1, Math.floor(x * sw / width))) * 4;
      data.set(source.data.subarray ? source.data.subarray(from, from + 4) : source.data.slice(from, from + 4), (y * width + x) * 4);
    }
    return { data, width, height };
  }
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) throw new Error('Image elements require a browser canvas. Pass ImageData instead.');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

// Zhang–Suen thinning: retains the centerlines and connectivity of line art.
function skeletonize(pixels, w, h) {
  for (let pass = 0; pass < 90; pass++) {
    let changed = false;
    for (let phase = 0; phase < 2; phase++) {
      const remove = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!pixels[i]) continue;
        const p = [pixels[i - w], pixels[i - w + 1], pixels[i + 1], pixels[i + w + 1], pixels[i + w], pixels[i + w - 1], pixels[i - 1], pixels[i - w - 1]];
        const neighbors = p.reduce((s, n) => s + n, 0);
        if (neighbors < 2 || neighbors > 6) continue;
        let transitions = 0;
        for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) transitions++;
        if (transitions !== 1) continue;
        if (!phase ? p[0] * p[2] * p[4] || p[2] * p[4] * p[6] : p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue;
        remove.push(i);
      }
      if (remove.length) changed = true;
      for (const i of remove) pixels[i] = 0;
    }
    if (!changed) break;
  }
  return pixels;
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length); keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]], tol2 = tolerance * tolerance;
  while (stack.length) {
    const [first, last] = stack.pop(), a = points[first], b = points[last];
    const dx = b[0] - a[0], dy = b[1] - a[1], den = dx * dx + dy * dy;
    let best = tol2, at = -1;
    for (let i = first + 1; i < last; i++) {
      const p = points[i], t = den ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / den, 0, 1) : 0;
      const d = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
      if (d > best) { best = d; at = i; }
    }
    if (at !== -1) { keep[at] = 1; stack.push([first, at], [at, last]); }
  }
  return points.filter((_, i) => keep[i]);
}

function traceSkeleton(pixels, w, h, detail) {
  const graph = new Map(), offsets = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!pixels[i]) continue;
    const neighbors = [];
    for (const [dx, dy] of offsets) {
      const j = i + dx + dy * w;
      if (!pixels[j]) continue;
      // Avoid triangular graph branches around an ordinary right-angle corner.
      if (dx && dy && (pixels[i + dx] || pixels[i + dy * w])) continue;
      neighbors.push(j);
    }
    graph.set(i, neighbors);
  }
  const visited = new Set(), strokes = [], total = w * h;
  const key = (a, b) => Math.min(a, b) * total + Math.max(a, b);
  const trace = (start, next) => {
    const indices = [start]; let previous = start, current = next;
    visited.add(key(previous, current));
    for (let steps = 0; steps <= total; steps++) {
      indices.push(current);
      const neighbors = graph.get(current) || [];
      if (neighbors.length !== 2 || current === start) break;
      const onward = neighbors[0] === previous ? neighbors[1] : neighbors[0];
      if (visited.has(key(current, onward))) break;
      visited.add(key(current, onward)); previous = current; current = onward;
    }
    if (indices.length < (detail > 75 ? 2 : 3)) return;
    const points = indices.map(i => [i % w, -Math.floor(i / w)]);
    strokes.push(simplify(points, 1.35 - detail * .01));
  };
  for (const [i, neighbors] of graph) if (neighbors.length !== 2) {
    for (const n of neighbors) if (!visited.has(key(i, n))) trace(i, n);
  }
  for (const [i, neighbors] of graph) for (const n of neighbors) if (!visited.has(key(i, n))) trace(i, n);
  // Bound noisy photo inputs and keep the longest, most recognizable contours.
  const length = s => s.slice(1).reduce((sum, p, i) => sum + distance(s[i], p), 0);
  return strokes.map(s => ({ s, length: length(s) })).filter(v => v.length >= 1.5 + (100 - detail) * .025).sort((a, b) => b.length - a.length).slice(0, 700).map(v => v.s);
}

function orderStrokes(strokes) {
  if (strokes.length < 2) return strokes;
  const remaining = strokes.slice(), ordered = [remaining.shift()];
  while (remaining.length) {
    const end = ordered[ordered.length - 1].at(-1);
    let index = 0, reverse = false, best = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i], d0 = distance(end, s[0]), d1 = distance(end, s.at(-1));
      if (d0 < best) { best = d0; index = i; reverse = false; }
      if (d1 < best) { best = d1; index = i; reverse = true; }
    }
    const stroke = remaining.splice(index, 1)[0];
    ordered.push(reverse ? stroke.slice().reverse() : stroke);
  }
  return ordered;
}

/**
 * Synchronous, browser-local extraction. Images never leave the device.
 * mode: 'auto' (default), 'lines' (threshold + centerline), or 'edges' (Sobel).
 * ImageData-like objects also work without browser globals, for tests/importers.
 */
export function imageToStrokes(imageOrImageData, options = {}) {
  const threshold = clamp(Number(options.threshold) || 145, 1, 254);
  const detail = clamp(Number.isFinite(+options.detail) ? +options.detail : 50, 0, 100);
  const raster = rasterize(imageOrImageData, Math.round(120 + detail));
  const { width, height, data } = raster;
  const w = width + 2, h = height + 2, gray = new Float32Array(w * h).fill(255);
  let borderSum = 0, borderCount = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, alpha = data[i + 3] / 255;
    const value = (.2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]) * alpha + 255 * (1 - alpha);
    gray[(y + 1) * w + x + 1] = value;
    if (!x || !y || x === width - 1 || y === height - 1) { borderSum += value; borderCount++; }
  }
  const inverted = options.invert === undefined ? borderSum / borderCount < 115 : Boolean(options.invert);
  let foregroundPixels = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (inverted) gray[i] = 255 - gray[i];
    if (gray[i] < threshold) foregroundPixels++;
  }
  // Extend the image border for Sobel so the raster boundary is not traced.
  for (let x = 1; x < w - 1; x++) { gray[x] = gray[w + x]; gray[(h - 1) * w + x] = gray[(h - 2) * w + x]; }
  for (let y = 0; y < h; y++) { gray[y * w] = gray[y * w + 1]; gray[y * w + w - 1] = gray[y * w + w - 2]; }
  const mode = options.mode === 'edges' || options.mode === 'auto' && foregroundPixels > width * height * .28 || !options.mode && foregroundPixels > width * height * .28 ? 'edges' : 'lines';
  const binary = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (mode === 'lines') binary[i] = gray[i] < threshold ? 1 : 0;
    else {
      const gx = -gray[i - w - 1] + gray[i - w + 1] - 2 * gray[i - 1] + 2 * gray[i + 1] - gray[i + w - 1] + gray[i + w + 1];
      const gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] + gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      binary[i] = Math.hypot(gx, gy) > 420 - threshold * 1.3 ? 1 : 0;
    }
  }
  skeletonize(binary, w, h);
  const strokes = normalize(orderStrokes(traceSkeleton(binary, w, h, detail)));
  return {
    strokes,
    stats: { width, height, foregroundPixels, strokeCount: strokes.length, pointCount: strokes.reduce((n, s) => n + s.length, 0), threshold, detail, mode, inverted },
  };
}

/**
 * Constant-distance samples of one repeatable voltage cycle.
 * blank[i] === 1 means the beam is off while travelling to another stroke.
 * x/y are normalized voltage values; apply a voltage scale in the display.
 */
export function buildSignal(strokes, { samples = 2048 } = {}) {
  const count = clamp(Math.round(Number(samples) || 2048), 64, 65536);
  const paths = normalize(strokes), x = new Float32Array(count), y = new Float32Array(count), blank = new Uint8Array(count);
  const points = paths.reduce((sum, s) => sum + s.length, 0);
  if (!paths.length) { blank.fill(1); return { x, y, blank, points: 0, strokes: 0 }; }
  const segments = [];
  let total = 0;
  const add = (a, b, isBlank) => {
    const length = distance(a, b);
    if (length < 1e-9) return;
    total += length;
    segments.push({ a, b, blank: isBlank, start: total - length, end: total, length });
  };
  for (let s = 0; s < paths.length; s++) {
    const stroke = paths[s];
    for (let i = 1; i < stroke.length; i++) add(stroke[i - 1], stroke[i], 0);
    add(stroke.at(-1), paths[(s + 1) % paths.length][0], 1);
  }
  if (!total) {
    x.fill(paths[0][0][0]); y.fill(paths[0][0][1]);
    return { x, y, blank, points, strokes: paths.length };
  }
  let segmentIndex = 0;
  for (let i = 0; i < count; i++) {
    const position = i * total / count;
    while (segmentIndex < segments.length - 1 && position >= segments[segmentIndex].end) segmentIndex++;
    const segment = segments[segmentIndex], t = clamp((position - segment.start) / segment.length, 0, 1);
    x[i] = segment.a[0] + (segment.b[0] - segment.a[0]) * t;
    y[i] = segment.a[1] + (segment.b[1] - segment.a[1]) * t;
    blank[i] = segment.blank;
  }
  return { x, y, blank, points, strokes: paths.length };
}
