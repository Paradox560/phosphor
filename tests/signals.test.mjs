import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Import the browser module without requiring a package-wide Node module mode.
const source = await readFile(new URL('../dist/signals.js', import.meta.url), 'utf8');
const { textToStrokes, presetStrokes, imageToStrokes, buildSignal } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

function lineImage(darkBackground = false) {
  const width = 80, height = 60;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const onRectangle = x >= 10 && x < 70 && y >= 10 && y < 50 &&
        (y < 13 || y >= 47 || x < 13 || x >= 67);
      const value = onRectangle === darkBackground ? 255 : 0;
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

test('alphabet, digits, and supported punctuation produce bounded finite strokes', () => {
  for (const glyph of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!?+-/;') {
    const strokes = textToStrokes(glyph);
    assert.ok(strokes.length > 0, glyph);
    for (const point of strokes.flat()) {
      assert.ok(point.every(value => Number.isFinite(value) && Math.abs(value) <= .900001));
    }
  }
  assert.notDeepEqual(textToStrokes(';'), textToStrokes('?'), 'semicolon has its own glyph');
});

test('normalization centers the path and preserves its aspect ratio', () => {
  const signal = buildSignal([[[10, 10], [14, 10], [14, 12], [10, 12], [10, 10]]]);
  const minX = Math.min(...signal.x), maxX = Math.max(...signal.x);
  const minY = Math.min(...signal.y), maxY = Math.max(...signal.y);
  assert.ok(Math.abs((maxX - minX) / (maxY - minY) - 2) < .001);
  assert.ok(Math.abs(maxX + minX) < .001);
  assert.ok(Math.abs(maxY + minY) < .001);
});

test('every preset produces a nonempty voltage cycle', () => {
  for (const name of ['heart', 'saturn', 'butterfly', 'wave', 'circle', 'square', 'infinity', 'atom', 'star', 'flower', 'triangle', 'spiral']) {
    const signal = buildSignal(presetStrokes(name));
    assert.equal(signal.x.length, 2048, name);
    assert.equal(signal.y.length, signal.x.length, name);
    assert.equal(signal.blank.length, signal.x.length, name);
    assert.ok(signal.points > 2, name);
    assert.ok(signal.blank.includes(0), name);
  }
});

test('travel between disconnected strokes is interpolated and blanked', () => {
  const signal = buildSignal([[[-1, -1], [-1, 1]], [[1, 1], [1, -1]]], { samples: 256 });
  // Two vertical drawing segments and two equally long horizontal return segments.
  assert.equal(signal.blank.reduce((sum, value) => sum + value, 0), 128);
  assert.ok(signal.x.some((value, i) => signal.blank[i] && value > -.8 && value < .8));
  for (let i = 0; i < signal.x.length; i++) {
    if (!signal.blank[i]) assert.ok(Math.abs(Math.abs(signal.x[i]) - .9) < .00001);
  }
});

test('empty text generates a completely blank cycle', () => {
  const signal = buildSignal(textToStrokes('  '));
  assert.equal(signal.points, 0);
  assert.equal(signal.strokes, 0);
  assert.ok(signal.blank.every(Boolean));
});

test('line-art rectangle produces a connected normalized contour', () => {
  const result = imageToStrokes(lineImage());
  assert.ok(result.strokes.length >= 1 && result.strokes.length <= 4);
  assert.ok(result.stats.pointCount >= 4);
  assert.equal(result.stats.mode, 'lines');
  for (const point of result.strokes.flat()) assert.ok(point.every(value => Math.abs(value) <= .900001));
});

test('light lines on a dark background are inverted automatically', () => {
  const light = imageToStrokes(lineImage());
  const dark = imageToStrokes(lineImage(true));
  assert.equal(dark.stats.inverted, true);
  assert.equal(light.stats.inverted, false);
  assert.deepEqual(dark.strokes, light.strokes);
});

test('transparent blank pixels do not generate strokes', () => {
  const result = imageToStrokes({ width: 40, height: 40, data: new Uint8ClampedArray(40 * 40 * 4) });
  assert.equal(result.strokes.length, 0);
});

test('high-detail extraction limits the raster to 220 pixels', () => {
  const width = 500, height = 300;
  const result = imageToStrokes({ width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) }, { detail: 100 });
  assert.equal(result.stats.width, 220);
  assert.equal(result.stats.height, 132);
  assert.equal(result.strokes.length, 0);
});

test('uniform images do not generate false border contours in edge mode', () => {
  for (const shade of [0, 80, 120, 200, 255]) {
    const width = 80, height = 60, data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = shade;
      data[i + 3] = 255;
    }
    const result = imageToStrokes({ width, height, data }, { mode: 'edges' });
    assert.equal(result.strokes.length, 0, `uniform shade ${shade}`);
  }
});
