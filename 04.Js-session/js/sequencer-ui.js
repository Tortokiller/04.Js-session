const STEPS = 16;
const TRACK_DEFS = [
  { id: "kick", name: "Kick" },
  { id: "snare", name: "Snare" },
  { id: "hat", name: "Hi-Hat" },
  { id: "synth", name: "Synth" },
];
const TRACK_COLORS = { kick: "#f4a93c", snare: "#e8546b", hat: "#7fd1c8", synth: "#a78bfa" };

export function buildSequencer({ root, store, engine }) {
  root.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "grid";

  const stepCells = {};

  TRACK_DEFS.forEach((track) => {
    const row = document.createElement("div");
    row.className = "grid__row";
    row.style.setProperty("--track-color", TRACK_COLORS[track.id]);

    const label = document.createElement("span");
    label.className = "grid__label";
    label.textContent = track.name;
    row.appendChild(label);

    const cellsWrap = document.createElement("div");
    cellsWrap.className = "grid__cells";

    const cells = [];
    for (let i = 0; i < STEPS; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.step = String(i);
      cell.setAttribute("aria-label", `${track.name}, step ${i + 1}`);
      if (i % 4 === 0) cell.classList.add("cell--beat");
      cell.addEventListener("click", () => toggleStep(track.id, i));
      cellsWrap.appendChild(cell);
      cells.push(cell);
    }
    stepCells[track.id] = cells;

    row.appendChild(cellsWrap);
    grid.appendChild(row);
  });

  root.appendChild(grid);

  function toggleStep(trackId, index) {
    store.setState((state) => {
      const tracks = { ...state.tracks };
      if (trackId === "synth") {
        const arr = [...tracks.synth];
        arr[index] = { ...arr[index], on: !arr[index].on };
        tracks.synth = arr;
      } else {
        const arr = [...tracks[trackId]];
        arr[index] = !arr[index];
        tracks[trackId] = arr;
      }
      return { ...state, tracks };
    });
  }

  function renderCells(state) {
    TRACK_DEFS.forEach((track) => {
      stepCells[track.id].forEach((cell, i) => {
        const active = track.id === "synth" ? state.tracks.synth[i].on : state.tracks[track.id][i];
        cell.classList.toggle("cell--active", !!active);
      });
    });
  }

  store.subscribe(renderCells);
  renderCells(store.getState());

  // The audio engine calls this from inside its scheduler, *ahead* of
  // when each step actually sounds. We re-sync to the audio clock with
  // a short setTimeout so the visual playhead lands when the ear hears it.
  engine.stepCallback = (step, audioTime) => {
    const delayMs = Math.max(0, (audioTime - engine.ctx.currentTime) * 1000);
    setTimeout(() => {
      Object.values(stepCells).forEach((cells) => {
        cells.forEach((c, i) => c.classList.toggle("cell--playhead", i === step));
      });
    }, delayMs);
  };

  return { stepCells };
}
