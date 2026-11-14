let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

export async function unlockKitchenAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}

/**
 * Plays a subtle, non-intrusive two-note acoustic service chime
 * using the Web Audio API (no external audio files required).
 */
export async function playNewOrderChime(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const now = ctx.currentTime;

  // Soft two-tone kitchen bell: G5 (783.99 Hz) -> C6 (1046.50 Hz)
  const notes = [
    { freq: 783.99, start: 0, duration: 0.28, peakGain: 0.11 },
    { freq: 1046.5, start: 0.14, duration: 0.45, peakGain: 0.13 },
  ];

  notes.forEach(({ freq, start, duration, peakGain }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);

    // Smooth envelope to eliminate clicks and keep the chime warm
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.linearRampToValueAtTime(peakGain, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.02);
  });
}
