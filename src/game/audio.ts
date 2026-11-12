/** Tiny synthesized sound effects (no files to load). */
let ctx: AudioContext | null = null;
let muted = false;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(m: boolean) {
  muted = m;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.15) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  click: () => tone(660, 0, 0.08, "triangle", 0.08),
  register: () => {
    tone(1318, 0, 0.12, "square", 0.05);
    tone(1760, 0.08, 0.35, "triangle", 0.12);
    tone(2637, 0.1, 0.4, "sine", 0.06);
  },
  order: () => {
    tone(523, 0, 0.12, "triangle", 0.1);
    tone(784, 0.1, 0.18, "triangle", 0.1);
  },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, "triangle", 0.12)),
  error: () => tone(196, 0, 0.2, "sawtooth", 0.05),
  door: () => {
    tone(1568, 0, 0.5, "sine", 0.05);
    tone(1976, 0.12, 0.6, "sine", 0.04);
  },
};
