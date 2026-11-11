// Interface rétro dessinée dans un canvas basse résolution, agrandi d'un facteur entier.
import { PixelFont, ICON, LINE_H } from './PixelFont.js';
import { PHASE_NAMES } from '../core/Clock.js';
import { wrap } from './ListMenu.js';

const COL = {
  text: '#e8e0c8',
  dim: '#8a94a8',
  gold: '#ffd060',
  red: '#ff6a50',
  green: '#7ae08a',
  panel: 'rgba(8, 12, 22, 0.72)',
  border: '#b8985a',
  borderDark: '#4a3a24',
};

const CARDINALS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };

const wrapDeg = (a) => ((a % 360) + 540) % 360 - 180;

export class HUD {
  constructor(canvas, input, cfg) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.font = new PixelFont();
    this.input = input;
    this.cfg = cfg;
    this.toasts = [];
    this.bannerData = null;
    this.showHelp = true;
    this.showDebug = false;
    this.topReserved = 50;
    this.resize();
  }

  resize() {
    const s = Math.max(1, Math.round(window.innerHeight / this.cfg.uiPixelHeight));
    this.scale = s;
    this.w = Math.ceil(window.innerWidth / s);
    this.h = Math.ceil(window.innerHeight / s);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = `${this.w * s}px`;
    this.canvas.style.height = `${this.h * s}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  toast(text, duration = 3) {
    this.toasts.push({ text, t: 0, duration });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  banner(title, subtitle = '') {
    this.bannerData = { title, subtitle, t: 0, duration: 4.5 };
  }

  panel(x, y, w, h, fill = COL.panel) {
    const c = this.ctx;
    c.fillStyle = fill;
    c.fillRect(x, y, w, h);
    c.fillStyle = COL.border;
    c.fillRect(x, y, w, 1);
    c.fillRect(x, y + h - 1, w, 1);
    c.fillRect(x, y, 1, h);
    c.fillRect(x + w - 1, y, 1, h);
    c.fillStyle = COL.borderDark;
    c.fillRect(x + 1, y + h, w, 1);
    c.fillRect(x + w, y + 1, 1, h);
  }

  text(t, x, y, color = COL.text, opts) {
    this.font.draw(this.ctx, t, x, y, color, opts);
  }

  update(dt) {
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.duration);
    if (this.bannerData) {
      this.bannerData.t += dt;
      if (this.bannerData.t > this.bannerData.duration) this.bannerData = null;
    }
  }

  draw(info) {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.globalAlpha = 1;

    // Pendant l'animation de prise, on ne garde que l'animation (et les menus éventuels).
    if (info.hideHud) {
      for (const overlay of info.overlays || []) overlay(this);
      return;
    }

    this.drawClock(info);
    this.drawStatus(info);
    this.drawCompass(info);
    this.helpTop = null;
    if (this.showHelp && !info.busy) this.drawHelp(info);
    else this.text(`${this.input.label('help')} : AIDE`, 6, this.h - 14, COL.dim);
    if (this.showDebug) this.drawDebug(info);
    if (info.prompt) this.drawPrompt(info.prompt);
    this.drawBanner();
    this.drawToasts();
    for (const overlay of info.overlays || []) overlay(this); // menus au premier plan
  }

  drawPrompt(text) {
    // En bas de l'écran, au-dessus du panneau d'aide s'il est affiché.
    const y = (this.helpTop ?? this.h) - 22;
    const w = this.font.measure(text) + 12;
    this.panel(Math.round(this.w / 2 - w / 2), y - 3, w, LINE_H + 5);
    this.text(text, this.w / 2, y, COL.gold, { align: 'center' });
  }

  drawClock({ clock, zoneName, creator }) {
    const x = 6, y = 6, w = 104;
    this.panel(x, y, w, 40);
    if (creator) this.text('MODE CRÉATEUR', x + 2, y + 44, COL.gold);
    this.text(`JOUR ${clock.day}`, x + 5, y + 2);
    this.text(clock.format(), x + w - 5, y + 2, COL.gold, { align: 'right' });
    const night = clock.phase === 'night' || clock.phase === 'dusk';
    this.text(`${night ? ICON.moon : ICON.sun} ${PHASE_NAMES[clock.phase]}`, x + 5, y + 2 + LINE_H, night ? '#a8b8ff' : COL.gold);
    this.text(zoneName, x + 5, y + 2 + LINE_H * 2, COL.dim);
  }

  drawStatus({ boat, inventory, money, state }) {
    const w = 104, x = this.w - w - 6, y = 6;
    const st = boat.stats;
    const fuelK = st ? state.fuel / st.tank : 1;
    const hullK = st ? state.hull / st.maxHull : 1;
    const blink = Math.floor(performance.now() / 400) % 2 === 0;
    const rows = [
      ['ARGENT', `${money} ${ICON.coin}`, COL.gold],
      ['CALE', `${inventory.usedCells}/${inventory.totalCells}`, inventory.full ? COL.red : COL.text],
      ['ESSENCE', `${Math.round(fuelK * 100)} %`, fuelK < 0.2 ? (blink ? COL.red : COL.text) : COL.text],
      ['COQUE', `${Math.round(hullK * 100)} %`, hullK < 0.3 ? (blink ? COL.red : COL.text) : COL.text],
      ['VITESSE', `${boat.knots.toFixed(1)} ND`, COL.text],
    ];
    this.panel(x, y, w, rows.length * LINE_H + 7);
    rows.forEach(([k, v, col], i) => {
      this.text(k, x + 5, y + 2 + i * LINE_H, COL.dim);
      this.text(v, x + w - 5, y + 2 + i * LINE_H, col, { align: 'right' });
    });
  }

  drawCompass({ bearing, boat, port, markers = [] }) {
    const c = this.ctx;
    // La boussole se place entre les deux panneaux, ou en dessous si l'écran est étroit.
    let cw = Math.min(150, this.w - 2 * (6 + 104 + 6) - 8);
    let y = 6;
    if (cw < 100) { cw = Math.min(150, this.w - 20); y = 74; }
    const half = Math.floor(cw / 2), range = 75;
    const cx = Math.round(this.w / 2);
    this.topReserved = y + 15 + LINE_H * 2;
    this.panel(cx - half - 4, y, cw + 8, 15);
    for (let a = -180; a < 180; a += 15) {
      const rel = wrapDeg(a - bearing);
      if (Math.abs(rel) > range) continue;
      const x = Math.round(cx + (rel / range) * half);
      const deg = (a + 360) % 360;
      const label = CARDINALS[deg];
      if (label) this.text(label, x, y + 2, label === 'N' ? COL.red : COL.text, { align: 'center' });
      else {
        c.fillStyle = COL.dim;
        c.fillRect(x, y + 6, 1, 4);
      }
    }
    c.fillStyle = COL.gold;
    c.fillRect(cx, y + 12, 1, 3);

    // Repère du port
    const pb = (Math.atan2(port.x - boat.x, -(port.z - boat.z)) * 180) / Math.PI;
    const rel = wrapDeg(pb - bearing);
    const dist = Math.hypot(port.x - boat.x, port.z - boat.z);
    let px, icon;
    if (Math.abs(rel) <= range) { px = Math.round(cx + (rel / range) * half); icon = ICON.port; }
    else { px = rel > 0 ? cx + half - 2 : cx - half + 2; icon = rel > 0 ? ICON.right : ICON.left; }
    this.text(icon, px, y + 15, COL.gold, { align: 'center' });

    // Casiers et filets posés (vert = plein ou à relever)
    for (const mk of markers) {
      const mb = (Math.atan2(mk.x - boat.x, -(mk.z - boat.z)) * 180) / Math.PI;
      const mr = wrapDeg(mb - bearing);
      if (Math.abs(mr) > range) continue;
      this.text(ICON.trap, Math.round(cx + (mr / range) * half), y + 15, mk.full ? COL.green : '#e8c020', { align: 'center' });
    }
    if (dist > 40) this.text(`PORT ${Math.round(dist)} M`, cx, y + 15 + LINE_H, COL.dim, { align: 'center' });
  }

  drawHelp({ ps1, timeScale, lampLabel, muted }) {
    const I = this.input;
    const lines = [
      [`${I.label('forward')} ${I.label('left')} ${I.label('back')} ${I.label('right')} / FLÈCHES`, 'NAVIGUER'],
      ['CLIC GAUCHE (MAINTENIR)', 'PÊCHER'],
      ['CLIC DROIT + SOURIS', 'CAMÉRA'],
      [`MOLETTE · ${I.label('interact')}`, 'ZOOM · INTERAGIR'],
      [`${I.label('hold')} · ${I.label('journal')} · ÉCHAP`, 'CALE · CARNET · PAUSE'],
      [`${I.label('trap')} · ${I.label('net')}`, 'POSER CASIER · FILET'],
      [I.label('lamp'), `LANTERNE (${lampLabel})`],
      [`${I.label('timeScale')} · ${I.label('mute')}`, `TEMPS X${timeScale} · SON ${muted ? 'NON' : 'OUI'}`],
      [I.label('togglePS1'), `EFFET PS1 (${ps1 ? 'OUI' : 'NON'})`],
      [I.label('help'), 'MASQUER L\'AIDE'],
    ];
    const w = 226, h = lines.length * LINE_H + 6;
    const x = 6, y = this.h - h - 6;
    this.helpTop = y;
    this.panel(x, y, w, h);
    lines.forEach(([k, v], i) => {
      this.text(k, x + 5, y + 2 + i * LINE_H, COL.gold);
      this.text(v, x + w - 5, y + 2 + i * LINE_H, COL.text, { align: 'right' });
    });
  }

  drawDebug({ fps, boat, res }) {
    const lines = [
      `FPS ${fps.toFixed(0)}`,
      `X ${boat.x.toFixed(0)} Z ${boat.z.toFixed(0)}`,
      `RÉS ${res[0]}×${res[1]}`,
    ];
    const w = 90, h = lines.length * LINE_H + 6;
    const x = this.w - w - 6, y = this.h - h - 6;
    this.panel(x, y, w, h);
    lines.forEach((l, i) => this.text(l, x + 5, y + 2 + i * LINE_H, COL.green));
  }

  drawBanner() {
    const b = this.bannerData;
    if (!b) return;
    const fadeIn = Math.min(1, b.t / 0.6);
    const fadeOut = Math.min(1, (b.duration - b.t) / 1.0);
    this.ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
    const y = Math.max(Math.round(this.h * 0.22), this.topReserved + 4);
    this.text(b.title, this.w / 2, y, COL.gold, { align: 'center', scale: 2 });
    if (b.subtitle) this.text(b.subtitle, this.w / 2, y + 24, COL.text, { align: 'center' });
    this.ctx.globalAlpha = 1;
  }

  drawToasts() {
    let y = Math.max(Math.round(this.h * 0.44), this.topReserved + 46);
    const maxChars = Math.max(20, Math.floor((this.w - 24) / 6));
    for (const t of this.toasts) {
      const a = Math.min(1, t.t / 0.25, (t.duration - t.t) / 0.5);
      this.ctx.globalAlpha = Math.max(0, a);
      const lines = wrap(t.text.toUpperCase(), maxChars);
      const w = Math.max(...lines.map((l) => this.font.measure(l))) + 12;
      this.panel(Math.round(this.w / 2 - w / 2), y - 3, w, lines.length * LINE_H + 5);
      lines.forEach((l, i) => this.text(l, this.w / 2, y + i * LINE_H, COL.text, { align: 'center' }));
      y += lines.length * LINE_H + 8;
    }
    this.ctx.globalAlpha = 1;
  }
}
