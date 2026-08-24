import type { EngineBuses } from "./engine.ts";

// Sine fundamental plus a sine two octaves up for the woody attack knock;
// fast attack, ~0.6s decay. `when` lets the echo loop place a note on the
// grid instead of firing it the moment the timer wakes up.
export function playMarimba(
  ctx: AudioContext,
  buses: EngineBuses,
  freq: number,
  gain = 1,
  when = ctx.currentTime,
): void {
  const start = Math.max(when, ctx.currentTime);
  const humanize = (Math.random() * 2 - 1) * 3; // +-3 cents, so repeats aren't machine-identical

  const fundamental = ctx.createOscillator();
  fundamental.type = "sine";
  fundamental.frequency.value = freq;
  fundamental.detune.value = humanize;

  const overtone = ctx.createOscillator();
  overtone.type = "sine";
  overtone.frequency.value = freq * 4; // two octaves up
  overtone.detune.value = humanize;

  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.25;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(gain, start + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);

  fundamental.connect(envelope);
  overtone.connect(overtoneGain).connect(envelope);
  envelope.connect(buses.dry);
  envelope.connect(buses.marimbaWet);

  const stopAt = start + 0.65;
  fundamental.start(start);
  overtone.start(start);
  fundamental.stop(stopAt);
  overtone.stop(stopAt);

  overtone.onended = () => {
    fundamental.disconnect();
    overtone.disconnect();
    overtoneGain.disconnect();
    envelope.disconnect();
  };
}
