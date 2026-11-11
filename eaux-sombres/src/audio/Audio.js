// Mixage audio : ambiances en boucle (clapotis, vent, moteur, grincement du fil)
// et effets ponctuels (Synth.js). Le contexte démarre au premier clic ou à la première touche.
import { SFX, makeNoiseBuffer } from './Synth.js';

export class Audio {
  constructor(cfg) {
    this.cfg = cfg;
    this.ctx = null;
    this.muted = false;
    this.clickTimer = 0;
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  build() {
    const ctx = this.ctx;
    this.noise = makeNoiseBuffer(ctx);
    const mk = (v, dest) => { const g = ctx.createGain(); g.gain.value = v; g.connect(dest); return g; };
    this.master = mk(this.muted ? 0 : this.cfg.master, ctx.destination);
    this.sfx = mk(this.cfg.sfx, this.master);
    this.amb = mk(this.cfg.ambience, this.master);

    const loop = () => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      s.start(0, Math.random() * 1.5);
      return s;
    };
    const lfo = (freq, depth, param) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = depth;
      o.connect(g).connect(param);
      o.start();
    };

    // Clapotis : bruit filtré grave, modulé lentement
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 420;
    this.waveGain = mk(0.1, this.amb);
    loop().connect(wf).connect(this.waveGain);
    lfo(0.17, 0.05, this.waveGain.gain);
    lfo(0.11, 120, wf.frequency);

    // Vent : bruit passe-bande qui ondule
    const vf = ctx.createBiquadFilter();
    vf.type = 'bandpass';
    vf.frequency.value = 700;
    vf.Q.value = 0.6;
    this.windGain = mk(0.02, this.amb);
    loop().connect(vf).connect(this.windGain);
    lfo(0.07, 300, vf.frequency);

    // Moteur : dents de scie graves filtrées
    const ef = ctx.createBiquadFilter();
    ef.type = 'lowpass';
    ef.frequency.value = 260;
    this.engineGain = mk(0, this.sfx);
    this.engine = ctx.createOscillator();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 42;
    this.engine.connect(ef).connect(this.engineGain);
    this.engine.start();

    // Grincement du fil sous tension
    this.creakGain = mk(0, this.sfx);
    this.creak = ctx.createOscillator();
    this.creak.type = 'triangle';
    this.creak.frequency.value = 300;
    this.creak.connect(this.creakGain);
    this.creak.start();
    lfo(9, 35, this.creak.frequency);
  }

  play(name, opts) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    SFX[name]?.(this, opts);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.cfg.master, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // p : { speed, maxSpeed, waveScale, boundary, reeling, reelRate, tension }
  update(dt, p) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const sp = Math.abs(p.speed) / p.maxSpeed;
    this.engineGain.gain.setTargetAtTime(0.03 + sp * 0.1, t, 0.2);
    this.engine.frequency.setTargetAtTime(38 + sp * 50, t, 0.3);
    this.windGain.gain.setTargetAtTime(0.012 + p.waveScale * 0.025 + p.boundary * 0.08 + sp * 0.02, t, 0.5);
    this.waveGain.gain.setTargetAtTime(0.08 + p.waveScale * 0.04, t, 0.5);
    const creak = p.tension > 0.75 ? (p.tension - 0.75) * 0.35 : 0;
    this.creakGain.gain.setTargetAtTime(creak, t, 0.05);
    this.creak.frequency.setTargetAtTime(240 + p.tension * 220, t, 0.05);

    if (p.reeling) {
      this.clickTimer += dt * (p.reelRate || 14);
      while (this.clickTimer > 1) {
        this.clickTimer -= 1;
        this.play('click');
      }
    }
  }
}
