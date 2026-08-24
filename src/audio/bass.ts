import type { EngineBuses } from "./engine.ts";

// Two detuned sawtooths through a lowpass. Tap latches a single note that
// free-runs and fades over ~7s on its own -- no hold required, so the one
// mouse pointer stays free to play marimba/bells over the drone. Monophonic:
// a new note replaces the ringing one, which is also what makes a looped
// bass part read as a bass line rather than a pile-up in the low end.
interface BassVoiceNodes {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  filter: BiquadFilterNode;
  envelope: GainNode;
}

const SUSTAIN_SECONDS = 7;

export class BassVoice {
  private current: BassVoiceNodes | null = null;
  private lastCutoffHz = 900;

  constructor(
    private ctx: AudioContext,
    private buses: EngineBuses,
  ) {}

  trigger(freq: number, gain = 1, when = this.ctx.currentTime): void {
    const start = Math.max(when, this.ctx.currentTime);
    if (this.current) this.fadeOut(this.current, start, 0.05);

    const oscA = this.ctx.createOscillator();
    oscA.type = "sawtooth";
    oscA.frequency.value = freq;
    oscA.detune.value = -6;

    const oscB = this.ctx.createOscillator();
    oscB.type = "sawtooth";
    oscB.frequency.value = freq;
    oscB.detune.value = 6;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = this.lastCutoffHz;
    filter.Q.value = 0.7;

    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(0.8 * gain, start + 0.04);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + SUSTAIN_SECONDS);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.buses.dry);
    envelope.connect(this.buses.bassWet);

    const stopAt = start + SUSTAIN_SECONDS + 0.05;
    oscA.start(start);
    oscB.start(start);
    oscA.stop(stopAt);
    oscB.stop(stopAt);

    const voice: BassVoiceNodes = { oscA, oscB, filter, envelope };
    oscB.onended = () => {
      oscA.disconnect();
      oscB.disconnect();
      filter.disconnect();
      envelope.disconnect();
      if (this.current === voice) this.current = null;
    };
    this.current = voice;
  }

  /** Called on every smoothed tilt update, whether or not a note is currently latched. */
  updateFilterCutoff(hz: number): void {
    this.lastCutoffHz = hz;
    if (!this.current) return;
    const now = this.ctx.currentTime;
    this.current.filter.frequency.cancelScheduledValues(now);
    this.current.filter.frequency.setValueAtTime(this.current.filter.frequency.value, now);
    this.current.filter.frequency.linearRampToValueAtTime(hz, now + 0.05);
  }

  private fadeOut(voice: BassVoiceNodes, at: number, fadeTime: number): void {
    voice.envelope.gain.cancelScheduledValues(at);
    voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, at);
    voice.envelope.gain.linearRampToValueAtTime(0.0001, at + fadeTime);
    try {
      voice.oscA.stop(at + fadeTime + 0.01);
      voice.oscB.stop(at + fadeTime + 0.01);
    } catch {
      // already scheduled to stop
    }
  }
}
