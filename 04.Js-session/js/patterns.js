const STEPS = 16;
const SCALE = ["A3", "C4", "D4", "E4", "G4", "A4"]; // A-minor pentatonic-ish, forgiving when randomized

export function emptyPattern() {
  return {
    tempo: 112,
    swing: 20,
    volume: 0.8,
    filterCutoff: 6000,
    tracks: {
      kick: new Array(STEPS).fill(false),
      snare: new Array(STEPS).fill(false),
      hat: new Array(STEPS).fill(false),
      synth: new Array(STEPS).fill(null).map(() => ({ on: false, note: "A3" })),
    },
  };
}

export function defaultPattern() {
  const p = emptyPattern();
  [0, 4, 8, 12].forEach((i) => (p.tracks.kick[i] = true));
  [4, 12].forEach((i) => (p.tracks.snare[i] = true));
  for (let i = 0; i < STEPS; i += 2) p.tracks.hat[i] = true;
  [2, 6, 10, 14].forEach((i, idx) => {
    p.tracks.synth[i] = { on: true, note: ["A3", "C4", "E4", "G3"][idx % 4] };
  });
  return p;
}

/** A tiny generative algorithm: weighted probabilities per track,
 *  anchored to the beat so the result still sounds like a pattern
 *  rather than noise. */
export function randomizePattern(prev) {
  const p = emptyPattern();
  p.tempo = prev.tempo;
  p.swing = prev.swing;
  p.volume = prev.volume;
  p.filterCutoff = prev.filterCutoff;

  for (let i = 0; i < STEPS; i++) {
    p.tracks.kick[i] = i % 4 === 0 || Math.random() < 0.12;
    p.tracks.snare[i] = i % 8 === 4 || Math.random() < 0.06;
    p.tracks.hat[i] = Math.random() < 0.7;
    const synthOn = Math.random() < 0.3;
    p.tracks.synth[i] = { on: synthOn, note: SCALE[Math.floor(Math.random() * SCALE.length)] };
  }
  return p;
}

export function exportPattern(state) {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `js-session-pattern-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importPattern(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
