// Menu générique rétro : onglets, liste défilante, panneau de détails, pied de page.
// Clavier : haut/bas (Z/S, flèches), onglets gauche/droite (Q/D, flèches), E/Entrée = valider, Échap = fermer.
// Souris : survol pour sélectionner, clic pour valider, clic sur un onglet.
import { LINE_H } from './PixelFont.js';

export const UI = {
  text: '#e8e0c8', dim: '#8a94a8', gold: '#ffd060', red: '#ff6a50', green: '#7ae08a',
  sel: 'rgba(90, 120, 170, 0.55)', line: '#b8985a',
};

const DETAIL_LINES = 4;

// Coupe un texte en lignes de maxChars caractères (aux espaces).
export function wrap(text, maxChars) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > maxChars) { out.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) out.push(line);
  return out;
}

export class ListMenu {
  constructor({ hud, input, audio }) {
    Object.assign(this, { hud, input, audio });
    this.open = false;
    this.tab = 0;
    this.sel = 0;
    this.scroll = 0;
    this.rowRects = [];
    this.tabRects = [];
    this.lastMouse = null;
    this.message = null;
  }

  // --- À surcharger ---
  get title() { return ''; }
  get toggleAction() { return null; }
  tabs() { return []; }
  rows() { return []; }
  details() { return []; }
  activate() {}
  onKey() {}
  footer() { return 'ÉCHAP : FERMER'; }
  drawExtra() { return 0; } // contenu au-dessus de la liste ; renvoie la hauteur utilisée

  // --- Fonctionnement ---
  show(tab) {
    this.open = true;
    if (tab !== undefined) this.tab = tab;
    this.resetSel();
    this.message = null;
    this.lastMouse = null;
    this.audio.play('menu');
  }

  close() {
    this.open = false;
    this.audio.play('menu');
  }

  resetSel() {
    const rows = this.rows();
    this.sel = Math.max(0, rows.findIndex((r) => !r.header));
    this.scroll = 0;
  }

  setTab(i) {
    this.tab = i;
    this.resetSel();
    this.audio.play('click');
  }

  move(rows, d) {
    let i = this.sel;
    for (let k = 0; k < rows.length; k++) {
      i = (i + d + rows.length) % rows.length;
      if (!rows[i].header) { this.sel = i; this.audio.play('click'); return; }
    }
  }

  flash(text, color = UI.text) {
    this.message = { text, color, t: performance.now() };
  }

  update(input) {
    if (!this.open) return;
    if (input.pressed('menu') || (this.toggleAction && input.pressed(this.toggleAction))) {
      this.close();
      return;
    }
    const tabs = this.tabs();
    if (tabs.length > 1) {
      if (input.pressed('left')) this.setTab((this.tab + tabs.length - 1) % tabs.length);
      if (input.pressed('right')) this.setTab((this.tab + 1) % tabs.length);
    }
    const rows = this.rows();
    if (this.sel >= rows.length || rows[this.sel]?.header) this.sel = Math.max(0, rows.findIndex((r) => !r.header));
    if (input.pressed('forward')) this.move(rows, -1);
    if (input.pressed('back')) this.move(rows, 1);

    // Souris (coordonnées de l'interface basse résolution)
    const s = this.hud.scale;
    const mx = input.mouse.x / s, my = input.mouse.y / s;
    const moved = !this.lastMouse || this.lastMouse[0] !== mx || this.lastMouse[1] !== my;
    this.lastMouse = [mx, my];
    const inside = (r) => mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h;
    if (input.leftClicked) {
      for (const r of this.tabRects) if (inside(r)) { this.setTab(r.i); return; }
    }
    for (const r of this.rowRects) {
      if (!inside(r)) continue;
      if (moved && this.sel !== r.i) this.sel = r.i;
      if (input.leftClicked) { this.sel = r.i; this.activate(rows[r.i]); return; }
    }
    if (input.pressed('interact') || input.pressed('confirm')) {
      const row = rows[this.sel];
      if (row && !row.header && !row.disabled) this.activate(row);
    }
    this.onKey(input, rows[this.sel]);
  }

  draw(hud) {
    if (!this.open) return;
    const W = Math.min(310, hud.w - 12);
    const x = Math.round((hud.w - W) / 2);
    const y = 6;
    const H = hud.h - 12;
    const c = hud.ctx;
    c.fillStyle = 'rgba(0, 0, 0, 0.55)';
    c.fillRect(0, 0, hud.w, hud.h);
    hud.panel(x, y, W, H, '#0c111c');
    hud.text(this.title, hud.w / 2, y + 4, UI.gold, { align: 'center' });

    // Onglets
    const tabs = this.tabs();
    let cy = y + 16;
    this.tabRects = [];
    if (tabs.length) {
      const widths = tabs.map((t) => hud.font.measure(t) + 8);
      let tx = Math.round(hud.w / 2 - widths.reduce((a, b) => a + b + 2, -2) / 2);
      tabs.forEach((t, i) => {
        const active = i === this.tab;
        if (active) {
          c.fillStyle = 'rgba(184, 152, 90, 0.35)';
          c.fillRect(tx, cy - 1, widths[i], LINE_H + 1);
        }
        hud.text(t, tx + 4, cy, active ? UI.gold : UI.dim);
        this.tabRects.push({ x: tx, y: cy - 1, w: widths[i], h: LINE_H + 1, i });
        tx += widths[i] + 2;
      });
      cy += LINE_H + 2;
    }
    c.fillStyle = UI.line;
    c.fillRect(x + 4, cy, W - 8, 1);
    cy += 4;

    cy += this.drawExtra(hud, x, cy, W);

    // Liste
    const rows = this.rows();
    const footerY = y + H - 12;
    const detailTop = footerY - DETAIL_LINES * LINE_H - 8;
    const visible = Math.max(1, Math.floor((detailTop - 3 - cy) / LINE_H));
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + visible) this.scroll = this.sel - visible + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, rows.length - visible)));
    this.rowRects = [];
    for (let k = 0; k < visible && this.scroll + k < rows.length; k++) {
      const i = this.scroll + k;
      const r = rows[i];
      const ry = cy + k * LINE_H;
      if (r.header) {
        hud.text(r.label, x + 6, ry, UI.line);
        continue;
      }
      if (i === this.sel) {
        c.fillStyle = UI.sel;
        c.fillRect(x + 3, ry - 1, W - 6, LINE_H);
        hud.text('>', x + 4, ry, UI.gold);
      }
      hud.text(r.label, x + 11, ry, r.disabled ? UI.dim : (r.color || UI.text));
      if (r.value !== undefined) hud.text(String(r.value), x + W - 6, ry, r.valueColor || UI.text, { align: 'right' });
      this.rowRects.push({ x: x + 3, y: ry - 1, w: W - 6, h: LINE_H, i });
    }
    if (this.scroll > 0) hud.text('^', x + W - 10, cy - 4, UI.dim);
    if (this.scroll + visible < rows.length) hud.text('V', x + W - 10, detailTop - LINE_H, UI.dim);

    // Détails
    c.fillStyle = UI.line;
    c.fillRect(x + 4, detailTop, W - 8, 1);
    const row = rows[this.sel];
    const raw = row && !row.header ? this.details(row) : [];
    const maxChars = Math.floor((W - 12) / 6);
    const lines = [];
    for (const [t, col] of raw) for (const part of wrap(String(t), maxChars)) lines.push([part, col]);
    lines.slice(0, DETAIL_LINES).forEach(([t, col], i) => hud.text(t, x + 6, detailTop + 4 + i * LINE_H, col || UI.text));

    // Message ou pied de page
    const msg = this.message && performance.now() - this.message.t < 2600 ? this.message : null;
    if (msg) hud.text(msg.text, hud.w / 2, footerY, msg.color, { align: 'center' });
    else hud.text(this.footer(), hud.w / 2, footerY, UI.dim, { align: 'center' });
  }
}
