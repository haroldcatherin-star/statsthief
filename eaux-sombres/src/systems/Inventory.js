// Cale en grille : chaque poisson occupe un rectangle selon sa taille.
// Placement automatique (avec rotation) ; si ça ne rentre pas, on réorganise tout.
import { FISH } from '../../config/fish.js';
import { BALANCE } from '../../config/balance.js';
import { bus } from '../core/EventBus.js';
import { boatStats } from './Upgrades.js';

export function shapeFor(fish) {
  const eel = FISH[fish.id].look.tail === 'eel';
  const table = eel ? BALANCE.hold.eelShapes : BALANCE.hold.shapes;
  for (const [max, wh] of table) if (fish.size <= max) return wh;
  return table[table.length - 1][1];
}

// Essaie de placer une liste de rectangles ; renvoie les positions ou null.
function pack(items, cols, rows, keepExisting) {
  const grid = new Uint8Array(cols * rows);
  const free = (x, y, w, h) => {
    if (x + w > cols || y + h > rows) return false;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (grid[j * cols + i]) return false;
    return true;
  };
  const mark = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * cols + i] = 1;
  };
  const out = [];
  for (const it of items) {
    if (keepExisting && it.x !== undefined && free(it.x, it.y, it.w, it.h)) {
      mark(it.x, it.y, it.w, it.h);
      out.push({ x: it.x, y: it.y, w: it.w, h: it.h });
      continue;
    }
    let placed = null;
    const shapes = it.w === it.h ? [[it.w, it.h]] : [[it.w, it.h], [it.h, it.w]];
    for (let y = 0; y < rows && !placed; y++) {
      for (let x = 0; x < cols && !placed; x++) {
        for (const [w, h] of shapes) {
          if (free(x, y, w, h)) { placed = { x, y, w, h }; break; }
        }
      }
    }
    if (!placed) return null;
    mark(placed.x, placed.y, placed.w, placed.h);
    out.push(placed);
  }
  return out;
}

export class Inventory {
  constructor(state) {
    this.state = state;
  }

  get items() { return this.state.hold; }
  get count() { return this.state.hold.length; }
  get cols() { return boatStats(this.state).holdCols; }
  get rows() { return boatStats(this.state).holdRows; }
  get totalCells() { return this.cols * this.rows; }
  get usedCells() { return this.state.hold.reduce((s, f) => s + f.w * f.h, 0); }
  get full() { return this.usedCells >= this.totalCells; }
  get totalValue() { return this.state.hold.reduce((s, f) => s + f.value, 0); }

  // Calcule le placement de la cale + un nouveau poisson (sans rien modifier).
  plan(fish) {
    const [w, h] = shapeFor(fish);
    const nu = { ...fish, w, h, x: undefined, y: undefined };
    const existing = this.state.hold;
    let pos = pack([...existing, nu], this.cols, this.rows, true);
    if (pos) return { items: [...existing, nu], pos };
    // Réorganisation complète : les plus gros d'abord.
    const all = [...existing, nu].sort((a, b) => b.w * b.h - a.w * a.h);
    pos = pack(all, this.cols, this.rows, false);
    return pos ? { items: all, pos } : null;
  }

  canFit(fish) {
    return !!this.plan(fish);
  }

  add(fish) {
    const p = this.plan(fish);
    if (!p) return false;
    this.state.hold = p.items.map((it, i) => {
      const { id, size, weight, value } = it;
      return { id, size, weight, value, ...p.pos[i] };
    });
    bus.emit('hold:changed', this.state.hold);
    return true;
  }

  remove(index) {
    const [it] = this.state.hold.splice(index, 1);
    bus.emit('hold:changed', this.state.hold);
    return it;
  }

  clear() {
    const items = this.state.hold.splice(0);
    bus.emit('hold:changed', this.state.hold);
    return items;
  }
}
