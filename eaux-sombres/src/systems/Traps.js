// Casiers et filets : on les pose en mer, ils se remplissent avec le temps de jeu,
// on revient les relever. Les filets se déchirent s'ils restent trop longtemps.
import { BALANCE } from '../../config/balance.js';
import { FISH } from '../../config/fish.js';
import { WORLD } from '../../config/zones.js';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { bus } from '../core/EventBus.js';
import { boatStats } from './Upgrades.js';
import { recordCatch } from './Journal.js';

export const PASSIVE_NAMES = { trap: 'casier', net: 'filet' };

function buildMarker(kind) {
  const b = new MeshBuilder({ jitter: 0 });
  if (kind === 'trap') {
    b.cylinder('paint', [0, 0.1, 0], 0.35, 0.4, 0.5, 6, 0xe8c020);
    b.tube('metal', [0, 0.3, 0], [0, 1.6, 0], 0.04, 0.04, 4, 0x505050);
    b.box('paint', [0.22, 1.45, 0], [0.4, 0.25, 0.03], 0xd83020);
  } else {
    for (const x of [-1.2, 1.2]) b.ico('paint', [x, 0.05, 0], 0.3, 0xf07020, { jitter: 0.1 });
    b.tube('metal', [-1.2, 0.05, 0], [1.2, 0.05, 0], 0.03, 0.03, 3, 0xd8d0b0);
    b.tube('metal', [1.2, 0.2, 0], [1.2, 1.3, 0], 0.03, 0.03, 3, 0x505050);
    b.box('paint', [1.38, 1.18, 0], [0.32, 0.22, 0.03], 0xf0f0f0);
  }
  return b.build();
}

export class Traps {
  // deps : state, ocean, glows, zones, spawner, inventory, clock, hud, audio, scene
  constructor(deps) {
    Object.assign(this, deps);
    this.models = new Map();
    // Réserve de lumières (une par marqueur posé).
    this.freeGlows = [];
    for (let i = 0; i < 12; i++) this.freeGlows.push(this.glows.add(0, -100, 0, 0xffe080, 0.9, 0, 1));
    for (const t of this.state.traps) this.spawnModel(t);
  }

  get list() { return this.state.traps; }

  owned(kind) {
    const s = boatStats(this.state);
    return kind === 'trap' ? s.traps : s.nets;
  }

  placed(kind) { return this.list.filter((t) => t.kind === kind).length; }

  cfg(kind) { return kind === 'trap' ? BALANCE.traps : BALANCE.nets; }

  spawnModel(t) {
    const g = buildMarker(t.kind);
    g.position.set(t.x, 0, t.z);
    g.rotation.y = t.rot || 0;
    this.scene.add(g);
    const glow = this.freeGlows.pop();
    this.models.set(t.id, { g, glow });
  }

  removeModel(t) {
    const m = this.models.get(t.id);
    if (!m) return;
    this.scene.remove(m.g);
    if (m.glow !== undefined) {
      this.glows.setAlpha(m.glow, 0);
      this.freeGlows.push(m.glow);
    }
    this.models.delete(t.id);
  }

  // Renvoie un message d'erreur, ou null si c'est possible.
  canPlace(kind, boat) {
    const name = PASSIVE_NAMES[kind];
    if (this.owned(kind) === 0) return `Vous n'avez pas de ${name}. Achetez-en au port (onglet Bateau).`;
    if (this.placed(kind) >= this.owned(kind)) return `Tous vos ${name}s sont déjà en mer.`;
    if (Math.abs(boat.speed) > 1.5) return `Ralentissez pour poser un ${name}.`;
    if (Math.hypot(boat.x - WORLD.port.x, boat.z - WORLD.port.z) < 110) return 'Trop près du port.';
    const C = BALANCE.traps;
    if (this.list.some((t) => Math.hypot(t.x - boat.x, t.z - boat.z) < C.minSpacing)) return 'Trop près d\'un autre casier ou filet.';
    return null;
  }

  place(kind, boat) {
    const err = this.canPlace(kind, boat);
    if (err) { this.hud.toast(err, 3); return false; }
    // On le pose à l'arrière du bateau.
    const s = Math.sin(boat.heading), c = Math.cos(boat.heading);
    const x = boat.x - s * 4.5, z = boat.z - c * 4.5;
    const now = this.clock.totalHours;
    const t = {
      id: `${kind}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      kind, x, z, rot: boat.heading,
      zone: this.zones.zoneAt(x, z).id,
      placed: now, last: now, catches: [], torn: false,
    };
    this.list.push(t);
    this.spawnModel(t);
    this.audio.play('splash', { size: 0.6 });
    const hint = kind === 'trap' ? 'Revenez dans quelques heures.' : `Relevez-le avant ${this.cfg('net').lifetimeHours} h, sinon il se déchire.`;
    this.hud.toast(`${kind === 'trap' ? 'Casier' : 'Filet'} posé. ${hint}`, 4);
    bus.emit('traps:changed');
    return true;
  }

  nearest(boat) {
    let best = null, bestD = BALANCE.traps.pickupRange;
    for (const t of this.list) {
      const d = Math.hypot(t.x - boat.x, t.z - boat.z);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  retrieve(t) {
    const name = t.kind === 'trap' ? 'Casier' : 'Filet';
    if (t.torn) {
      this.hud.toast('Le filet est déchiré... Les prises se sont échappées.', 4);
    } else {
      const kept = [];
      let moved = 0, news = 0;
      for (const c of t.catches) {
        if (this.inventory.add(c)) {
          moved++;
          if (recordCatch(this.state, c)) news++;
          this.state.stats.caught++;
        } else kept.push(c);
      }
      t.catches = kept;
      if (kept.length) {
        this.hud.toast(`Cale pleine : ${kept.length} prise(s) restent dans le ${name.toLowerCase()}.`, 4);
        this.audio.play('stow');
        bus.emit('traps:changed');
        return;
      }
      const msg = moved ? `${name} relevé : ${moved} prise(s)${news ? ` dont ${news} nouvelle(s) espèce(s) !` : '.'}` : `${name} relevé : vide.`;
      this.hud.toast(msg, 4);
      this.audio.play(moved ? 'catch' : 'reelin');
    }
    this.removeModel(t);
    this.state.traps = this.list.filter((x) => x !== t);
    bus.emit('traps:changed');
  }

  // Remplissage selon le temps de jeu écoulé.
  simulate() {
    const now = this.clock.totalHours;
    for (const t of this.list) {
      const cfg = this.cfg(t.kind);
      while (now - t.last >= cfg.hoursPerRoll) {
        t.last += cfg.hoursPerRoll;
        if (t.torn) continue;
        if (t.kind === 'net' && t.last - t.placed > cfg.lifetimeHours) {
          t.torn = true;
          t.catches = [];
          continue;
        }
        if (t.catches.length >= cfg.capacity || Math.random() > cfg.chancePerRoll) continue;
        const id = this.spawner.pickPassive(t.zone, t.kind);
        if (id) t.catches.push(this.spawner.createCatch(id, { zone: t.zone, phase: this.clock.phase, day: this.clock.day }));
      }
    }
  }

  isFull(t) { return t.catches.length >= this.cfg(t.kind).capacity; }

  update(time) {
    this.simulate();
    for (const t of this.list) {
      const m = this.models.get(t.id);
      if (!m) continue;
      const y = this.ocean.heightAt(t.x, t.z);
      m.g.position.y = y - 0.05;
      m.g.rotation.x = Math.sin(time * 1.4 + t.x) * 0.1;
      m.g.rotation.z = Math.cos(time * 1.2 + t.z) * 0.1;
      if (m.glow !== undefined) {
        const lx = t.kind === 'trap' ? 0 : 1.2;
        const s = Math.sin(t.rot || 0), c = Math.cos(t.rot || 0);
        this.glows.setPos(m.glow, t.x + lx * c, y + 1.6, t.z - lx * s);
        // Clignote plus vite quand il est plein.
        const rate = this.isFull(t) ? 4 : 1.2;
        this.glows.setAlpha(m.glow, Math.sin(time * rate + t.x) > 0.2 ? 1 : 0.2);
      }
    }
  }

  // Repères pour la boussole.
  markers() {
    return this.list.map((t) => ({ x: t.x, z: t.z, full: this.isFull(t) || t.torn, kind: t.kind }));
  }

  describe(t) {
    const name = t.kind === 'trap' ? 'CASIER' : 'FILET';
    if (t.torn) return `${name} DÉCHIRÉ`;
    const n = t.catches.length;
    return `${name} : ${n} PRISE${n > 1 ? 'S' : ''}${this.isFull(t) ? ' (PLEIN)' : ''}`;
  }
}

export function speciesName(id) { return FISH[id]?.name || id; }
