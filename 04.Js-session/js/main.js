import { createStore } from "./store.js";
import { AudioEngine } from "./audio-engine.js";
import { buildSequencer } from "./sequencer-ui.js";
import { createKnob } from "./knob.js";
import { defaultPattern, randomizePattern, exportPattern, importPattern } from "./patterns.js";
import { createVisualizer } from "./visualizer.js";

const store = createStore(defaultPattern());
const engine = new AudioEngine(store);

const app = document.getElementById("app");
app.innerHTML = "";

/* ---------- transport ---------- */

const transport = document.createElement("div");
transport.className = "transport";

const playBtn = document.createElement("button");
playBtn.className = "btn btn--play";
playBtn.type = "button";
playBtn.textContent = "▶ Play";

const randomBtn = document.createElement("button");
randomBtn.className = "btn";
randomBtn.type = "button";
randomBtn.textContent = "🎲 Randomize";

const exportBtn = document.createElement("button");
exportBtn.className = "btn";
exportBtn.type = "button";
exportBtn.textContent = "⭳ Export";

const importBtn = document.createElement("button");
importBtn.className = "btn";
importBtn.type = "button";
importBtn.textContent = "⭱ Import";

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "application/json";
fileInput.hidden = true;

transport.append(playBtn, randomBtn, exportBtn, importBtn, fileInput);

/* ---------- knobs ---------- */

const knobsWrap = document.createElement("div");
knobsWrap.className = "knobs";

const tempoKnob = createKnob({
  label: "Tempo",
  min: 60,
  max: 200,
  value: store.getState().tempo,
  step: 1,
  unit: " bpm",
  onChange: (v) => store.setState({ tempo: v }),
});

const swingKnob = createKnob({
  label: "Swing",
  min: 0,
  max: 80,
  value: store.getState().swing,
  step: 1,
  unit: "%",
  onChange: (v) => store.setState({ swing: v }),
});

const volumeKnob = createKnob({
  label: "Volume",
  min: 0,
  max: 1,
  value: store.getState().volume,
  step: 0.01,
  unit: "",
  onChange: (v) => {
    store.setState({ volume: v });
    engine.setVolume(v);
  },
});

const cutoffKnob = createKnob({
  label: "Cutoff",
  min: 200,
  max: 12000,
  value: store.getState().filterCutoff,
  step: 50,
  unit: " Hz",
  onChange: (v) => store.setState({ filterCutoff: v }),
});

knobsWrap.append(tempoKnob.el, swingKnob.el, volumeKnob.el, cutoffKnob.el);

/* ---------- sequencer + visualizer mount points ---------- */

const sequencerRoot = document.createElement("div");
sequencerRoot.className = "sequencer";

const canvas = document.createElement("canvas");
canvas.className = "visualizer";

app.append(transport, knobsWrap, sequencerRoot, canvas);

buildSequencer({ root: sequencerRoot, store, engine });

let visualizer = null;

/* ---------- wiring ---------- */

playBtn.addEventListener("click", () => {
  if (engine.isPlaying) {
    engine.stop();
    if (visualizer) visualizer.stop();
    playBtn.textContent = "▶ Play";
  } else {
    engine.start();
    if (!visualizer) visualizer = createVisualizer(canvas, engine);
    visualizer.start();
    playBtn.textContent = "⏸ Pause";
  }
});

randomBtn.addEventListener("click", () => {
  store.setState((state) => ({ ...state, tracks: randomizePattern(state).tracks }));
});

exportBtn.addEventListener("click", () => exportPattern(store.getState()));

importBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    const data = await importPattern(file);
    store.setState(data);
    tempoKnob.setValue(data.tempo, false);
    swingKnob.setValue(data.swing, false);
    volumeKnob.setValue(data.volume, false);
    cutoffKnob.setValue(data.filterCutoff, false);
  } catch (err) {
    alert("That file doesn't look like a valid pattern.");
  }
  fileInput.value = "";
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    playBtn.click();
  }
  if (e.key.toLowerCase() === "r" && e.target === document.body) {
    randomBtn.click();
  }
});
