# Phosphor — X–Y Signal Lab

A browser-local oscilloscope simulator. Type a word, choose a preset, or upload a line drawing. The app generates synchronized horizontal and vertical voltage samples and animates the same samples on an X–Y display.

## Run locally

```sh
python3 -m http.server 4838 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4838. No installation, build process, or backend is required.

## Features

- Single-stroke alphabet, numbers, and punctuation, with live signal interpolation when inputs change.
- PNG, JPEG, WebP, and SVG image import; bounded local rasterization, automatic contrast inversion, line thinning or edge extraction, threshold and detail controls.
- Heart, Saturn, butterfly, and wave presets.
- Synchronized X/Y time plots, a moving beam, pause, restart, and cycle scrubbing.
- Independent voltage gains, cycle frequency, phosphor persistence, beam blanking, and travel/grid toggles.
- A vintage bench-oscilloscope faceplate with a recessed phosphor display, tactile pushbuttons, and rotary signal controls. Drag a knob up/right to increase its value, down/left to decrease; focused knobs also support arrow keys, Home/End, and the mouse wheel.
- CSV export of one cycle: time_s, x_volts, y_volts, beam_on.
- Responsive layout, keyboard controls, and reduced-motion support.

## Model and limitations

The input becomes vector strokes, resampled into 2,048 coordinate pairs per cycle. The same arrays drive all three canvases and CSV export. The drawing is fitted to the display with equal physical scaling, then the X/Y gain controls are applied. Resizing refits the image and changes the calibrated voltages accordingly. The displayed axes use a ±5 V scale; these are simulated voltages, not hardware output.

Travel between disconnected strokes and back to the start is explicitly sampled. Beam blanking hides that travel. Turning blanking off makes connecting lines visible. Persistence controls how long each recently visited point glows; playback is intentionally slow enough to follow.

Image tracing works best with sparse high-contrast outlines. It is a bounded classical image-processing algorithm, not semantic image recognition; photographs and complex textured images may yield fragmented contours. Files remain in browser memory and are not uploaded. Accepted files are limited to 10 MB and 40 megapixels before downsampling.

The model follows the usual oscilloscope X–Y convention: channel 1 drives the horizontal axis and channel 2 drives the vertical axis. Reference: [Tektronix X–Y display format](https://www.tek.com/en/support/faqs/does-tds1000-2000-series-have-xy-display-format-addition-yt).

## Verification

```sh
node --test tests/signals.test.mjs
node --check dist/app.js
node --check dist/signals.js
node --check dist/knobs.js
```

The fixture in `tests/fixtures/bolt.svg` exercises the browser upload and trace path.
