// A minor pentatonic (A C D E G), one 8-note run per band spanning exactly the
// stated register: bass A1-D3, marimba A3-D5 (+24 semitones), bells A5-D7 (+48).
// Column 0 = leftmost = lowest note, ascending left to right.

export type Band = "bells" | "marimba" | "bass";

const BASS_MIDI = [33, 36, 38, 40, 43, 45, 48, 50] as const; // A1 C2 D2 E2 G2 A2 C3 D3

const OCTAVE_OFFSET: Record<Band, number> = {
  bass: 0,
  marimba: 24,
  bells: 48,
};

export function midiForColumn(band: Band, column: number): number {
  if (column < 0 || column > 7) throw new RangeError(`column out of range: ${column}`);
  return BASS_MIDI[column] + OCTAVE_OFFSET[band];
}

export function frequencyForColumn(band: Band, column: number): number {
  return 440 * Math.pow(2, (midiForColumn(band, column) - 69) / 12);
}

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** Scientific pitch name, e.g. "A4". Every note in this scale is a natural. */
export function noteName(band: Band, column: number): string {
  const midi = midiForColumn(band, column);
  return `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
