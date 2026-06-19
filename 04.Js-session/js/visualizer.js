/**
 * Paints the live frequency spectrum coming out of the engine's
 * AnalyserNode. Handles devicePixelRatio scaling so it stays sharp
 * on retina displays — a detail that's easy to skip and looks bad
 * when you do.
 */
export function createVisualizer(canvas, engine) {
  const ctx2d = canvas.getContext("2d");
  let raf = null;
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  function draw() {
    if (!engine.analyser) {
      raf = requestAnimationFrame(draw);
      return;
    }

    const bufferLength = engine.analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    engine.analyser.getByteFrequencyData(data);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx2d.clearRect(0, 0, w, h);

    const barWidth = w / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const value = data[i] / 255;
      const barHeight = value * h;
      const hue = 28 + (i / bufferLength) * 60;
      ctx2d.fillStyle = `hsl(${hue} 85% ${50 + value * 20}%)`;
      ctx2d.fillRect(i * barWidth, h - barHeight, Math.max(1, barWidth - 1), barHeight);
    }

    raf = requestAnimationFrame(draw);
  }

  return {
    start() {
      if (!raf) draw();
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = null;
    },
  };
}
