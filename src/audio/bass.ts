import type { EngineBuses } from "./engine.ts";

// Two detuned sawtooths through a lowpass, monophonic -- a new note replaces
// the ringing one, which is what makes a bass part read as a bass line rather
// than a pile-up in the low end.
//
// A live press rises and then HOLDS for as long as you hold it, so a long
// press is one long note instead of a stutter of retriggers. Letting go
// starts a ~7s fade, so a quick tap still latches and dies away on its own
// and one pointer is free to go and play the bands above it.
interface BassVoiceNodes {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  filter: BiquadFilterNode;
  envelope: GainNode;
  releasing: boolean;
  safety?: number;
}

const PEAK = 0.8;
const ATTACK_SECONDS = 0.04;
const RELEASE_SECONDS = 7;
/** A pointer can be lost (cancelled, window blurred). Nothing holds forever. */
const MAX_HOLD_SECONDS = 40;

export class BassVoice {
  private current: BassVoiceNodes | null = null;
  private token = 0;
  private lastCutoffHz = 900;

  constructor(
    private ctx: AudioContext,
    private buses: EngineBuses,
  ) {}

  /** Start a held note. Pass the returned token back to `release`. */
  press(freq: number): number {
    const start = this.ctx.currentTime;
    const voice = this.begin(freq, start);

    voice.envelope.gain.setValueAtTime(0.0001, start);
    voice.envelope.gain.linearRampToValueAtTime(PEAK, start + ATTACK_SECONDS);
    // No decay is scheduled: it sits at PEAK until release() asks it to stop.

    const token = ++this.token;
    voice.safety = window.setTimeout(() => this.release(token), MAX_HOLD_SECONDS * 1000);
    this.current = voice;
    return token;
  }

  /** Let a held note go: it fades over ~7s, the latch tail. Stale tokens are
   *  ignored, so releasing a finger whose note was already replaced by another
   *  can't cut the newer note short. */
  release(token: number): void {
    if (token !== this.token) return;
    const voice = this.current;
    if (!voice || voice.releasing) return;
    voice.releasing = true;
    window.clearTimeout(voice.safety);
    this.fade(voice, this.ctx.currentTime, RELEASE_SECONDS);
  }

  /** Loop playback: a fixed envelope that ends on its own, since a scheduled
   *  note has no finger to let go of it. A live, still-held press owns the
   *  mono slot outright -- past one loop length its own echo comes due while
   *  the finger is still down, and if that echo were allowed to steal the
   *  slot the way a new press does, a long-held note would get cut over to a
   *  fixed decay every ~5s regardless of the hold. So it just sits this
   *  repeat out; `bornCycle` means it tries again next time round, and wins
   *  as soon as the note is actually released. Returns whether it played, so
   *  the caller can skip the echo pulse when it didn't. */
  replay(freq: number, gain: number, when: number): boolean {
    if (this.current && !this.current.releasing) return false;

    const start = Math.max(when, this.ctx.currentTime);
    const voice = this.begin(freq, start);

    voice.envelope.gain.setValueAtTime(0.0001, start);
    voice.envelope.gain.linearRampToValueAtTime(PEAK * gain, start + ATTACK_SECONDS);
    voice.envelope.gain.exponentialRampToValueAtTime(0.0001, start + RELEASE_SECONDS);

    voice.releasing = true;
    const stopAt = start + RELEASE_SECONDS + 0.05;
    voice.oscA.stop(stopAt);
    voice.oscB.stop(stopAt);
    this.token += 1; // a replayed note owns the voice; stale presses can't release it
    this.current = voice;
    return true;
  }

  /** Called on every smoothed tilt update, whether or not a note is sounding. */
  updateFilterCutoff(hz: number): void {
    this.lastCutoffHz = hz;
    if (!this.current) return;
    const now = this.ctx.currentTime;
    this.current.filter.frequency.cancelScheduledValues(now);
    this.current.filter.frequency.setValueAtTime(this.current.filter.frequency.value, now);
    this.current.filter.frequency.linearRampToValueAtTime(hz, now + 0.05);
  }

  /** Builds the graph and cuts short whatever was already sounding. */
  private begin(freq: number, start: number): BassVoiceNodes {
    if (this.current) this.fade(this.current, start, 0.05);

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
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.buses.dry);
    envelope.connect(this.buses.bassWet);

    oscA.start(start);
    oscB.start(start);

    const voice: BassVoiceNodes = { oscA, oscB, filter, envelope, releasing: false };
    oscB.onended = () => {
      oscA.disconnect();
      oscB.disconnect();
      filter.disconnect();
      envelope.disconnect();
      window.clearTimeout(voice.safety);
      if (this.current === voice) this.current = null;
    };
    return voice;
  }

  private fade(voice: BassVoiceNodes, at: number, seconds: number): void {
    voice.envelope.gain.cancelScheduledValues(at);
    voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, at);
    voice.envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    // A later stop() supersedes an earlier one, so re-stopping is safe.
    voice.oscA.stop(at + seconds + 0.05);
    voice.oscB.stop(at + seconds + 0.05);
  }
}
