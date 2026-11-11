// Effets sonores synthétisés (Web Audio), sans aucun fichier.
// Chaque fonction reçoit l'objet Audio (A) qui fournit ctx, noise et la sortie sfx.

export function makeNoiseBuffer(ctx) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function envelope(param, t, attack, peak, decay) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noise(A, t, dur) {
  const s = A.ctx.createBufferSource();
  s.buffer = A.noise;
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur);
  return s;
}

function filtered(A, type, freq, q = 1) {
  const f = A.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function gain(A) {
  const g = A.ctx.createGain();
  g.gain.value = 0;
  g.connect(A.sfx);
  return g;
}

function tone(A, t, type, f0, f1, dur, peak) {
  const o = A.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = gain(A);
  envelope(g.gain, t, 0.005, peak, dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function notes(A, freqs, step, type, peak) {
  const t = A.ctx.currentTime;
  freqs.forEach((f, i) => tone(A, t + i * step, type, f, f, step * 1.4, peak));
}

export const SFX = {
  splash(A, { size = 1 } = {}) {
    const t = A.ctx.currentTime;
    const dur = 0.3 + 0.35 * size;
    const src = noise(A, t, dur + 0.1);
    const f = filtered(A, 'lowpass', 2200);
    f.frequency.setValueAtTime(1800 + 800 * size, t);
    f.frequency.exponentialRampToValueAtTime(220, t + dur);
    const g = gain(A);
    envelope(g.gain, t, 0.008, 0.35 * Math.min(size, 1.5), dur);
    src.connect(f).connect(g);
  },

  plop(A, { pitch = 1, gain: peak = 1 } = {}) {
    const t = A.ctx.currentTime;
    tone(A, t, 'sine', 650 * pitch, 140 * pitch, 0.11, 0.35 * peak);
    const src = noise(A, t, 0.08);
    const f = filtered(A, 'bandpass', 1200, 1.5);
    const g = gain(A);
    envelope(g.gain, t, 0.002, 0.08 * peak, 0.06);
    src.connect(f).connect(g);
  },

  bite(A) {
    SFX.plop(A, { pitch: 0.6, gain: 1.3 });
    SFX.splash(A, { size: 0.35 });
  },

  cast(A) {
    const t = A.ctx.currentTime;
    const src = noise(A, t, 0.45);
    const f = filtered(A, 'bandpass', 300, 2.5);
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.3);
    const g = gain(A);
    envelope(g.gain, t, 0.03, 0.22, 0.35);
    src.connect(f).connect(g);
  },

  strike(A) {
    const t = A.ctx.currentTime;
    const src = noise(A, t, 0.2);
    const f = filtered(A, 'bandpass', 1000, 1.5);
    f.frequency.setValueAtTime(1200, t);
    f.frequency.exponentialRampToValueAtTime(220, t + 0.15);
    const g = gain(A);
    envelope(g.gain, t, 0.005, 0.28, 0.15);
    src.connect(f).connect(g);
  },

  reelin(A) {
    const t = A.ctx.currentTime;
    for (let i = 0; i < 8; i++) SFX.click(A, { at: t + i * 0.05 });
  },

  click(A, { at } = {}) {
    const t = at ?? A.ctx.currentTime;
    const src = noise(A, t, 0.03);
    const f = filtered(A, 'highpass', 2800);
    const g = gain(A);
    envelope(g.gain, t, 0.001, 0.1, 0.018);
    src.connect(f).connect(g);
  },

  snap(A) {
    const t = A.ctx.currentTime;
    tone(A, t, 'square', 1500, 1500, 0.03, 0.15);
    tone(A, t + 0.01, 'sine', 420, 55, 0.35, 0.3);
  },

  catch(A) { notes(A, [523, 659, 784, 1047], 0.07, 'square', 0.08); },
  // Une note de plus en plus aiguë par étoile de rareté.
  star(A, { n = 1 } = {}) { notes(A, [880 * Math.pow(1.26, n - 1), 1760 * Math.pow(1.26, n - 1)], 0.05, 'triangle', 0.1); },
  // Petite fanfare rétro (nouvelle espèce ou record).
  fanfare(A) {
    const t = A.ctx.currentTime;
    const seq = [[523, 0, 0.1], [523, 0.12, 0.1], [523, 0.24, 0.1], [698, 0.36, 0.35], [880, 0.74, 0.12], [784, 0.88, 0.12], [1047, 1.02, 0.5]];
    for (const [f, d, len] of seq) {
      tone(A, t + d, 'square', f, f, len, 0.07);
      tone(A, t + d, 'triangle', f / 2, f / 2, len, 0.09);
    }
  },
  escape(A) { notes(A, [392, 311, 233], 0.1, 'square', 0.07); },
  stow(A) { notes(A, [784, 1047], 0.06, 'triangle', 0.12); },
  coin(A) { notes(A, [1319, 1760, 2093], 0.08, 'square', 0.06); },
  menu(A) { notes(A, [660], 0.04, 'square', 0.05); },

  bump(A) {
    const t = A.ctx.currentTime;
    tone(A, t, 'sine', 95, 38, 0.3, 0.5);
    const src = noise(A, t, 0.15);
    const f = filtered(A, 'lowpass', 500);
    const g = gain(A);
    envelope(g.gain, t, 0.003, 0.25, 0.12);
    src.connect(f).connect(g);
  },
};
