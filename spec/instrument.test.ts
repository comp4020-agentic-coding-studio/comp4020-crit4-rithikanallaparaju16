import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { noteName } from "../src/scale.ts";
import type { Band } from "../src/scale.ts";

// These check the shipped markup only -- Web Audio and the motion sensors
// aren't available in jsdom, and jsdom never runs main.ts (no runScripts),
// so bell voice-stealing, the bass fade curve, the echo loop and tilt
// calibration are left to the crit, per spec/README.md's guidance to test
// contracts a machine can actually check.
const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window.document;

const BANDS: ReadonlyArray<{ key: Band; name: string }> = [
  { key: "bells", name: "Bells" },
  { key: "marimba", name: "Marimba" },
  { key: "bass", name: "Bass" },
];

describe("instrument layout", () => {
  it("has exactly 8 columns in each of the three bands", () => {
    for (const { key } of BANDS) {
      expect(doc.querySelectorAll(`[data-band-container="${key}"] .column`).length).toBe(8);
    }
  });

  it("every column has a unique data-column 0-7 within its band", () => {
    for (const { key } of BANDS) {
      const columns = [...doc.querySelectorAll(`[data-band-container="${key}"] .column`)].map((el) =>
        el.getAttribute("data-column"),
      );
      expect(new Set(columns)).toEqual(new Set(["0", "1", "2", "3", "4", "5", "6", "7"]));
    }
  });

  it("every column is keyboard-operable and names its own shortcut", () => {
    for (const column of doc.querySelectorAll(".column")) {
      expect(column.getAttribute("role")).toBe("button");
      expect(column.getAttribute("tabindex")).toBe("0");
      expect(column.getAttribute("aria-keyshortcuts")).toBeTruthy();
    }
  });

  it("gives every key an accessible name saying which instrument and note it is", () => {
    for (const { key, name } of BANDS) {
      for (let column = 0; column < 8; column++) {
        const el = doc.querySelector(`[data-band-container="${key}"] [data-column="${column}"]`);
        expect(el?.getAttribute("aria-label")).toBe(`${name} ${noteName(key, column)}`);
      }
    }
  });

  it("prints the note each key plays, matching the scale the audio uses", () => {
    for (const { key } of BANDS) {
      const printed = [...doc.querySelectorAll(`[data-band-container="${key}"] .column .note`)].map(
        (el) => el.textContent?.trim(),
      );
      expect(printed).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((c) => noteName(key, c)));
    }
  });

  it("assigns each keyboard shortcut to exactly one key", () => {
    const shortcuts = [...doc.querySelectorAll(".column")].map((el) =>
      el.getAttribute("aria-keyshortcuts"),
    );
    expect(new Set(shortcuts).size).toBe(24);
  });

  it("explains itself once, without blocking the first note", () => {
    const intro = doc.querySelector('[data-testid="intro-overlay"]');
    expect(intro, "a stranger needs to know the bands loop before they play").toBeTruthy();
    // The overlay must never sit inside the instrument, or it would swallow
    // the opening tap that has to resume audio and sound a note.
    expect(doc.querySelector('#instrument [data-testid="intro-overlay"]')).toBeNull();
    expect(doc.querySelector('[data-testid="help"]'), "and be able to read it again").toBeTruthy();
  });

  it("has a live region so the loop's state is not purely visual", () => {
    const announcer = doc.querySelector('[data-testid="announcer"]');
    expect(announcer?.getAttribute("aria-live")).toBe("polite");
  });

  it("names the instrument and its register in each band", () => {
    for (const { key, name } of BANDS) {
      const label = doc.querySelector(`[data-band-container="${key}"] .band-label`);
      expect(label?.textContent, `${key} band should say which instrument it is`).toContain(name);
      expect(label?.querySelector(".band-range")?.textContent?.trim()).toMatch(/^A\d.D\d$/);
    }
  });

  it("bands run high to low down the screen", () => {
    const order = [...doc.querySelectorAll("[data-band-container]")].map((el) =>
      el.getAttribute("data-band-container"),
    );
    expect(order).toEqual(["bells", "marimba", "bass"]);
  });

  it("has an attitude indicator and a loop pulse", () => {
    expect(doc.querySelector('[data-testid="horizon-line"]')).toBeTruthy();
    expect(doc.querySelector('[data-testid="loop-pulse"]')).toBeTruthy();
  });

  it("ships the tilt fallback hint hidden by default", () => {
    const hint = doc.querySelector('[data-testid="tilt-hint"]');
    expect(hint).toBeTruthy();
    expect(hint?.hasAttribute("hidden")).toBe(true);
  });

  it("keeps the playing surface free of instructions", () => {
    // Naming the instrument, the note and the tilt fallback is orientation --
    // the marks a real instrument carries. Anything else telling the player
    // what to do belongs in the intro layer, which they can dismiss.
    const clone = doc.querySelector("#instrument")!.cloneNode(true) as Element;
    for (const el of clone.querySelectorAll('.band-label, .note, [data-testid="tilt-hint"]')) {
      el.remove();
    }
    expect(clone.textContent?.trim()).toBe("");
  });
});
