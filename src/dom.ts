import type { Band } from "./scale.ts";

const LIVE_PULSE_MS = 180;
const ECHO_PULSE_MS = 260;

const bandContainers: Record<Band, HTMLElement> = {
  bells: mustQuery('[data-band-container="bells"]'),
  marimba: mustQuery('[data-band-container="marimba"]'),
  bass: mustQuery('[data-band-container="bass"]'),
};

const horizon = document.querySelector<SVGGElement>('[data-testid="horizon-line"]');
const tiltHint = document.querySelector<HTMLElement>('[data-testid="tilt-hint"]');
const pulseBar = document.querySelector<HTMLElement>('[data-testid="loop-pulse"]');
const pulseFill = pulseBar?.querySelector<HTMLElement>(".pulse-fill") ?? null;
const intro = document.querySelector<HTMLElement>('[data-testid="intro-overlay"]');
const helpButton = document.querySelector<HTMLButtonElement>('[data-testid="help"]');
const announcer = document.querySelector<HTMLElement>('[data-testid="announcer"]');

function mustQuery(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`missing required element: ${selector}`);
  return el;
}

function columnEl(band: Band, column: number): HTMLElement | null {
  return bandContainers[band].querySelector<HTMLElement>(`[data-column="${column}"]`);
}

export function getBandRects(): Record<Band, DOMRect> {
  return {
    bells: bandContainers.bells.getBoundingClientRect(),
    marimba: bandContainers.marimba.getBoundingClientRect(),
    bass: bandContainers.bass.getBoundingClientRect(),
  };
}

/** A tap lights its column fully; the loop lights it faintly, so you watch your own pattern come back. */
export function pulseColumn(band: Band, column: number, kind: "live" | "echo" = "live"): void {
  const el = columnEl(band, column);
  if (!el) return;
  const className = kind === "live" ? "is-active" : "is-echo";
  el.classList.remove(className);
  void el.offsetWidth; // restart the transition if the same column re-fires
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), kind === "live" ? LIVE_PULSE_MS : ECHO_PULSE_MS);
}

/** A standing mark on every column that has something in the loop -- your layers, made visible. */
export function setColumnArmed(band: Band, column: number, armed: boolean): void {
  columnEl(band, column)?.classList.toggle("is-armed", armed);
}

/** Rolls with the phone and rises with its pitch, like an aircraft's attitude indicator. */
export function setAttitude(pitchDeg: number, rollDeg: number): void {
  const rise = (pitchDeg / 25) * 9;
  horizon?.setAttribute("transform", `rotate(${rollDeg.toFixed(2)} 50 20) translate(0 ${rise.toFixed(2)})`);
}

export function showTiltHint(): void {
  tiltHint?.removeAttribute("hidden");
}

export function revealLoopPulse(): void {
  pulseBar?.classList.add("is-running");
}

export function setLoopPhase(phase: number): void {
  if (pulseFill) pulseFill.style.transform = `scaleX(${phase.toFixed(4)})`;
}

export function flashCleared(): void {
  document.body.classList.add("is-cleared");
  window.setTimeout(() => document.body.classList.remove("is-cleared"), 420);
}

export function dismissIntro(): void {
  intro?.classList.add("is-dismissed");
}

export function onHelp(show: () => void): void {
  helpButton?.addEventListener("click", () => {
    intro?.classList.remove("is-dismissed");
    show();
  });
}

// Announcing every note would flood a screen reader mid-performance, so this
// settles first and then reports where the loop ended up.
let announceTimer: number | undefined;
export function announce(message: string, delayMs = 700): void {
  window.clearTimeout(announceTimer);
  announceTimer = window.setTimeout(() => {
    if (announcer) announcer.textContent = message;
  }, delayMs);
}
