# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so look at the deployed head when you add pages.

## The checks

`pnpm check` runs them (`pnpm check:evidence` is the extra gate before you
ship); CI runs the same plus links, secrets and the deploy. Read the failure.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This prototype: three voices on one screen

Bells / marimba / bass as three horizontal bands, eight columns each, all in A
minor pentatonic so nothing a stranger plays can sound wrong. High notes up
high, low down low --- the layout is the only explanation anyone gets.

Conventions this code has to hold to:

- **Never assign `gain.value` mid-note.** Always `cancelScheduledValues` →
  `setValueAtTime(param.value, now)` → a ramp. Pinning the start point to the
  *current* value is the part that's easy to skip, and skipping it makes the
  ramp jump from a stale scheduled target. Bare `.value =` is only for
  `frequency`/`detune`/`Q` set once before `.start()`.
- **Every oscillator gets a `.stop()` and an `onended` that disconnects.** A
  voice that just falls out of scope keeps its node alive in the graph.
- **The first gesture does three things in one synchronous call stack**:
  request the iOS motion permissions, resume the `AudioContext`, and play the
  note the tap landed on. Anything after an `await` in that handler is too
  late for iOS, and a tap that doesn't sound wastes the best moment.
- **Feature-detect sensors by waiting for a reading, never by sniffing the UA.**
  Laptops and iPads must play fine, just without tilt.
- **Tilt is always relative to a captured baseline**, never the raw angle ---
  people hold phones at whatever angle they like --- and always heavily
  smoothed before it reaches an AudioParam.
- **A note fires on *entering* a key, never on staying in one.** A cooldown is
  not enough on its own: a finger resting on a key still jitters, and any
  wobble spaced wider than the cooldown re-fires it. Holding one key gave 29
  notes in three seconds before this was tracked per pointer. Keep the
  cooldown as well, for a fast wobble across a boundary.
- **Held notes need a release, and a release needs a token.** Bass sustains
  while held, so whatever starts a note has to be able to end it --- and
  because bass is monophonic, a stale finger must not be able to cut the note
  that replaced it. Releases carry the token of the voice they started.
- **Play now, quantise the repeat.** A tap fires immediately; only its loop
  repeat is snapped to the grid. Never quantise the live note: latency is the
  thing the crit tests by feel.
- **The loop never decays.** It holds until the page is refreshed --- that is
  what makes layering possible, and it was the first thing this prototype got
  wrong. Looped notes play under live ones (`LOOP_GAIN`) so you can always
  hear yourself over the bed.
- **Structure lives in `index.html`, not in TypeScript.** `spec/*.test.ts`
  parses the built HTML with jsdom and never runs scripts, so anything a test
  needs to see must ship as static markup.
- **The bands may carry marks, not instructions.** The instrument's name, the
  note on each key and the tilt fallback are the marks a real instrument
  carries. Anything that tells the player what to *do* belongs in the intro
  layer; `spec/instrument.test.ts` fails if it reaches the playing surface.
- **The intro layer must sit outside `#instrument` and keep
  `pointer-events: none`.** It sits over the instrument, so if it were inside
  it, or hit-testable, it would swallow the opening tap that has to resume
  audio and sound a note. Tested.
- **Printed note names are generated from the same `scale.ts` the audio uses**
  and asserted equal, so the label can never drift from the pitch.
- **The keyboard rows mirror the bands** --- `12345678` / `qwertyui` /
  `asdfghjk`, top to bottom --- so the layout on screen is the layout under
  your hands. They listen on `window`, not on a focused key, because hunting
  for focus is not playing.
- **Announce on a debounce, never per note.** A live region that fires on
  every tap is unusable mid-performance; it waits for a pause, then reports
  where the loop landed.

Audio behaviour that only an ear can judge --- voice-stealing, envelope
shapes, whether the echo decay is musical --- is deliberately not tested. Open
it and listen; on a phone too, for the tilt.

## This file is yours

A starting point, not a rulebook. As you learn what your prototype needs --- a
convention the work has to hold to, a sensor that keeps catching you out (a
linter, say), a fact about the stack that is easy to get wrong --- write it down
here and wire it into `check`. Growing this file is the work.
