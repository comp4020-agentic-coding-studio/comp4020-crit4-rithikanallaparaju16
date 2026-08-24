import { describe, expect, it } from "vitest";
import { frequencyForColumn } from "../src/scale.ts";

// A minor pentatonic run per band: A C D E G A C D.
describe("frequencyForColumn", () => {
  it("maps the bass band across A1-D3", () => {
    const expected = [55.0, 65.41, 73.42, 82.41, 98.0, 110.0, 130.81, 146.83];
    expected.forEach((hz, column) => {
      expect(frequencyForColumn("bass", column)).toBeCloseTo(hz, 1);
    });
  });

  it("maps the marimba band two octaves above the bass band", () => {
    for (let column = 0; column < 8; column++) {
      expect(frequencyForColumn("marimba", column)).toBeCloseTo(frequencyForColumn("bass", column) * 4, 1);
    }
  });

  it("maps the bells band four octaves above the bass band", () => {
    for (let column = 0; column < 8; column++) {
      expect(frequencyForColumn("bells", column)).toBeCloseTo(frequencyForColumn("bass", column) * 16, 1);
    }
  });

  it("rejects columns outside 0-7", () => {
    expect(() => frequencyForColumn("bass", 8)).toThrow();
    expect(() => frequencyForColumn("bass", -1)).toThrow();
  });
});
