import { buses, ctx, resumeAudio, setReverbSpace } from "./src/audio/engine.ts";
import { playBell } from "./src/audio/bells.ts";
import { BassVoice } from "./src/audio/bass.ts";
import { playMarimba } from "./src/audio/marimba.ts";
import {
  announce,
  dismissIntro,
  flashCleared,
  onHelp,
  pulseColumn,
  revealLoopPulse,
  setAttitude,
  setColumnArmed,
  setLoopPhase,
  showTiltHint,
} from "./src/dom.ts";
import { Looper } from "./src/loop.ts";
import { setupInteraction } from "./src/interaction.ts";
import type { Hit } from "./src/interaction.ts";
import { frequencyForColumn, noteName } from "./src/scale.ts";
import { TiltController } from "./src/tilt.ts";

const bassVoice = new BassVoice(ctx, buses);

/** Scheduled playback, for the loop -- envelopes that end by themselves.
 *  Returns whether it actually sounded, since a held bass note can make its
 *  own echo sit a repeat out. */
function replayVoice(band: Hit["band"], freq: number, gain: number, when: number): boolean {
  if (band === "bells") {
    playBell(ctx, buses, freq, gain, when);
    return true;
  }
  if (band === "marimba") {
    playMarimba(ctx, buses, freq, gain, when);
    return true;
  }
  return bassVoice.replay(freq, gain, when);
}

// Bass is monophonic, so one token tracks whichever press currently owns it.
let bassToken: number | null = null;

// Everything you play goes into the loop and stays there until the page is
// refreshed, so you can lay a bass note down, play marimba over the top of it
// and keep stacking.
const looper = new Looper(
  ctx,
  (band, column, gain, when) => {
    if (!replayVoice(band, frequencyForColumn(band, column), gain, when)) return;
    window.setTimeout(
      () => pulseColumn(band, column, "echo"),
      Math.max(0, (when - ctx.currentTime) * 1000),
    );
  },
  (band, column, armed) => setColumnArmed(band, column, armed),
);

const tiltController = new TiltController(
  (reading) => {
    bassVoice.updateFilterCutoff(reading.cutoffHz);
    setReverbSpace(reading.space);
    setAttitude(reading.pitchDeg, reading.rollDeg);
  },
  () => showTiltHint(),
  () => clearLoop(),
);

function clearLoop(): void {
  looper.clear();
  flashCleared();
  announce("Loop cleared.", 0);
}

onHelp(() => announce("How to play.", 0));

// iOS gates the motion sensors behind a permission prompt that must be
// requested inside a user gesture -- so only there does tilt wait for the
// first tap. Everywhere else, start listening immediately: that's what makes
// the horizon already moving by the time anyone touches the screen.
type Gated = { requestPermission?: () => Promise<"granted" | "denied"> };
const orientationGate = DeviceOrientationEvent as typeof DeviceOrientationEvent & Gated;
const motionGate =
  typeof DeviceMotionEvent === "undefined"
    ? undefined
    : (DeviceMotionEvent as typeof DeviceMotionEvent & Gated);
const needsPermission = typeof orientationGate.requestPermission === "function";
if (!needsPermission) tiltController.start();

// Refresh is the reset, but a keyboard has room for a quieter way out.
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") clearLoop();
});

const instrument = document.getElementById("instrument");
if (instrument) {
  setupInteraction(instrument, {
    onFirstGesture() {
      resumeAudio();
      looper.start();
      dismissIntro();
      revealLoopPulse();
      requestAnimationFrame(paintLoopPhase);

      if (!needsPermission) return;
      // Both prompts have to be fired synchronously from the gesture, before
      // anything awaits, or iOS quietly drops them.
      motionGate?.requestPermission?.().catch(() => {});
      orientationGate
        .requestPermission!()
        .then((state) => {
          if (state === "granted") tiltController.start();
          else tiltController.markUnsupported();
        })
        .catch(() => tiltController.markUnsupported());
    },

    onNote(hit: Hit) {
      const freq = frequencyForColumn(hit.band, hit.column);
      if (hit.band === "bells") playBell(ctx, buses, freq);
      else if (hit.band === "marimba") playMarimba(ctx, buses, freq);
      // Bass holds while you hold it, so it needs a press, not a one-shot.
      else bassToken = bassVoice.press(freq);

      pulseColumn(hit.band, hit.column, "live");
      looper.record(hit.band, hit.column);
      announce(`${noteName(hit.band, hit.column)}. ${looper.size} looping.`);
    },

    onRelease(hit: Hit) {
      // Only the bass sustains; the struck voices ring out on their own.
      // Letting go starts its ~7s tail, so sliding off it onto the marimba
      // leaves the drone behind you rather than cutting it dead.
      if (hit.band !== "bass" || bassToken === null) return;
      bassVoice.release(bassToken);
      bassToken = null;
    },
  });
}

function paintLoopPhase(): void {
  setLoopPhase(looper.phase());
  requestAnimationFrame(paintLoopPhase);
}
