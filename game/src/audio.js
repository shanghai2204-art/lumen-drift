// All sound is synthesized with WebAudio oscillators — no audio files, so
// the game stays fully offline. A soft bass pulse and a slow arpeggio form
// the music loop; short envelopes form the effects. Everything is guarded:
// with no AudioContext (or before the first user gesture) the game is
// simply silent.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A minor-key pulse: two bars of bass, a sparse sparkle on top.
  const BASS = [55, 55, 82.4, 55, 65.4, 55, 49, 73.4];
  const SPARK = [440, 0, 523.25, 0, 659.25, 0, 523.25, 392];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (!ctx || muted) return;
      const i = step % 8;
      tone(BASS[i], 0.34, 'triangle', 0.16);
      if (SPARK[i]) tone(SPARK[i], 0.22, 'sine', 0.05);
      step += 1;
    }, 300);
  }

  return {
    unlock: ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone(880, 0.07, 'square', 0.05, 320);
    },
    hit() {
      tone(220, 0.05, 'sawtooth', 0.06, 140);
    },
    boom(big) {
      tone(big ? 120 : 160, big ? 0.4 : 0.22, 'sawtooth', 0.16, 40);
      tone(60, big ? 0.5 : 0.3, 'sine', 0.2, 30);
    },
    pickup() {
      tone(1320, 0.09, 'sine', 0.08, 1760);
    },
    hurt() {
      tone(196, 0.25, 'sawtooth', 0.18, 98);
    },
    dash() {
      tone(340, 0.14, 'sine', 0.07, 760);
    },
    upgrade() {
      tone(523.25, 0.12, 'triangle', 0.12);
      tone(783.99, 0.16, 'triangle', 0.12, undefined, 0.09);
      tone(1046.5, 0.22, 'triangle', 0.12, undefined, 0.18);
    },
    waveClear() {
      tone(392, 0.14, 'triangle', 0.12);
      tone(523.25, 0.2, 'triangle', 0.12, undefined, 0.1);
    },
  };
}
