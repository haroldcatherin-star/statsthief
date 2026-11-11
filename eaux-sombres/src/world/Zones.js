// Zones : détection de la zone courante, mélange progressif des ambiances,
// et « courants » qui empêchent d'aller dans les zones verrouillées.
import * as THREE from 'three';
import { ZONES, OPEN_SEA, WORLD } from '../../config/zones.js';
import { BALANCE } from '../../config/balance.js';
import { GLOBAL } from '../render/PS1Material.js';
import { bus } from '../core/EventBus.js';
import { smoothstep } from '../core/Random.js';

const COLORS = ['water', 'waterDeep', 'foam', 'seabed', 'fogTint'];
const SCALARS = ['fogScale', 'waveScale', 'waterOpacity'];

function toEnv(src) {
  const e = {};
  for (const c of COLORS) e[c] = new THREE.Color(src[c]);
  for (const s of SCALARS) e[s] = src[s];
  return e;
}

export class Zones {
  constructor(state) {
    this.state = state;
    this.zones = ZONES.map((z) => ({ ...z, envC: toEnv(z.env) }));
    this.open = { ...OPEN_SEA, envC: toEnv(OPEN_SEA.env) };
    this.env = toEnv(OPEN_SEA.env);
    this.current = null;
    this.boundary = 0;   // 0..1 : proximité de la limite navigable
  }

  isUnlocked(zone) {
    if (zone.available === false) return false;
    return !zone.requires || this.state.unlocks.includes(zone.requires);
  }

  zoneAt(x, z) {
    for (const zone of this.zones) {
      if (Math.hypot(x - zone.center[0], z - zone.center[1]) < zone.radius) return zone;
    }
    return this.open;
  }

  // Limite navigable actuelle : la zone de départ tant qu'aucune autre n'est débloquée.
  limit() {
    const start = this.zones[0];
    const remote = this.zones.slice(1).some((z) => this.isUnlocked(z));
    if (remote) return { cx: 0, cz: 0, r: WORLD.radius };
    return { cx: start.center[0], cz: start.center[1], r: start.radius + BALANCE.world.boundaryMargin };
  }

  // Repousse l'objet {x, z} dans la zone navigable. Renvoie true s'il a été bloqué.
  constrain(obj) {
    const L = this.limit();
    const dx = obj.x - L.cx, dz = obj.z - L.cz;
    const d = Math.hypot(dx, dz);
    if (d > L.r) {
      obj.x = L.cx + (dx / d) * L.r;
      obj.z = L.cz + (dz / d) * L.r;
      this.blockedBy = null;
      return true;
    }
    // Zones verrouillées : on ne peut pas y entrer.
    for (const zone of this.zones.slice(1)) {
      if (this.isUnlocked(zone)) continue;
      const zx = obj.x - zone.center[0], zz = obj.z - zone.center[1];
      const zd = Math.hypot(zx, zz);
      const lockR = zone.radius - 40;
      if (zd < lockR) {
        obj.x = zone.center[0] + (zx / zd) * lockR;
        obj.z = zone.center[1] + (zz / zd) * lockR;
        this.blockedBy = zone;
        return true;
      }
    }
    return false;
  }

  update(x, z) {
    // Mélange : on part de la pleine mer et on se rapproche de chaque zone.
    const e = this.env;
    const o = this.open.envC;
    for (const c of COLORS) e[c].copy(o[c]);
    for (const s of SCALARS) e[s] = o[s];
    for (const zone of this.zones) {
      const d = Math.hypot(x - zone.center[0], z - zone.center[1]);
      const w = 1 - smoothstep(zone.radius - zone.blend, zone.radius + zone.blend, d);
      if (w <= 0) continue;
      for (const c of COLORS) e[c].lerp(zone.envC[c], w);
      for (const s of SCALARS) e[s] += (zone.envC[s] - e[s]) * w;
    }

    // Brouillard qui s'épaissit à l'approche des courants (limite du monde ou zone verrouillée).
    const L = this.limit();
    const dl = Math.hypot(x - L.cx, z - L.cz);
    this.boundary = smoothstep(L.r - 140, L.r, dl);
    for (const zone of this.zones.slice(1)) {
      if (this.isUnlocked(zone)) continue;
      const zd = Math.hypot(x - zone.center[0], z - zone.center[1]);
      this.boundary = Math.max(this.boundary, 1 - smoothstep(zone.radius - 40, zone.radius + 100, zd));
    }
    e.fogScale *= 1 - 0.55 * this.boundary;
    e.waveScale *= 1 + 0.8 * this.boundary;

    GLOBAL.uWaterColor.value.copy(e.water);
    GLOBAL.uWaterDeep.value.copy(e.waterDeep);
    GLOBAL.uFoamColor.value.copy(e.foam);
    GLOBAL.uWaterOpacity.value = e.waterOpacity;
    GLOBAL.uWaveScale.value = e.waveScale;

    const zone = this.zoneAt(x, z);
    if (zone !== this.current) {
      const prev = this.current;
      this.current = zone;
      bus.emit('zone:enter', { zone, prev });
    }
  }
}
