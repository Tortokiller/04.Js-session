# JS Session

A 16-step drum machine and synth that proves the opposite point of its sibling project, [CSS Recital](#): **almost everything here — the interface, the audio, the visuals — is built and driven by plain JavaScript.** HTML is a five-element skeleton; CSS only paints what JS tells it to.

![No build step](https://img.shields.io/badge/build_step-none-f4a93c) ![Dependencies](https://img.shields.io/badge/dependencies-zero-f4a93c) ![JS](https://img.shields.io/badge/JavaScript-~95%25-f4a93c)

---

## What this is

A working 16-step sequencer with four voices (kick, snare, hi-hat, synth), played live through the Web Audio API, with a frequency visualizer and fully draggable knobs — all generated at runtime.

## Why it's ~95% JavaScript

`index.html` contains a header, a footer, and one empty `<div id="app">`. **Every other DOM node — the transport buttons, the four rotary knobs, the 4×16 step grid, the canvas — is created with `document.createElement` at runtime.** CSS only styles classes; it has no idea the sequencer exists until JS builds it.

## Architecture

```
js-session/
├── index.html
├── css/
│   └── style.css           # layout + theme only — no animation logic
└── js/
    ├── store.js              # ~20-line pub/sub state container
    ├── audio-engine.js       # Web Audio synthesis + lookahead scheduler
    ├── sequencer-ui.js       # builds the step grid, syncs the playhead
    ├── knob.js               # draggable rotary knob component
    ├── visualizer.js         # canvas frequency-spectrum renderer
    ├── patterns.js           # defaults, randomizer, save/load via File API
    └── main.js               # entry point — wires it all together
```

## Techniques on display

- **Precise audio scheduling** — the classic "tale of two clocks" pattern: a `setTimeout` loop wakes up every 25ms and schedules notes up to 100ms ahead using `AudioContext.currentTime`, so playback stays sample-accurate even if the tab is throttled.
- **Synthesis from scratch** — kick, snare, and hi-hat are built from oscillators and generated white-noise buffers, not samples.
- **Canvas visualizer** — an `AnalyserNode` feeds a `requestAnimationFrame` loop that paints the live spectrum, with `devicePixelRatio` handling for sharp retina rendering.
- **Custom draggable knobs** — built from raw Pointer Events (`pointerdown`/`pointermove`/`pointerup`), with keyboard and scroll-wheel support, no slider library.
- **Hand-rolled state store** — a ~20-line `createStore()` (get/set/subscribe) is the entire "framework." The sequencer grid and the audio engine both read from the same source of truth.
- **File API** — patterns export as downloadable JSON (`Blob` + `URL.createObjectURL`) and re-import via `FileReader`.
- **A small generative algorithm** — the "Randomize" button uses weighted probabilities anchored to the beat, not pure noise.
- **Accessibility** — every step and knob is keyboard-operable (`tabindex`, `role="slider"`, arrow keys), with `aria-label`s throughout.

## Running it locally

ES modules need an actual server (the `file://` protocol blocks `import`/`export` due to CORS):

```bash
git clone https://github.com/Tortokiller/js-session.git
cd js-session
npx serve .
```

Click **Play**, then click cells to build a pattern. Drag (or scroll, or arrow-key) the knobs. `Space` toggles playback, `R` randomizes.

## Browser support

Requires the Web Audio API, Pointer Events, and ES modules — supported in all evergreen browsers. No polyfills, on purpose.

## License

MIT.

---

Built by [Tortokiller](https://github.com/Tortokiller) · [GetWeb.tech](https://getweb.tech) · companion piece to **CSS Recital**
