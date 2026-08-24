import { describe, expect, it } from "vitest";
import { LOOP_GAIN, LOOP_SECONDS, STEP_SECONDS, STEPS_PER_LOOP, nearestStep } from "../src/loop.ts";

// The grid maths behind "play now, repeat in time". Off-by-one here is the
// difference between a repeat a full loop later and one a beat later, which
// sounds like a mistake rather than a pattern.
describe("nearestStep", () => {
  it("snaps forward when the upcoming step is closer", () => {
    expect(nearestStep(STEP_SECONDS * 0.2, 5)).toEqual({ step: 5, cycleOffset: 0 });
  });

  it("snaps back when the step just played is closer", () => {
    expect(nearestStep(STEP_SECONDS * 0.8, 5)).toEqual({ step: 4, cycleOffset: 0 });
  });

  it("wraps to the end of the previous cycle at the loop boundary", () => {
    expect(nearestStep(STEP_SECONDS * 0.8, 0)).toEqual({
      step: STEPS_PER_LOOP - 1,
      cycleOffset: -1,
    });
  });

  it("keeps every snapped step inside the loop", () => {
    for (let step = 0; step < STEPS_PER_LOOP; step++) {
      for (const fraction of [0.01, 0.49, 0.51, 0.99]) {
        const { step: snapped } = nearestStep(STEP_SECONDS * fraction, step);
        expect(snapped).toBeGreaterThanOrEqual(0);
        expect(snapped).toBeLessThan(STEPS_PER_LOOP);
      }
    }
  });
});

describe("loop grid", () => {
  it("is a whole number of steps long", () => {
    expect(LOOP_SECONDS).toBeCloseTo(STEP_SECONDS * STEPS_PER_LOOP, 6);
  });

  it("keeps looped notes under live playing so you can hear yourself on top", () => {
    expect(LOOP_GAIN).toBeGreaterThan(0);
    expect(LOOP_GAIN).toBeLessThan(1);
  });
});
