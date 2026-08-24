// Synthesizes a convolution impulse response from filtered noise so the
// shared reverb needs no audio file to host.
export function createImpulseResponse(ctx: AudioContext, duration = 2.5, decayPower = 3): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decayPower);
      data[i] = (Math.random() * 2 - 1) * envelope; // independent noise per channel gives stereo width for free
    }
  }
  return impulse;
}
