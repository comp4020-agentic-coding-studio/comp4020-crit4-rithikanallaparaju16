import { createImpulseResponse } from "./reverb.ts";

// Every voice sends dry (so transients stay audible) and into one shared
// convolver (so the three voices sound like they're in the same room).
export interface EngineBuses {
  dry: GainNode;
  marimbaWet: GainNode;
  bellsWet: GainNode;
  bassWet: GainNode;
}

export const ctx = new AudioContext();

const masterGain = ctx.createGain();
masterGain.gain.value = 0.8;
const compressor = ctx.createDynamicsCompressor();
masterGain.connect(compressor).connect(ctx.destination);

const convolver = ctx.createConvolver();
convolver.buffer = createImpulseResponse(ctx);
convolver.normalize = true;

// Everything wet passes through one return gain, so rolling the phone
// left/right opens and closes the room for all three voices at once.
const reverbReturn = ctx.createGain();
reverbReturn.gain.value = 1;
convolver.connect(reverbReturn).connect(masterGain);

/** `amount` 0..1; 0.5 is the untilted room. */
export function setReverbSpace(amount: number): void {
  const target = 0.35 + Math.min(1, Math.max(0, amount)) * 1.3;
  const now = ctx.currentTime;
  reverbReturn.gain.cancelScheduledValues(now);
  reverbReturn.gain.setValueAtTime(reverbReturn.gain.value, now);
  reverbReturn.gain.linearRampToValueAtTime(target, now + 0.08);
}

const marimbaWetSend = ctx.createGain();
marimbaWetSend.gain.value = 0.3;
const bellsWetSend = ctx.createGain();
bellsWetSend.gain.value = 0.45;
const bassWetSend = ctx.createGain();
bassWetSend.gain.value = 0.2;
for (const send of [marimbaWetSend, bellsWetSend, bassWetSend]) send.connect(convolver);

export const buses: EngineBuses = {
  dry: masterGain,
  marimbaWet: marimbaWetSend,
  bellsWet: bellsWetSend,
  bassWet: bassWetSend,
};

export function resumeAudio(): void {
  void ctx.resume();
}
