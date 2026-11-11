// Le bateau du joueur : modèle low-poly, pilotage, flottaison sur la houle,
// collisions, lanterne et sillage d'écume.
import * as THREE from 'three';
import { BALANCE } from '../../config/balance.js';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { PointSprites } from '../render/PointSprites.js';
import { GLOBAL } from '../render/PS1Material.js';
import { bus } from '../core/EventBus.js';
import { clamp } from '../core/Random.js';
import { boatStats } from '../systems/Upgrades.js';
import { buildCenterConsole, addHullName, BOAT_SPECS } from './BoatModels.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Sections de coque, de la poupe à la proue (proue vers +Z local) :
// z, demi-largeur pont, hauteur pont, demi-largeur bouchain, hauteur bouchain, hauteur quille
const SECTIONS = [
  [-2.9, 1.05, 0.55, 0.95, -0.15, -0.45],
  [-1.6, 1.2, 0.58, 1.08, -0.2, -0.62],
  [0.2, 1.22, 0.62, 1.05, -0.2, -0.68],
  [1.6, 1.02, 0.72, 0.7, -0.12, -0.58],
  [2.7, 0.5, 0.86, 0.22, 0.05, -0.32],
];

export function buildHull(b, c) {
  const S = SECTIONS.map(([z, dw, dy, cw, cy, ky]) => ({
    dl: V(dw, dy, z), dr: V(-dw, dy, z), cl: V(cw, cy, z), cr: V(-cw, cy, z), k: V(0, ky, z),
  }));
  const TIP = V(0, 0.98, 3.45);
  const STEM = V(0, -0.08, 3.3);
  for (let i = 0; i < S.length - 1; i++) {
    const A = S[i], B = S[i + 1];
    const zc = (A.k.z + B.k.z) / 2;
    const ins = V(0, 0.1, zc);
    b.quadOut('paint', A.dl, B.dl, B.cl, A.cl, c.top, ins);
    b.quadOut('paint', A.dr, B.dr, B.cr, A.cr, c.top, ins);
    b.quadOut('paint', A.cl, B.cl, B.k, A.k, c.bottom, ins);
    b.quadOut('paint', A.cr, B.cr, B.k, A.k, c.bottom, ins);
    b.quadOut('wood', A.dl, B.dl, B.dr, A.dr, c.deck, V(0, -1, zc));
  }
  const last = S[S.length - 1];
  const ins = V(0, 0.1, 3.0);
  b.quadOut('paint', last.dl, TIP, STEM, last.cl, c.top, ins);
  b.quadOut('paint', last.dr, TIP, STEM, last.cr, c.top, ins);
  b.triOut('paint', last.cl, STEM, last.k, c.bottom, ins);
  b.triOut('paint', last.cr, STEM, last.k, c.bottom, ins);
  b.triOut('wood', last.dl, TIP, last.dr, c.deck, V(0, -1, 3));
  const s0 = S[0];
  const insT = V(0, 0.1, -2);
  b.triOut('paint', s0.dl, s0.cl, s0.k, c.top, insT);
  b.triOut('paint', s0.dl, s0.k, s0.dr, c.top, insT);
  b.triOut('paint', s0.dr, s0.k, s0.cr, c.top, insT);
  return S;
}

function buildBoatModel() {
  let seed = 3;
  const b = new MeshBuilder({ rng: () => ((seed = (seed * 16807) % 2147483647) / 2147483647) });
  const S = buildHull(b, { top: 0x2c4c78, bottom: 0xa83228, deck: 0xb89060 });

  // Bastingage
  for (const side of ['dl', 'dr']) {
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i][side].clone().add(V(0, 0.35, 0));
      const c = S[i + 1][side].clone().add(V(0, 0.35, 0));
      b.tube('metal', a, c, 0.035, 0.035, 4, 0xd0d0d0);
      b.tube('metal', S[i][side], a, 0.03, 0.03, 4, 0xd0d0d0);
    }
  }
  // Cabine
  b.box('paint', [0, 1.35, -0.6], [1.7, 1.5, 1.9], 0xe6e2d6);
  b.box('paint', [0, 2.16, -0.6], [1.95, 0.12, 2.25], 0x4a6a8a);
  b.box('window', [0, 1.65, 0.36], [1.3, 0.45, 0.04], 0xffffff);
  b.box('window', [0.86, 1.65, -0.6], [0.04, 0.45, 1.2], 0xffffff);
  b.box('window', [-0.86, 1.65, -0.6], [0.04, 0.45, 1.2], 0xffffff);
  b.box('wood', [0, 1.2, -1.56], [0.7, 1.1, 0.04], 0x5a3a24);
  // Mât, radar, lanterne
  b.tube('metal', [0, 2.2, -0.9], [0, 3.6, -0.9], 0.05, 0.05, 4, 0x9a9a9a);
  b.box('metal', [0, 3.2, -0.9], [0.8, 0.06, 0.06], 0x9a9a9a);
  b.box('window', [0, 3.68, -0.9], [0.2, 0.2, 0.2], 0xffffff);
  // Pont arrière : caisse, moteur, défenses
  b.box('wood', [0, 0.85, -2.2], [1.2, 0.5, 0.7], 0x7a5a3a);
  b.box('metal', [0, 0.55, -3.15], [0.5, 0.9, 0.45], 0x30343a);
  b.box('paint', [0, 1.05, -3.1], [0.55, 0.35, 0.55], 0xc83a2a);
  for (const x of [-1.22, 1.22]) b.cylinder('paint', [x, 0.25, 0.6], 0.14, 0.14, 0.5, 6, 0xf0f0f0);

  return b.build();
}

// Sillage : particules d'écume qui flottent et s'estompent.
class Wake {
  constructor(scene, ocean) {
    this.ocean = ocean;
    this.sprites = new PointSprites(scene, 220, { additive: false, soft: false, fogAmount: 1, renderOrder: 2 });
    this.parts = [];
    for (let i = 0; i < 220; i++) {
      this.parts.push({ active: false, x: 0, z: 0, vx: 0, vz: 0, age: 0, life: 1, idx: this.sprites.add(0, -100, 0, 0xe6f2f2, 0.3, 0, 0) });
    }
    this.next = 0;
    this.timer = 0;
  }

  spawn(x, z, vx, vz, life) {
    const p = this.parts[this.next];
    this.next = (this.next + 1) % this.parts.length;
    Object.assign(p, { active: true, x, z, vx, vz, age: 0, life });
  }

  update(dt, boat) {
    const sp = Math.abs(boat.speed);
    if (sp > 1) {
      this.timer += dt * sp;
      const s = Math.sin(boat.heading), c = Math.cos(boat.heading);
      while (this.timer > 0.55) {
        this.timer -= 0.55;
        for (const side of [-1, 1]) {
          // coin arrière (selon le modèle)
          const lx = side * boat.spec.sternHalf, lz = boat.spec.stern;
          const x = boat.x + lx * c + lz * s;
          const z = boat.z - lx * s + lz * c;
          const out = side * 0.9;
          this.spawn(x, z, out * c - 0.3 * s, -out * s - 0.3 * c, 2.6 + Math.random());
        }
        if (sp > 4 && Math.random() < 0.5) { // gerbe d'étrave
          const side = Math.random() < 0.5 ? -1 : 1;
          const lx = side * 0.6, lz = boat.spec.bow;
          this.spawn(boat.x + lx * c + lz * s, boat.z - lx * s + lz * c, side * 1.5 * c, -side * 1.5 * s, 1.2);
        }
      }
    }
    for (const p of this.parts) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this.sprites.setAlpha(p.idx, 0);
        continue;
      }
      const damp = Math.exp(-dt * 1.2);
      p.vx *= damp; p.vz *= damp;
      p.x += p.vx * dt; p.z += p.vz * dt;
      const t = p.age / p.life;
      this.sprites.setPos(p.idx, p.x, this.ocean.heightAt(p.x, p.z) + 0.08, p.z);
      this.sprites.setAlpha(p.idx, (1 - t) * 0.85);
      this.sprites.setSize(p.idx, 0.2 + p.age * 0.14);
    }
    this.sprites.update();
  }
}

const LAMP_MODES = ['auto', 'on', 'off'];
export const LAMP_LABELS = { auto: 'AUTO', on: 'ALLUMÉE', off: 'ÉTEINTE' };

export class Boat {
  // model : 'trawler' | 'center_console' ; name : nom peint sur la coque
  constructor(scene, state, ocean, glows, model = BALANCE.boat.model, name = BALANCE.boat.name) {
    this.cfg = BALANCE.boat;
    this.state = state;
    this.ocean = ocean;
    this.glows = glows;
    this.x = state.boat.x;
    this.z = state.boat.z;
    this.heading = state.boat.heading;
    this.speed = 0;
    this.steer = 0;
    this.y = 0;
    this.pitch = 0;
    this.roll = 0;
    this.bumpCooldown = 0;

    this.spec = BOAT_SPECS[model] || BOAT_SPECS.trawler;
    this.group = model === 'center_console' ? buildCenterConsole() : buildBoatModel();
    addHullName(this.group, name, { z: this.spec.nameZ, x: this.spec.nameX, y: this.spec.nameY });
    this.group.rotation.order = 'YXZ';
    scene.add(this.group);

    this.lampMode = 'auto';
    this.lampOn = false;
    this.lampLocal = V(...this.spec.lamp);
    this.lampWorld = V(0, 0, 0);
    this.lampGlow = glows.add(0, 0, 0, 0xffd090, 1.0, 0, 0);
    this.lampColor = new THREE.Color(1.0, 0.75, 0.45);

    this.wake = new Wake(scene, ocean);
  }

  cycleLamp() {
    this.lampMode = LAMP_MODES[(LAMP_MODES.indexOf(this.lampMode) + 1) % LAMP_MODES.length];
    return LAMP_LABELS[this.lampMode];
  }

  get knots() {
    return Math.abs(this.speed) * 1.944;
  }

  // Remet le bateau à quai (remorquage, chargement).
  teleport(x, z, heading) {
    this.x = x; this.z = z; this.heading = heading;
    this.speed = 0;
    this.state.boat = { x, z, heading };
  }

  update(dt, input, world) {
    const cfg = this.cfg;
    const st = this.stats = boatStats(this.state);
    const hasFuel = this.state.fuel > 0;
    const maxSpeed = hasFuel ? st.maxSpeed : cfg.noFuelSpeed;
    const accel = hasFuel ? st.acceleration : 1.0;

    // --- Moteur ---
    const thr = (input.down('forward') ? 1 : 0) - (input.down('back') ? 1 : 0);
    if (thr > 0) this.speed += accel * dt;
    else if (thr < 0) this.speed -= (this.speed > 0 ? cfg.brake : accel * 0.6) * dt;
    this.speed -= this.speed * cfg.drag * dt * (thr === 0 ? 1.6 : 1);
    this.speed = clamp(this.speed, -cfg.reverseSpeed, Math.max(maxSpeed, Math.min(this.speed, st.maxSpeed)));
    if (this.speed > maxSpeed) this.speed -= (this.speed - maxSpeed) * Math.min(1, dt * 0.8);
    if (thr === 0 && Math.abs(this.speed) < 0.05) this.speed = 0;

    // --- Carburant : consommation selon les gaz et la vitesse ---
    if (hasFuel) {
      const load = Math.abs(thr) * (0.3 + 0.7 * Math.abs(this.speed) / st.maxSpeed) + cfg.idleFuel;
      const before = this.state.fuel;
      this.state.fuel = Math.max(0, before - st.consumption * load * dt);
      if (before > st.tank * 0.2 && this.state.fuel <= st.tank * 0.2) bus.emit('boat:lowfuel');
      if (this.state.fuel === 0) bus.emit('boat:nofuel');
    }

    // --- Froid : la coque s'use lentement (sauf coque adaptée) ---
    if (world.cold && this.state.hull > 0) {
      const wear = (BALANCE.cold.hullWearPerMinute / 60) * (1 - st.coldResist) * dt;
      if (wear > 0) {
        const before = this.state.hull;
        this.state.hull = Math.max(0, before - wear);
        if (before > st.maxHull * 0.3 && this.state.hull <= st.maxHull * 0.3) bus.emit('boat:lowhull');
        if (this.state.hull <= 0) bus.emit('boat:sunk');
      }
    }

    // --- Gouvernail ---
    const steerIn = (input.down('left') ? 1 : 0) - (input.down('right') ? 1 : 0);
    this.steer += (steerIn - this.steer) * Math.min(1, dt * 5);
    const authority = Math.max(cfg.minTurnFactor, Math.min(1, Math.abs(this.speed) / (st.maxSpeed * 0.4)));
    const dir = this.speed < -0.2 ? -1 : 1;
    this.heading += cfg.turnRate * this.steer * authority * dir * dt;

    const s = Math.sin(this.heading), c = Math.cos(this.heading);
    this.x += s * this.speed * dt;
    this.z += c * this.speed * dt;

    // --- Collisions (cercles) ---
    this.bumpCooldown -= dt;
    for (const col of world.colliders) {
      const dx = this.x - col.x, dz = this.z - col.z;
      const min = col.r + cfg.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.001;
      const nx = dx / d, nz = dz / d;
      this.x = col.x + nx * min;
      this.z = col.z + nz * min;
      const vn = (s * nx + c * nz) * this.speed;
      if (vn < -0.4) {
        if (this.bumpCooldown <= 0) {
          const impact = -vn;
          let damage = 0;
          if (impact > cfg.minBumpImpact) {
            damage = (impact - cfg.minBumpImpact) * cfg.bumpDamage * (1 - st.armor);
            this.state.hull = Math.max(0, this.state.hull - damage);
          }
          bus.emit('boat:bump', { impact, damage, hull: this.state.hull, maxHull: st.maxHull });
          if (this.state.hull <= 0) bus.emit('boat:sunk');
          this.bumpCooldown = 0.6;
        }
        this.speed *= -0.25;
      }
    }

    // --- Limite des zones verrouillées ---
    if (world.zones.constrain(this)) {
      this.speed *= Math.pow(0.15, dt);
      bus.emit('boat:blocked');
    }

    // --- Flottaison : on échantillonne la houle à la proue, poupe, bâbord, tribord ---
    const L = this.spec.length * 0.45, W = this.spec.width * 0.45;
    const o = this.ocean;
    const hb = o.heightAt(this.x + s * L, this.z + c * L);
    const hs = o.heightAt(this.x - s * L, this.z - c * L);
    const hl = o.heightAt(this.x + c * W, this.z - s * W);
    const hr = o.heightAt(this.x - c * W, this.z + s * W);
    const k = 1 - Math.exp(-dt * cfg.bobSmoothing);
    const speedK = this.speed / st.maxSpeed;
    this.y += ((hb + hs + hl + hr) / 4 + cfg.floatOffset - this.y) * k;
    this.pitch += (-Math.atan2(hb - hs, 2 * L) - speedK * 0.08 - this.pitch) * k;
    this.roll += (Math.atan2(hl - hr, 2 * W) - this.steer * speedK * 0.08 - this.roll) * k;

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.set(this.pitch, this.heading, this.roll);
    this.group.updateMatrixWorld();

    // --- Lanterne ---
    const night = GLOBAL.uNight.value;
    this.lampOn = this.lampMode === 'on' || (this.lampMode === 'auto' && night > 0.4);
    this.lampWorld.copy(this.lampLocal);
    this.group.localToWorld(this.lampWorld);
    GLOBAL.uLampPos.value.copy(this.lampWorld);
    GLOBAL.uLampColor.value.copy(this.lampColor).multiplyScalar(this.lampOn ? 1.3 * st.lampIntensity : 0);
    GLOBAL.uLampRange.value = st.lampRange;
    this.glows.setPos(this.lampGlow, this.lampWorld.x, this.lampWorld.y, this.lampWorld.z);
    this.glows.setAlpha(this.lampGlow, this.lampOn ? 1 : 0);

    this.wake.update(dt, this);

    this.state.boat.x = this.x;
    this.state.boat.z = this.z;
    this.state.boat.heading = this.heading;
  }
}
