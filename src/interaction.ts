import { getBandRects } from "./dom.ts";
import type { Band } from "./scale.ts";

export interface Hit {
  band: Band;
  column: number;
}

export interface InteractionHandlers {
  /** A note starts. */
  onNote(hit: Hit): void;
  /** The finger, mouse or key holding that note let go of it. */
  onRelease(hit: Hit): void;
  /** Fired exactly once, synchronously, inside the very first gesture. */
  onFirstGesture(): void;
}

const COOLDOWN_MS = 80;
const BANDS: Band[] = ["bells", "marimba", "bass"];

// Three keyboard rows stacked exactly like the three bands on screen, so the
// layout you see is the layout under your hands.
const KEY_ROWS: ReadonlyArray<readonly [Band, string]> = [
  ["bells", "12345678"],
  ["marimba", "qwertyui"],
  ["bass", "asdfghjk"],
];

const KEY_MAP = new Map<string, Hit>();
for (const [band, row] of KEY_ROWS) {
  [...row].forEach((character, column) => KEY_MAP.set(character, { band, column }));
}

const same = (a: Hit, b: Hit): boolean => a.band === b.band && a.column === b.column;

export function setupInteraction(root: HTMLElement, handlers: InteractionHandlers): void {
  let bandRects = getBandRects();
  const refreshRects = () => {
    bandRects = getBandRects();
  };
  window.addEventListener("resize", refreshRects);
  window.addEventListener("orientationchange", refreshRects);

  const lastFired: Record<Band, { column: number; time: number } | null> = {
    bells: null,
    marimba: null,
    bass: null,
  };

  let firstGestureHandled = false;
  const ensureFirstGesture = () => {
    if (firstGestureHandled) return;
    firstGestureHandled = true;
    handlers.onFirstGesture();
  };

  // Guards a fast wobble across a key boundary from machine-gunning. Holding
  // still can't reach here at all: a note only fires on entering a new key.
  const maybeFire = (hit: Hit): boolean => {
    const now = performance.now();
    const last = lastFired[hit.band];
    if (last && last.column === hit.column && now - last.time < COOLDOWN_MS) return false;
    lastFired[hit.band] = { column: hit.column, time: now };
    handlers.onNote(hit);
    return true;
  };

  /** What each pointer is currently holding down. */
  const held = new Map<number, Hit>();

  const moveTo = (pointerId: number, hit: Hit | null) => {
    const previous = held.get(pointerId);
    // Still on the same key: nothing happens. This is what makes a long press
    // one long note rather than a stutter of retriggers.
    if (previous && hit && same(previous, hit)) return;

    if (previous) handlers.onRelease(previous);
    if (!hit) {
      held.delete(pointerId);
      return;
    }
    held.set(pointerId, hit);
    if (!maybeFire(hit)) held.delete(pointerId);
  };

  root.addEventListener("pointerdown", (event) => {
    // The iOS motion permission and the AudioContext resume have to happen
    // synchronously here, before anything awaits -- and this same gesture
    // still has to sound the note it landed on, below.
    ensureFirstGesture();

    const hit = hitTest(event.clientX, event.clientY, bandRects);
    if (!hit) return;
    root.setPointerCapture(event.pointerId);
    moveTo(event.pointerId, hit);
  });

  root.addEventListener("pointermove", (event) => {
    if (!held.has(event.pointerId)) return;
    moveTo(event.pointerId, hitTest(event.clientX, event.clientY, bandRects));
  });

  const lift = (event: PointerEvent) => {
    const hit = held.get(event.pointerId);
    if (!hit) return;
    held.delete(event.pointerId);
    handlers.onRelease(hit);
  };
  root.addEventListener("pointerup", lift);
  root.addEventListener("pointercancel", lift);

  /** Which keyboard keys are down, so a held key sustains and repeats once. */
  const heldKeys = new Map<string, Hit>();

  const pressKey = (key: string, hit: Hit) => {
    if (heldKeys.has(key)) return;
    heldKeys.set(key, hit);
    if (!maybeFire(hit)) heldKeys.delete(key);
  };

  const releaseKey = (key: string) => {
    const hit = heldKeys.get(key);
    if (!hit) return;
    heldKeys.delete(key);
    handlers.onRelease(hit);
  };

  // Enter/Space plays whichever key has focus, so tabbing through works.
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(".column");
    if (!element) return;
    event.preventDefault();
    ensureFirstGesture();
    const band = element.dataset.band as Band | undefined;
    const column = Number(element.dataset.column);
    if (band && BANDS.includes(band) && Number.isInteger(column)) {
      pressKey(event.key, { band, column });
    }
  });
  root.addEventListener("keyup", (event) => {
    if (event.key === "Enter" || event.key === " ") releaseKey(event.key);
  });

  // The tracker rows play from anywhere, without hunting for focus first.
  window.addEventListener("keydown", (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const hit = KEY_MAP.get(key);
    if (!hit) return;
    event.preventDefault();
    ensureFirstGesture();
    pressKey(key, hit);
  });
  window.addEventListener("keyup", (event) => releaseKey(event.key.toLowerCase()));

  // A pointer or key can be lost when the page goes away; don't leave a drone on.
  window.addEventListener("blur", () => {
    for (const [pointerId, hit] of held) {
      held.delete(pointerId);
      handlers.onRelease(hit);
    }
    for (const key of [...heldKeys.keys()]) releaseKey(key);
  });
}

function hitTest(clientX: number, clientY: number, bandRects: Record<Band, DOMRect>): Hit | null {
  for (const band of BANDS) {
    const r = bandRects[band];
    if (clientY >= r.top && clientY < r.bottom && clientX >= r.left && clientX < r.right) {
      const fraction = (clientX - r.left) / r.width;
      const column = Math.min(7, Math.max(0, Math.floor(fraction * 8)));
      return { band, column };
    }
  }
  return null;
}
