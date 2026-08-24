import type { Band } from "./scale.ts";

// A looper, not an echo: what you play repeats until the page is refreshed,
// and every new note layers on top of what's already going round. Your tap
// fires instantly and only its repeat is snapped to the grid, so playing
// stays latency-free while what comes back is in time.

export const BPM = 96;
export const STEPS_PER_LOOP = 16;
export const STEP_SECONDS = 60 / BPM / 2; // eighth notes -> 0.3125s
export const LOOP_SECONDS = STEP_SECONDS * STEPS_PER_LOOP; // 5s

/** Looped notes sit under live playing, so you can always hear yourself on top. */
export const LOOP_GAIN = 0.5;

const LOOKAHEAD_SECONDS = 0.12;
const TICK_MS = 25;

interface LoopNote {
  band: Band;
  column: number;
  step: number;
  bornCycle: number;
}

export type LoopSink = (band: Band, column: number, gain: number, when: number) => void;
export type ArmedSink = (band: Band, column: number, armed: boolean) => void;

/**
 * Which grid step a note belongs to, given how long until the upcoming step.
 * `cycleOffset` is -1 when the nearest step was the last one of the previous
 * cycle, so its repeat waits a full loop rather than firing a beat later.
 */
export function nearestStep(
  secondsUntilNextStep: number,
  upcomingStep: number,
  steps = STEPS_PER_LOOP,
): { step: number; cycleOffset: number } {
  if (secondsUntilNextStep <= STEP_SECONDS / 2) return { step: upcomingStep, cycleOffset: 0 };
  const previous = upcomingStep - 1;
  return previous < 0 ? { step: steps - 1, cycleOffset: -1 } : { step: previous, cycleOffset: 0 };
}

export class Looper {
  private notes = new Map<string, LoopNote>();
  private armedCounts = new Map<string, number>();
  private nextStepTime = 0;
  private step = 0;
  private cycle = 0;
  private timer: number | null = null;

  constructor(
    private ctx: AudioContext,
    private sink: LoopSink,
    private onArmed: ArmedSink,
  ) {}

  get running(): boolean {
    return this.timer !== null;
  }

  get size(): number {
    return this.notes.size;
  }

  start(): void {
    if (this.timer !== null) return;
    this.nextStepTime = this.ctx.currentTime + 0.06;
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  /** Add a note to the loop. Playing a slot it already holds is a no-op, so
   *  hammering a column doesn't stack duplicates on the same beat. */
  record(band: Band, column: number): void {
    if (this.timer === null) return;
    const { step, cycleOffset } = nearestStep(this.nextStepTime - this.ctx.currentTime, this.step);
    const key = `${band}:${column}:${step}`;
    if (this.notes.has(key)) return;
    this.notes.set(key, { band, column, step, bornCycle: this.cycle + cycleOffset });

    const columnKey = `${band}:${column}`;
    const count = (this.armedCounts.get(columnKey) ?? 0) + 1;
    this.armedCounts.set(columnKey, count);
    if (count === 1) this.onArmed(band, column, true);
  }

  clear(): void {
    this.notes.clear();
    for (const columnKey of this.armedCounts.keys()) {
      const [band, column] = columnKey.split(":");
      this.onArmed(band as Band, Number(column), false);
    }
    this.armedCounts.clear();
  }

  /** Position through the current loop, 0..1 -- drives the pulse hairline. */
  phase(): number {
    if (this.timer === null) return 0;
    const intoStep = 1 - clamp01((this.nextStepTime - this.ctx.currentTime) / STEP_SECONDS);
    return ((this.step - 1 + intoStep + STEPS_PER_LOOP) % STEPS_PER_LOOP) / STEPS_PER_LOOP;
  }

  // Schedules a little ahead of the audio clock rather than firing on the
  // timer itself -- setInterval jitter would be audible as sloppy timing.
  private tick(): void {
    const horizon = this.ctx.currentTime + LOOKAHEAD_SECONDS;
    while (this.nextStepTime < horizon) {
      for (const note of this.notes.values()) {
        // bornCycle guard: a note doesn't repeat in the cycle it was played in.
        if (note.step !== this.step || note.bornCycle >= this.cycle) continue;
        this.sink(note.band, note.column, LOOP_GAIN, this.nextStepTime);
      }
      this.nextStepTime += STEP_SECONDS;
      this.step += 1;
      if (this.step >= STEPS_PER_LOOP) {
        this.step = 0;
        this.cycle += 1;
      }
    }
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
