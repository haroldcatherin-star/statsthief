// Temps de jeu : heure (0-24), jour, phases (aube, jour, crépuscule, nuit).
import { bus } from './EventBus.js';

export const PHASE_NAMES = {
  dawn: 'Aube',
  day: 'Jour',
  dusk: 'Crépuscule',
  night: 'Nuit',
};

export class Clock {
  constructor(state, cfg) {
    this.state = state;
    this.cfg = cfg;
    this.scaleIndex = 0;
    this.phase = this.computePhase();
  }

  get hour() { return this.state.time.hour; }
  get day() { return this.state.time.day; }
  get timeScale() { return this.cfg.debugScales[this.scaleIndex]; }

  // Heures de jeu écoulées depuis le début (utile pour les casiers, phase 4).
  get totalHours() { return (this.state.time.day - 1) * 24 + this.state.time.hour; }

  cycleScale() {
    this.scaleIndex = (this.scaleIndex + 1) % this.cfg.debugScales.length;
    return this.timeScale;
  }

  update(dt) {
    const hoursPerSecond = 24 / this.cfg.dayLengthSeconds;
    let h = this.state.time.hour + dt * hoursPerSecond * this.timeScale;
    while (h >= 24) {
      h -= 24;
      this.state.time.day++;
      bus.emit('time:newday', this.state.time.day);
    }
    this.state.time.hour = h;

    const p = this.computePhase();
    if (p !== this.phase) {
      const prev = this.phase;
      this.phase = p;
      bus.emit('time:phase', { phase: p, prev });
    }
  }

  computePhase() {
    const h = this.state.time.hour;
    const P = this.cfg.phases;
    if (h >= P.dawn[0] && h < P.dawn[1]) return 'dawn';
    if (h >= P.day[0] && h < P.day[1]) return 'day';
    if (h >= P.dusk[0] && h < P.dusk[1]) return 'dusk';
    return 'night';
  }

  format() {
    const h = Math.floor(this.state.time.hour);
    const m = Math.floor((this.state.time.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
