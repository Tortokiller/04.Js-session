/**
 * A draggable rotary knob built from raw Pointer Events — no library.
 * Vertical drag distance maps to a value within [min, max]; the
 * --angle custom property (read by CSS) is updated on every move.
 */
export function createKnob({ label, min, max, value, step = 1, unit = "", onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "knob";

  const dial = document.createElement("div");
  dial.className = "knob__dial";
  dial.tabIndex = 0;
  dial.setAttribute("role", "slider");
  dial.setAttribute("aria-label", label);
  dial.setAttribute("aria-valuemin", min);
  dial.setAttribute("aria-valuemax", max);

  const indicator = document.createElement("div");
  indicator.className = "knob__indicator";
  dial.appendChild(indicator);

  const labelEl = document.createElement("span");
  labelEl.className = "knob__label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "knob__value";

  wrap.append(dial, labelEl, valueEl);

  let current = value;

  const angleFor = (v) => -135 + ((v - min) / (max - min)) * 270; // -135deg..135deg sweep

  function render() {
    dial.style.setProperty("--angle", `${angleFor(current)}deg`);
    valueEl.textContent = `${Math.round(current * 100) / 100}${unit}`;
    dial.setAttribute("aria-valuenow", current);
  }

  function setValue(v, notify = true) {
    current = Math.min(max, Math.max(min, v));
    render();
    if (notify && onChange) onChange(current);
  }

  let dragging = false;
  let startY = 0;
  let startValue = 0;

  dial.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    startValue = current;
    dial.setPointerCapture(e.pointerId);
  });

  dial.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const deltaY = startY - e.clientY;
    const newValue = startValue + (deltaY / 150) * (max - min);
    setValue(Math.round(newValue / step) * step);
  });

  dial.addEventListener("pointerup", () => (dragging = false));
  dial.addEventListener("pointercancel", () => (dragging = false));

  dial.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") setValue(current + step);
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") setValue(current - step);
  });

  dial.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      setValue(current + (e.deltaY < 0 ? step : -step));
    },
    { passive: false }
  );

  setValue(value, false);

  return { el: wrap, setValue, getValue: () => current };
}
