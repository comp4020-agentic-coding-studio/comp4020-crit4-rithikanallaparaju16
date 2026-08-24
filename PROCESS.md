# Process overview

## What I built

An instrument in three horizontal bands — bells over marimba over bass, high
sounds up high — eight keys each, tuned to A minor pentatonic across three
octaves so a stranger cannot play a wrong note. Everything you play loops until
you refresh: drop a bass note, play marimba over it, keep stacking. On a phone,
tilting shapes the bass filter and rolls the reverb open.

## The moments that mattered

**The loop that faded.** My first pass at "keep playing" was an echo that
decayed over about four cycles. It sounded good and was wrong — notes vanished
after twenty seconds, so there was never anything to build on and layering
never actually happened. The obvious fix was a longer decay. Instead I removed
decay entirely, held the loop until refresh, and ducked looped notes under live
ones so you can always hear yourself over the bed
([`cb2cad0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-rithikanallaparaju16/commit/cb2cad0)).
I checked it by driving the page for twenty-six seconds: the first two notes
had repeated five times, and bells added at thirteen seconds fired alongside
them in the final cycle. Then I put *the loop never decays* in `CLAUDE.md`
([`5cb982e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-rithikanallaparaju16/commit/5cb982e))
so it cannot come back.

**Tests that cannot hear.** `spec/` parses the built HTML with jsdom, which
never runs scripts and has no Web Audio — so nothing generated in TypeScript
was checkable, and none of the sound was. Rather than test around that, I moved
the instrument's structure into static markup and asserted that the note
printed on each key equals what `scale.ts` computes for it, so a label can
never drift from the pitch it plays
([`bc39a52`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-rithikanallaparaju16/commit/bc39a52)).
Envelope shape and voice-stealing stay untested on purpose. That is what the
crit is for.
