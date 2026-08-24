import { getBandRects } from "./dom.ts";
import type { Band } from "./scale.ts";

export interface Hit {
  band: Band;
  column: number;
}

export interface InteractionHandlers {
  onNote(hit: Hit): void;
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

  const maybeFire = (hit: Hit) => {
    const now = performance.now();
    const last = lastFired[hit.band];
    if (last && last.column === hit.column && now - last.time < COOLDOWN_MS) return;
    lastFired[hit.band] = { column: hit.column, time: now };
    handlers.onNote(hit);
  };

  const activePointers = new Map<number, Band>();

  root.addEventListener("pointerdown", (event) => {
    // (1) iOS permission + AudioContext.resume() must happen synchronously,
    // before any of this handler's own async work -- and this same gesture
    // still has to play the note it landed on, below.
    ensureFirstGesture();

    const hit = hitTest(event.clientX, event.clientY, bandRects);
    if (!hit) return;
    root.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, hit.band);
    maybeFire(hit);
  });

  root.addEventListener("pointermove", (event) => {
    if (!activePointers.has(event.pointerId)) return;
    const hit = hitTest(event.clientX, event.clientY, bandRects);
    if (hit) maybeFire(hit);
  });

  const releasePointer = (event: PointerEvent) => activePointers.delete(event.pointerId);
  root.addEventListener("pointerup", releasePointer);
  root.addEventListener("pointercancel", releasePointer);

  // Enter/Space plays whichever key has focus, so tabbing through works.
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const column = (event.target as HTMLElement | null)?.closest<HTMLElement>(".column");
    if (!column) return;
    event.preventDefault();
    ensureFirstGesture();
    const band = column.dataset.band as Band | undefined;
    const columnIndex = Number(column.dataset.column);
    if (band && BANDS.includes(band) && Number.isInteger(columnIndex)) {
      maybeFire({ band, column: columnIndex });
    }
  });

  // The tracker rows play from anywhere, without hunting for focus first.
  window.addEventListener("keydown", (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const hit = KEY_MAP.get(event.key.toLowerCase());
    if (!hit) return;
    event.preventDefault();
    ensureFirstGesture();
    maybeFire(hit);
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
