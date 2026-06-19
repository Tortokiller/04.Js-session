const STEPS = 16;
const NOTE_TABLE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

function noteToFreq(note) {
  const name = note.slice(0, -1);
  const octave = parseInt(note.slice(-1), 10);
  const midi = (octave + 1) * 12 + NOTE_TABLE[name];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * AudioEngine owns the AudioContext and the scheduler.
 *
 * Why setTimeout *and* AudioContext.currentTime? Because the DOM timer
 * alone drifts (the tab can be throttled, GC can pause it), but the
 * audio clock never does. So every ~25ms we wake up, look ahead 100ms
 * into the *audio* clock, and schedule any notes that fall inside that
 * window with sample-accurate start times. This is the classic "tale
 * of two clocks" pattern for Web Audio sequencing.
 */
export class AudioEngine {
  constructor(store) {
    this.store = store;
    this.ctx = null;
    this.master = null;
    this.analyser = null;

    this.isPlaying = false;
    this.currentStep = 0;
    this.nextNoteTime = 0;

    this.lookaheadMs = 25;
    this.scheduleAheadTime = 0.1; // seconds
    this.timerId = null;

    this.stepCallback = null; // (step, audioTime) => void, set by the UI
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.master.gain.value = this.store.getState().volume;
  }

  secondsPerStep() {
    return 60 / this.store.getState().tempo / 4; // sixteenth notes
  }

  start() {
    this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.timerId);
  }

  scheduler() {
    if (!this.isPlaying) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);

      const stepDuration = this.secondsPerStep();
      const swing = this.store.getState().swing / 100;
      const swingOffset = this.currentStep % 2 === 1 ? stepDuration * swing * 0.5 : 0;

      this.nextNoteTime += stepDuration + swingOffset;
      this.currentStep = (this.currentStep + 1) % STEPS;
    }

    this.timerId = setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  scheduleStep(step, time) {
    const { tracks, filterCutoff } = this.store.getState();
    if (tracks.kick[step]) this.triggerKick(time);
    if (tracks.snare[step]) this.triggerSnare(time);
    if (tracks.hat[step]) this.triggerHat(time);

    const synthStep = tracks.synth[step];
    if (synthStep && synthStep.on) this.triggerSynth(time, synthStep.note, filterCutoff);

    if (this.stepCallback) this.stepCallback(step, time);
  }

  // ---- synthesis: every voice is built from oscillators/noise, fresh per hit ----

  triggerKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(gain).connect(this.master);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  triggerSnare(time) {
    const noise = this._noiseSource(0.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(time);
    noise.stop(time + 0.2);
  }

  triggerHat(time) {
    const noise = this._noiseSource(0.05);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  triggerSynth(time, note, cutoff) {
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = noteToFreq(note);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.25, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(time);
    osc.stop(time + 0.32);
  }

  _noiseSource(durationSeconds) {
    const bufferSize = Math.floor(this.ctx.sampleRate * durationSeconds);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  setVolume(v) {
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
  }
}
