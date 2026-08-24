# Process overview

## What I built

Three bands on one screen: bells on top, marimba in the middle, bass along the
bottom, eight keys each. High notes sit up high and low notes down low, so the
layout shows what it does without telling you. Every key is in A minor
pentatonic, so nothing you play can sound wrong. What you play repeats until
you refresh, so you can put a bass note down, play marimba over it, and keep
adding. Tilting a phone changes the bass tone.

## The moments that mattered

### The loop that faded

> I'm still not able to layer it, i wanna play sumn, and it has to keep
> repeating until i refresh, and then i should be able to add more layers on it
> until then

I had made each repeat quieter than the last, so notes died after about twenty
seconds. That broke the whole idea: your first note was gone before you could
add anything on top of it. The easy fix was a longer fade. I removed the fade
completely instead, so the loop runs until you refresh, and made repeats
quieter than live notes so you can always hear yourself playing over the top
([`cb2cad0`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-rithikanallaparaju16/commit/cb2cad0)).

To check it, I played two notes, added two more thirteen seconds later, and
watched for twenty-six. The first pair had repeated five times and all four
played together at the end. Then I wrote *the loop never decays* into
`CLAUDE.md`
([`5cb982e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-rithikanallaparaju16/commit/5cb982e))
so I would not undo it later.

### Making it explain itself

> It should also be accessible easily and user has to undertsand what is going
> on

I printed the note name on every key, so you can see the pitch climb from left
to right. The risk is a label saying one thing while the sound plays another,
so a test checks every printed name against the note the audio code works out
for that key — they cannot disagree without the build going red. I also gave
the keyboard three rows matching the three bands, so it plays without a mouse
([`bc39a52`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-rithikanallaparaju16/commit/bc39a52)).
