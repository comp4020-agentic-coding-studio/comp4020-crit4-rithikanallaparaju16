import type { EngineBuses } from "./engine.ts";

// Three partials at ratios 1 : 2.76 : 5.4 with long tails. Capped at three
// ringing at once so it doesn't turn to mush; a fourth tap steals the oldest.
interface BellVoice {
  oscillators: OscillatorNode[];
  envelope: GainNode;
}

const RATIOS = [1, 2.76, 5.4];
const PARTIAL_GAINS = [1.0, 0.5, 0.3];
const MAX_BELLS = 3;
const TAIL_SECONDS = 4.0;

const activeBells: BellVoice[] = []; // oldest at index 0

export function playBell(
  ctx: AudioContext,
  buses: EngineBuses,
  freq: number,
  gain = 1,
  when = ctx.currentTime,
): void {
  const start = Math.max(when, ctx.currentTime);
  if (activeBells.length >= MAX_BELLS) stealOldestBell(start);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(0.9 * gain, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + TAIL_SECONDS);

  const oscillators = RATIOS.map((ratio, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    const partialGain = ctx.createGain();
    partialGain.gain.value = PARTIAL_GAINS[i];
    osc.connect(partialGain).connect(envelope);
    osc.start(start);
    osc.stop(start + TAIL_SECONDS + 0.05);
    return osc;
  });

  envelope.connect(buses.dry);
  envelope.connect(buses.bellsWet);

  const voice: BellVoice = { oscillators, envelope };
  oscillators[oscillators.length - 1].onended = () => {
    for (const osc of oscillators) osc.disconnect();
    envelope.disconnect();
    const idx = activeBells.indexOf(voice);
    if (idx !== -1) activeBells.splice(idx, 1);
  };
  activeBells.push(voice);
}

function stealOldestBell(now: number): void {
  const oldest = activeBells.shift();
  if (!oldest) return;
  oldest.envelope.gain.cancelScheduledValues(now);
  oldest.envelope.gain.setValueAtTime(oldest.envelope.gain.value, now);
  oldest.envelope.gain.linearRampToValueAtTime(0.0001, now + 0.03);
  for (const osc of oldest.oscillators) {
    try {
      osc.stop(now + 0.04);
    } catch {
      // already scheduled to stop
    }
  }
}
