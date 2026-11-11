// La cale : grille avec la place occupée par chaque poisson ; on peut jeter un poisson à la mer.
import { FISH } from '../../config/fish.js';
import { ListMenu, UI } from './ListMenu.js';
import { ICON, LINE_H } from './PixelFont.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class HoldMenu extends ListMenu {
  constructor(deps) {
    super(deps);
    Object.assign(this, { inventory: deps.inventory, economy: deps.economy });
  }

  get title() {
    return `CALE · ${this.inventory.usedCells}/${this.inventory.totalCells} CASES`;
  }
  get toggleAction() { return 'hold'; }

  rows() {
    if (!this.inventory.count) return [{ header: true, label: 'LA CALE EST VIDE. ALLEZ PÊCHER !' }];
    return this.inventory.items.map((f, i) => ({
      label: `${FISH[f.id].name} ${f.size} CM`,
      value: `~${this.economy.priceOf(f)} ${ICON.coin}`,
      i, fish: f,
    }));
  }

  details(row) {
    const f = row.fish;
    return [
      [FISH[f.id].name, UI.gold],
      [`${f.size} CM · ${f.weight.toFixed(1)} KG · OCCUPE ${f.w}×${f.h}`],
      [`VALEUR ESTIMÉE AU PORT : ${this.economy.priceOf(f)} ${ICON.coin}`, UI.dim],
    ];
  }

  onKey(input, row) {
    if (row && row.fish && input.pressed('discard')) {
      this.inventory.remove(row.i);
      this.audio.play('splash', { size: 0.5 });
      this.flash(`${FISH[row.fish.id].name} rejeté à la mer.`, UI.dim);
      this.resetSel();
    }
  }

  footer() {
    return `${this.input.label('discard')} : JETER À LA MER · ÉCHAP : FERMER`;
  }

  drawExtra(hud, x, y, W) {
    const inv = this.inventory;
    const cols = inv.cols, rows = inv.rows;
    const maxH = Math.max(40, Math.floor((hud.h - 12) * 0.38));
    const cs = Math.max(6, Math.min(16, Math.floor((W - 16) / cols), Math.floor(maxH / rows)));
    const gw = cs * cols, gh = cs * rows;
    const gx = Math.round(x + (W - gw) / 2);
    const c = hud.ctx;
    c.fillStyle = '#10141c';
    c.fillRect(gx - 1, y - 1, gw + 2, gh + 2);
    c.fillStyle = '#232a36';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) c.fillRect(gx + i * cs + 1, y + j * cs + 1, cs - 2, cs - 2);
    const rowsList = this.rows();
    const selFish = rowsList[this.sel]?.fish;
    inv.items.forEach((f) => {
      const fx = gx + f.x * cs, fy = y + f.y * cs;
      c.fillStyle = hex(FISH[f.id].look.body);
      c.fillRect(fx + 1, fy + 1, f.w * cs - 2, f.h * cs - 2);
      c.fillStyle = hex(FISH[f.id].look.belly);
      c.fillRect(fx + 1, fy + f.h * cs - 3, f.w * cs - 2, 2);
      if (cs >= 10) hud.text(ICON.fish, fx + 2, fy + Math.floor((f.h * cs - 10) / 2) - 1, '#ffffff', { shadow: true });
      if (f === selFish) {
        c.fillStyle = UI.gold;
        c.fillRect(fx, fy, f.w * cs, 1);
        c.fillRect(fx, fy + f.h * cs - 1, f.w * cs, 1);
        c.fillRect(fx, fy, 1, f.h * cs);
        c.fillRect(fx + f.w * cs - 1, fy, 1, f.h * cs);
      }
    });
    return gh + 6 + (LINE_H - LINE_H);
  }
}
