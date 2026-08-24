// beta is pitch (tipping the phone away from you), gamma is roll (tipping it
// left or right). Pitch drives the bass filter, roll opens up the reverb, and
// both together drive the attitude indicator in the bass band. Shaking the
// phone clears the echoes.

const PITCH_CLAMP_DEG = 25;
const ROLL_CLAMP_DEG = 35;
const MIN_CUTOFF_HZ = 180;
const MAX_CUTOFF_HZ = 3500;
const FALLBACK_CUTOFF_HZ = 900;
const SMOOTHING_ALPHA = 0.08; // low = heavy smoothing against jitter
const DETECTION_TIMEOUT_MS = 1000;
const SHAKE_ENERGY_THRESHOLD = 120;
const SHAKE_COOLDOWN_MS = 1500;

export interface TiltReading {
  /** Pitch deviation from the held-at-rest angle, clamped to +-25deg. */
  pitchDeg: number;
  /** Roll deviation from the held-at-rest angle, clamped to +-35deg. */
  rollDeg: number;
  cutoffHz: number;
  /** Reverb amount, 0..1, 0.5 at rest. */
  space: number;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export class TiltController {
  private pitchBaseline: number | null = null;
  private rollBaseline: number | null = null;
  private pitchSmoothed = 0;
  private rollSmoothed = 0;
  private settled = false;
  private listening = false;

  private lastAccel: { x: number; y: number; z: number } | null = null;
  private shakeEnergy = 0;
  private lastShakeAt = 0;

  constructor(
    private readonly onReading: (reading: TiltReading) => void,
    private readonly onUnsupported: () => void,
    private readonly onShake: () => void,
  ) {}

  /** Safe to call more than once; only the first call arms anything. */
  start(): void {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener("deviceorientation", this.handleOrientation, { passive: true });
    if (typeof DeviceMotionEvent !== "undefined") {
      window.addEventListener("devicemotion", this.handleMotion, { passive: true });
    }
    window.setTimeout(() => {
      if (!this.settled) this.markUnsupported();
    }, DETECTION_TIMEOUT_MS);
  }

  /** Call when iOS denies permission -- no point waiting out the timeout. */
  markUnsupported(): void {
    if (this.settled) return;
    this.settled = true;
    this.onReading({ pitchDeg: 0, rollDeg: 0, cutoffHz: FALLBACK_CUTOFF_HZ, space: 0.5 });
    this.onUnsupported();
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    if (event.beta === null && event.gamma === null) return;
    this.settled = true;

    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    // The first real reading is "neutral" -- people hold phones at all sorts
    // of resting angles, so the raw angle is meaningless on its own.
    if (this.pitchBaseline === null) {
      this.pitchBaseline = beta;
      this.rollBaseline = gamma;
      this.pitchSmoothed = beta;
      this.rollSmoothed = gamma;
    } else {
      this.pitchSmoothed += SMOOTHING_ALPHA * (beta - this.pitchSmoothed);
      this.rollSmoothed += SMOOTHING_ALPHA * (gamma - this.rollSmoothed);
    }

    const pitchDeg = clamp(this.pitchSmoothed - this.pitchBaseline, -PITCH_CLAMP_DEG, PITCH_CLAMP_DEG);
    const rollDeg = clamp(this.rollSmoothed - (this.rollBaseline ?? 0), -ROLL_CLAMP_DEG, ROLL_CLAMP_DEG);

    const pitch01 = (pitchDeg + PITCH_CLAMP_DEG) / (2 * PITCH_CLAMP_DEG);
    const cutoffHz = MIN_CUTOFF_HZ * Math.pow(MAX_CUTOFF_HZ / MIN_CUTOFF_HZ, pitch01); // log, to match perceived brightness
    const space = (rollDeg + ROLL_CLAMP_DEG) / (2 * ROLL_CLAMP_DEG);

    this.onReading({ pitchDeg, rollDeg, cutoffHz, space });
  };

  private handleMotion = (event: DeviceMotionEvent): void => {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    if (this.lastAccel) {
      const delta =
        Math.abs(a.x - this.lastAccel.x) +
        Math.abs(a.y - this.lastAccel.y) +
        Math.abs(a.z - this.lastAccel.z);
      this.shakeEnergy = this.shakeEnergy * 0.85 + delta; // leaky, so one jolt while tapping isn't a shake
      const nowMs = performance.now();
      if (this.shakeEnergy > SHAKE_ENERGY_THRESHOLD && nowMs - this.lastShakeAt > SHAKE_COOLDOWN_MS) {
        this.lastShakeAt = nowMs;
        this.shakeEnergy = 0;
        this.onShake();
      }
    }
    this.lastAccel = { x: a.x, y: a.y, z: a.z };
  };
}
