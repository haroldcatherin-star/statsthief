// Pêche à la canne : machine à états
//  IDLE → AIMING (jauge) → CASTING → WAITING (touches) → BITE (ferrer !) → FIGHT → CAUGHT
//  (RETRIEVE = la ligne remonte après une annulation ou un échec)
import * as THREE from 'three';
import { BALANCE } from '../../config/balance.js';
import { FISH } from '../../config/fish.js';
import { RODS, REELS, LINES, BAITS } from '../../config/gear.js';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { PointSprites } from '../render/PointSprites.js';
import { createPS1Material } from '../render/PS1Material.js';
import { getFishModel } from '../entities/FishModels.js';
import { buildFisher, HAND } from '../entities/Fisher.js';
import { recordCatch } from './Journal.js';
import { bus } from '../core/EventBus.js';
import { wrapAngle } from '../core/Random.js';

export const S = {
  IDLE: 'idle',
  AIMING: 'aiming',
  CASTING: 'casting',
  WAITING: 'waiting',
  BITE: 'bite',
  FIGHT: 'fight',
  CAUGHT: 'caught',
  RETRIEVE: 'retrieve',
  DRILL: 'drill',      // pêche sur glace : on perce le trou
};

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const ROD_LEN = 3.2;
const LINE_PTS = 14;

// Gerbes d'eau (particules avec gravité).
class Splashes {
  constructor(scene, ocean) {
    this.ocean = ocean;
    this.sprites = new PointSprites(scene, 140, { additive: false, soft: false, fogAmount: 1, renderOrder: 2 });
    this.parts = [];
    for (let i = 0; i < 140; i++) this.parts.push({ active: false, idx: this.sprites.add(0, -100, 0, 0xeef6f6, 0.14, 0, 0) });
    this.next = 0;
  }

  burst(x, z, n = 10, power = 1) {
    const y = this.ocean.heightAt(x, z);
    for (let i = 0; i < n; i++) {
      const p = this.parts[this.next];
      this.next = (this.next + 1) % this.parts.length;
      const a = Math.random() * Math.PI * 2, h = rand(0.3, 1.3) * power;
      Object.assign(p, {
        active: true, x, y, z, age: 0, life: rand(0.5, 0.9),
        vx: Math.cos(a) * h, vz: Math.sin(a) * h, vy: rand(2, 4) * power,
      });
    }
  }

  update(dt) {
    for (const p of this.parts) {
      if (!p.active) continue;
      p.age += dt;
      p.vy -= 9.8 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.age > p.life || (p.vy < 0 && p.y < this.ocean.heightAt(p.x, p.z) - 0.1)) {
        p.active = false;
        this.sprites.setAlpha(p.idx, 0);
        continue;
      }
      this.sprites.setPos(p.idx, p.x, p.y, p.z);
      this.sprites.setAlpha(p.idx, 0.9 * (1 - p.age / p.life));
    }
    this.sprites.update();
  }
}

function buildRod() {
  const b = new MeshBuilder({ jitter: 0 });
  b.tube('wood', [0, 0, 0], [0, 0, 0.55], 0.05, 0.045, 5, 0xb08850);
  b.tube('metal', [0, 0, 0.55], [0, 0, ROD_LEN], 0.03, 0.012, 4, 0x2a2a30);
  b.box('metal', [0, -0.1, 0.35], [0.12, 0.12, 0.14], 0x8a8a90);
  b.box('metal', [0.08, -0.1, 0.35], [0.03, 0.08, 0.03], 0xd0d0d0);
  for (const z of [1.2, 2.0, 2.7]) b.box('metal', [0, -0.04, z], [0.03, 0.06, 0.03], 0xd0d0d0);
  return b.build();
}

function buildBobber() {
  const b = new MeshBuilder({ jitter: 0 });
  b.ico('paint', [0, 0.06, 0], 0.12, 0xd83020, { jitter: 0.05 });
  b.ico('paint', [0, -0.05, 0], 0.11, 0xf0f0f0, { jitter: 0.05 });
  b.tube('metal', [0, 0.1, 0], [0, 0.32, 0], 0.015, 0.015, 3, 0xd83020);
  return b.build();
}

export class Fishing {
  // deps : state, ocean, boat, rig, world, audio, spawner, inventory, hud, zones, clock
  constructor(scene, deps) {
    Object.assign(this, deps);
    this.scene = scene;
    this.mode = S.IDLE;
    this.t = 0;
    this.cfg = BALANCE.fishing;

    this.rod = buildRod();
    this.rod.rotation.order = 'YXZ';
    this.rod.visible = false;
    scene.add(this.rod);

    this.bobber = buildBobber();
    this.bobber.visible = false;
    scene.add(this.bobber);

    const lg = new THREE.BufferGeometry();
    this.linePos = new Float32Array(LINE_PTS * 3);
    lg.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xe8e4d0, transparent: true, opacity: 0.7 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);

    const ringGeo = new THREE.RingGeometry(0.45, 0.7, 8);
    ringGeo.rotateX(-Math.PI / 2);
    this.marker = new THREE.Mesh(ringGeo, createPS1Material({
      color: 0xffd060, lit: false, transparent: true, opacity: 0.85, depthWrite: false, fogAmount: 0.4, side: THREE.DoubleSide,
    }));
    this.marker.renderOrder = 2;
    this.marker.visible = false;
    scene.add(this.marker);

    this.splashes = new Splashes(scene, this.ocean);

    // Pêche sur glace : pêcheur et trou
    this.fisher = buildFisher();
    this.fisher.visible = false;
    scene.add(this.fisher);
    this.hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.06, 8),
      createPS1Material({ color: 0x0a1a2c, lit: false }),
    );
    this.hole.visible = false;
    scene.add(this.hole);
    this.ice = null;
    this.iceCfg = BALANCE.ice;

    this.tip = V();
    this.base = V();
    this.target = V();
    this.castFrom = V();
    this.bobPos = V();
    this.lineEnd = V();
    this.yaw = 0;
    this.side = 1;
    this.power = 0;
    this.dip = 0;
    this.fight = null;
    this.catch = null;
    this.fishModel = null;
    this.species = null;
  }

  get active() { return this.mode !== S.IDLE; }

  gear() {
    const g = this.state.gear;
    return { rod: RODS[g.rod], reel: REELS[g.reel], line: LINES[g.line], bait: BAITS[g.bait] };
  }

  set(mode) {
    this.mode = mode;
    this.t = 0;
  }

  say(text, d = 2.5) { this.hud.toast(text, d); }

  cameraDir() {
    const dx = this.rig.look.x - this.rig.pos.x, dz = this.rig.look.z - this.rig.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  }

  isWater(x, z) {
    return !this.world.colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r * 0.92);
  }

  // ------------------------------------------------------------------
  update(dt, input, enabled = true) {
    this.t += dt;
    switch (this.mode) {
      case S.IDLE: this.updateIdle(input, enabled); break;
      case S.AIMING: this.updateAiming(input); break;
      case S.CASTING: this.updateCasting(); break;
      case S.WAITING: this.updateWaiting(dt, input); break;
      case S.BITE: this.updateBite(input); break;
      case S.FIGHT: this.updateFight(dt, input); break;
      case S.CAUGHT: this.updateCaught(input); break;
      case S.RETRIEVE: if (this.t > 0.5) this.set(S.IDLE); break;
      case S.DRILL: this.updateDrill(dt, input); break;
    }
    this.updateVisuals(dt);
    this.splashes.update(dt);
  }

  // ------------------------------------------------------------------
  // Pêche sur glace
  // sheet : { x, z, r } plaque de banquise ; on perce près du bord, côté bateau.
  startIce(sheet) {
    const dx = this.boat.x - sheet.x, dz = this.boat.z - sheet.z;
    const d = Math.hypot(dx, dz) || 1;
    const k = Math.max(0, sheet.r - 6) / d;
    const hx = sheet.x + dx * k, hz = sheet.z + dz * k;
    const top = 0.45;
    // Le pêcheur se tient entre le trou et le centre de la plaque, face au trou.
    const fx = hx - (dx / d) * 1.3, fz = hz - (dz / d) * 1.3;
    this.ice = { x: hx, z: hz, top, depth: this.iceCfg.startDepth, progress: 0, fx, fz, face: Math.atan2(hx - fx, hz - fz) };
    this.fisher.position.set(fx, top - 0.05, fz);
    this.fisher.rotation.y = this.ice.face;
    this.fisher.visible = true;
    this.hole.position.set(hx, top + 0.01, hz);
    this.hole.scale.setScalar(0.01);
    this.hole.visible = true;
    this.bobPos.set(hx, top, hz);
    this.waited = 0;
    this.say('Maintenez le clic gauche pour percer la glace.', 3);
    this.set(S.DRILL);
  }

  leaveIce() {
    this.ice = null;
    this.fisher.visible = false;
    this.hole.visible = false;
    this.species = null;
    this.removeFishModel();
    this.fight = null;
    this.say('Vous remontez à bord.');
    this.set(S.IDLE);
  }

  updateDrill(dt, input) {
    if (input.pressed('cancel')) { this.leaveIce(); return; }
    if (!input.leftHeld) return;
    const I = this.ice;
    I.progress = Math.min(1, I.progress + dt / this.iceCfg.drillTime);
    this.hole.scale.setScalar(Math.max(0.01, I.progress));
    this.drillTick = (this.drillTick || 0) + dt * 18;
    if (this.drillTick > 1) {
      this.drillTick = 0;
      this.audio.play('click');
      this.splashes.burst(I.x, I.z, 1, 0.35);
    }
    if (I.progress >= 1) {
      this.audio.play('plop', { pitch: 0.8 });
      this.splashes.burst(I.x, I.z, 8, 0.5);
      this.say('Le trou est percé. Réglez la profondeur et attendez une touche.', 3);
      this.startWaiting();
    }
  }

  // Cible de la caméra (le pêcheur sur la glace, sinon le bateau).
  cameraTarget() {
    if (!this.ice) return this.boat;
    return { x: this.ice.fx, y: this.ice.top, z: this.ice.fz, heading: this.ice.face, speed: 0 };
  }

  updateIdle(input, enabled) {
    if (!enabled || !input.leftClicked) return;
    if (Math.abs(this.boat.speed) > this.cfg.maxBoatSpeed) {
      this.say('Arrêtez le bateau pour pêcher.');
      return;
    }
    this.power = 0;
    this.set(S.AIMING);
  }

  updateAiming(input) {
    const p = (this.t * this.cfg.aimSpeed) % 2;
    this.power = p < 1 ? p : 2 - p;
    const [dx, dz] = this.cameraDir();
    const { rod } = this.gear();
    const dist = this.cfg.minCast + this.power * (rod.maxCast - this.cfg.minCast);
    this.target.set(this.boat.x + dx * dist, 0, this.boat.z + dz * dist);
    this.target.y = this.ocean.heightAt(this.target.x, this.target.z);
    this.yaw = Math.atan2(dx, dz);

    if (input.pressed('cancel')) { this.set(S.IDLE); return; }
    if (!input.leftHeld) {
      this.castFrom.copy(this.tip);
      this.castDur = 0.45 + dist / 45;
      this.castArc = 1 + dist * 0.3;
      this.audio.play('cast');
      this.set(S.CASTING);
    }
  }

  updateCasting() {
    if (this.t < this.castDur) return;
    this.bobPos.copy(this.target);
    if (!this.isWater(this.target.x, this.target.z)) {
      this.say("La ligne s'est accrochée sur la côte !");
      this.audio.play('plop', { pitch: 0.7 });
      this.set(S.RETRIEVE);
      return;
    }
    this.splashes.burst(this.bobPos.x, this.bobPos.z, 6, 0.5);
    this.audio.play('plop');
    this.startWaiting();
  }

  startWaiting() {
    const g = this.state.gear;
    if (g.bait !== 'worm' && !BAITS[g.bait].reusable && !(this.state.baits[g.bait] > 0)) {
      g.bait = 'worm';
      this.say("Plus d'appâts : retour aux vers de sable.");
    }
    const { bait } = this.gear();
    this.biteTimer = rand(this.cfg.waitMin, this.cfg.waitMax) / bait.biteSpeed;
    // La nuit, il faut de la lumière pour attirer le poisson.
    const phase = this.clock.phase;
    if (!this.ice && (phase === 'night' || phase === 'dusk')) {
      const nb = this.boat.stats ? this.boat.stats.nightBite : 0.6;
      this.biteTimer /= this.boat.lampOn ? nb : nb * 0.5;
    }
    this.species = null;
    this.waited = this.waited ?? 0;
    this.set(S.WAITING);
  }

  updateWaiting(dt, input) {
    this.waited += dt;
    if (input.pressed('cancel')) {
      if (this.ice) this.leaveIce();
      else this.retrieve();
      return;
    }
    if (input.leftClicked) {
      if (this.species) {
        this.say('Trop tôt ! Le poisson a fui.');
        this.audio.play('escape');
        this.startWaiting();
      } else if (!this.ice) {
        this.retrieve();
      }
      return;
    }

    // Sur la glace : Z/S (ou flèches) pour descendre ou remonter l'appât.
    if (this.ice) {
      const I = this.ice, C = this.iceCfg;
      const dir = (input.down('back') ? 1 : 0) - (input.down('forward') ? 1 : 0);
      if (dir) {
        const before = Math.round(I.depth);
        I.depth = Math.max(C.minDepth, Math.min(C.maxDepth, I.depth + dir * C.depthSpeed * dt));
        if (Math.round(I.depth) !== before) this.audio.play('click');
        if (this.species) { this.species = null; this.biteTimer = rand(1, 3); } // le poisson a été dérangé
      }
    }

    if (!this.species) {
      this.biteTimer -= dt;
      if (this.biteTimer > 0) return;
      const { bait } = this.gear();
      const zone = this.zones.zoneAt(this.bobPos.x, this.bobPos.z);
      this.species = this.ice
        ? this.spawner.pickIce(zone.id, this.clock.phase, this.ice.depth, bait)
        : this.spawner.pick(zone.id, this.clock.phase, this.bobPos.x, this.bobPos.z, bait);
      if (!this.species) {
        this.biteTimer = rand(4, 9);
        if (this.waited > 25 && !this.warnedEmpty) {
          this.say(this.ice
            ? 'Rien ne mord à cette profondeur... Essayez plus haut ou plus bas.'
            : 'Rien ne mord ici... Essayez ailleurs ou à une autre heure.', 4);
          this.warnedEmpty = true;
        }
        return;
      }
      const [a, b] = FISH[this.species].bite.nibbles;
      this.nibbles = a + Math.floor(Math.random() * (b - a + 1));
      this.nibbleTimer = rand(0.4, 1.0);
      return;
    }

    this.nibbleTimer -= dt;
    if (this.nibbleTimer > 0) return;
    if (this.nibbles > 0) {
      this.nibbles--;
      this.dip = 0.14;
      this.audio.play('plop', { pitch: 1.5, gain: 0.5 });
      this.nibbleTimer = rand(0.6, 1.4);
    } else {
      this.biteWindow = FISH[this.species].bite.window;
      this.audio.play('bite');
      this.splashes.burst(this.bobPos.x, this.bobPos.z, 8, 0.6);
      this.set(S.BITE);
    }
  }

  updateBite(input) {
    if (input.pressed('cancel')) {
      if (this.ice) this.leaveIce();
      else this.retrieve();
      return;
    }
    if (input.leftClicked) {
      this.audio.play('strike');
      this.startFight();
      return;
    }
    if (this.t > this.biteWindow) {
      this.say("Raté... Il a lâché l'appât.");
      this.audio.play('escape');
      this.startWaiting();
    }
  }

  startFight() {
    const id = this.species;
    const fish = FISH[id];
    const zone = this.zones.zoneAt(this.bobPos.x, this.bobPos.z);
    const c = this.spawner.createCatch(id, { zone: zone.id, phase: this.clock.phase, day: this.clock.day });
    const k = 0.7 + 0.6 * c.sizeRatio;
    // L'appât est consommé quand le poisson est ferré.
    const baitId = this.state.gear.bait;
    if (!BAITS[baitId].infinite && !BAITS[baitId].reusable) {
      this.state.baits[baitId] = Math.max(0, (this.state.baits[baitId] || 0) - 1);
    }
    this.fight = {
      id, fish, c,
      force: fish.fight.force * k,
      endurance: fish.fight.endurance * k,
      stamina: 1,
      T: 0.3,
      slack: 0,
      rush: 0,
      erratic: 1,
      erraticTimer: 0,
      jump: -1,
      jumpTimer: rand(2, 4),
      dist: this.ice ? this.ice.depth : Math.hypot(this.bobPos.x - this.boat.x, this.bobPos.z - this.boat.z),
      angle0: Math.atan2(this.bobPos.x - this.boat.x, this.bobPos.z - this.boat.z),
      phase: Math.random() * 6,
      depth: fish.fight.pattern === 'diver' ? 2.6 : 1.2,
      pos: this.bobPos.clone(),
      reeling: false,
    };
    this.fishModel = getFishModel(id, c.size);
    this.fishModel.visible = false;
    this.scene.add(this.fishModel);
    this.set(S.FIGHT);
  }

  updateFight(dt, input) {
    const F = this.fight;
    const f = F.fish.fight;
    const g = this.gear();

    if (input.pressed('cancel')) {
      this.say('Vous coupez la ligne.');
      this.lose('escape', false);
      return;
    }

    // Traction du poisson selon son comportement
    let pat = 1;
    switch (f.pattern) {
      case 'steady': pat = 1 + 0.15 * Math.sin(this.t * 1.3); break;
      case 'erratic':
        F.erraticTimer -= dt;
        if (F.erraticTimer <= 0) { F.erratic = rand(0.4, 1.4); F.erraticTimer = rand(0.3, 0.7); }
        pat = F.erratic;
        break;
      case 'diver': pat = 1.1 + 0.1 * Math.sin(this.t * 0.8); break;
      case 'jumper': pat = 0.9 + 0.1 * Math.sin(this.t * 2); break;
    }
    if (F.rush > 0) {
      F.rush -= dt;
      pat *= f.rushForce;
    } else if (Math.random() < f.rushChance * dt * (0.5 + F.stamina)) {
      F.rush = f.rushTime * rand(0.6, 1.4);
      this.audio.play('splash', { size: 0.5 });
      this.splashes.burst(F.pos.x, F.pos.z, 6, 0.6);
    }
    if (f.pattern === 'jumper') {
      if (F.jump >= 0) {
        F.jump += dt;
        pat *= 1.4;
        if (F.jump > 0.9) {
          F.jump = -1;
          this.splashes.burst(F.pos.x, F.pos.z, 12, 0.8);
          this.audio.play('splash', { size: 0.8 });
        }
      } else if (!this.ice && (F.jumpTimer -= dt) <= 0 && F.dist > 5) {
        F.jump = 0;
        F.jumpTimer = rand(3, 6);
        this.splashes.burst(F.pos.x, F.pos.z, 12, 0.8);
        this.audio.play('splash', { size: 0.7 });
      }
    }
    const pull = F.force * pat * (0.35 + 0.65 * F.stamina);

    // Tension : on mouline (clic maintenu) = tension monte, on relâche = le poisson prend du fil
    F.reeling = input.leftHeld;
    const strength = g.line.strength * g.rod.power;
    const fc = this.cfg;
    let target = F.reeling ? fc.reelTensionBase + pull * fc.reelTensionPull : pull * fc.idleTensionPull;
    if (F.dist >= g.line.maxLength) target += 0.6;
    F.T += (target / strength - F.T) * Math.min(1, dt * 4);

    if (F.reeling) F.dist -= g.reel.reelSpeed * (1 - 0.5 * Math.min(1, pull)) * dt;
    else F.dist += pull * 1.4 * dt;
    F.dist = Math.min(F.dist, g.line.maxLength);

    F.stamina = Math.max(0, F.stamina - (dt * (0.25 + F.T)) / F.endurance);

    if (F.T < this.cfg.slackThreshold) F.slack += dt;
    else F.slack = Math.max(0, F.slack - dt * 2);

    // Position du poisson (sous la surface, il zigzague)
    const a = F.angle0 + Math.sin(this.t * 0.6 + F.phase) * 0.35 + (F.rush > 0 ? Math.sin(this.t * 7) * 0.08 : 0);
    if (this.ice) {
      // Sous la glace : le poisson est à la verticale du trou, à « dist » mètres de profondeur.
      F.pos.set(this.ice.x + Math.sin(this.t * 0.9) * 0.3, this.ice.top - F.dist, this.ice.z + Math.cos(this.t * 0.7) * 0.3);
    } else {
      F.pos.x = this.boat.x + Math.sin(a) * F.dist;
      F.pos.z = this.boat.z + Math.cos(a) * F.dist;
      const h = this.ocean.heightAt(F.pos.x, F.pos.z);
      F.pos.y = h - F.depth * Math.min(1, F.dist / 5);
      if (F.jump >= 0) F.pos.y = h + Math.sin((Math.PI * F.jump) / 0.9) * 1.8;
    }
    F.angle = a;
    const landAt = this.ice ? this.iceCfg.catchDepth : this.cfg.catchDistance;

    // Issues
    if (F.T >= 1) {
      this.say('Le fil a cassé !', 3);
      this.lose('snap', true);
    } else if (F.slack > this.cfg.slackTime) {
      this.say("Le fil s'est détendu... Le poisson s'est décroché.", 3);
      this.lose('escape', false);
    } else if (F.dist <= landAt) {
      this.landFish();
    }
  }

  lose(sound, broke) {
    this.audio.play(sound);
    this.state.stats.lost++;
    if (this.fight && !this.ice) this.splashes.burst(this.fight.pos.x, this.fight.pos.z, 8, 0.6);
    this.removeFishModel();
    this.fight = null;
    if (this.ice) this.startWaiting(); // sur la glace, on remet simplement une ligne
    else if (broke) this.set(S.IDLE);
    else {
      this.bobPos.copy(this.lineEnd);
      this.set(S.RETRIEVE);
    }
  }

  landFish() {
    const F = this.fight;
    this.catch = F.c;
    this.catch.isNew = !this.state.journal[F.id];
    this.catch.isRecord = !this.catch.isNew && F.c.size > this.state.journal[F.id].maxSize;
    this.fight = null;
    this.fishModel.visible = true;
    this.audio.play('splash', { size: 0.8 });
    this.audio.play('catch');
    this.splashes.burst(F.pos.x, F.pos.z, 14, 0.9);
    this.state.stats.caught++;
    recordCatch(this.state, this.catch);
    bus.emit('fish:caught', this.catch);
    this.set(S.CAUGHT);
  }

  updateCaught(input) {
    if (this.t < 0.8) return; // laisse l'animation de prise démarrer (évite un clic accidentel)
    if (input.leftClicked || input.pressed('interact')) {
      if (!this.inventory.canFit(this.catch)) {
        this.say('Pas de place dans la cale ! Relâchez-le ou faites de la place (I).', 3);
        return;
      }
      this.inventory.add(this.catch);
      this.say(`${FISH[this.catch.id].name} rangé dans la cale.`);
      this.audio.play('stow');
      this.endCatch();
    } else if (input.pressed('cancel')) {
      this.say('Vous le relâchez.');
      const p = this.fishModel.position;
      this.splashes.burst(p.x, p.z, 10, 0.7);
      this.audio.play('splash', { size: 0.6 });
      this.endCatch();
    }
  }

  endCatch() {
    this.removeFishModel();
    this.catch = null;
    if (this.ice) this.startWaiting();
    else this.set(S.IDLE);
  }

  removeFishModel() {
    if (this.fishModel) {
      this.scene.remove(this.fishModel);
      this.fishModel = null;
    }
  }

  retrieve() {
    this.species = null;
    this.audio.play('reelin');
    this.set(S.RETRIEVE);
  }

  // ------------------------------------------------------------------
  updateVisuals(dt) {
    const m = this.mode;
    const on = m !== S.IDLE;
    this.rod.visible = on;
    this.marker.visible = m === S.AIMING;
    if (!on) {
      this.bobber.visible = false;
      this.line.visible = false;
      this.waited = 0;
      this.warnedEmpty = false;
      return;
    }
    if (this.ice) { this.updateIceVisuals(); return; }
    this.rod.scale.setScalar(1);

    // Orientation de la canne : vers la cible / le bouchon / le poisson
    if (m !== S.AIMING) {
      const p = this.fight ? this.fight.pos : this.bobPos;
      if (m !== S.CAUGHT) this.yaw = Math.atan2(p.x - this.boat.x, p.z - this.boat.z);
    }
    const rel = wrapAngle(this.yaw - this.boat.heading);
    if (m === S.AIMING || m === S.CASTING) this.side = rel > 0 ? 1 : -1;
    this.base.set(this.side * 0.95, 0.95, -1.3);
    this.boat.group.localToWorld(this.base);

    let pitch = -0.75;
    let roll = 0;
    if (m === S.AIMING) pitch = -1.3 + (1 - this.power) * 0.15;
    else if (m === S.CASTING) pitch = -1.3 + Math.min(1, this.t / 0.25) * 0.75;
    else if (m === S.BITE) pitch = -0.7 + Math.sin(this.t * 40) * 0.03;
    else if (m === S.FIGHT) {
      const T = this.fight.T;
      pitch = -1.0 + T * 0.55 + Math.sin(this.t * 30) * 0.02 * T;
      roll = Math.sin(this.t * 3) * 0.05;
    } else if (m === S.CAUGHT) pitch = -1.05;
    this.rod.position.copy(this.base);
    this.rod.rotation.set(pitch, this.yaw, roll);
    this.rod.updateMatrixWorld();
    this.tip.set(0, 0, ROD_LEN);
    this.rod.localToWorld(this.tip);

    // Marqueur de visée
    if (m === S.AIMING) {
      this.marker.position.set(this.target.x, this.target.y + 0.08, this.target.z);
      this.marker.scale.setScalar(0.8 + 0.2 * Math.sin(this.t * 8));
    }

    // Bouchon
    const showBob = m === S.CASTING || m === S.WAITING || m === S.BITE || m === S.RETRIEVE;
    this.bobber.visible = showBob;
    if (m === S.CASTING) {
      const k = Math.min(1, this.t / this.castDur);
      const wy = this.target.y;
      this.bobber.position.set(
        this.castFrom.x + (this.target.x - this.castFrom.x) * k,
        this.castFrom.y + (wy - this.castFrom.y) * k + this.castArc * 4 * k * (1 - k),
        this.castFrom.z + (this.target.z - this.castFrom.z) * k,
      );
    } else if (m === S.WAITING || m === S.BITE) {
      if (m === S.BITE) this.dip = 0.45;
      else this.dip *= Math.exp(-dt * 6);
      const h = this.ocean.heightAt(this.bobPos.x, this.bobPos.z);
      const shake = m === S.BITE ? Math.sin(this.t * 35) * 0.06 : 0;
      this.bobber.position.set(this.bobPos.x + shake, h - this.dip + 0.02, this.bobPos.z);
      this.bobber.rotation.set(Math.sin(this.t * 1.7) * 0.15, 0, Math.cos(this.t * 1.3) * 0.15);
    } else if (m === S.RETRIEVE) {
      const k = Math.min(1, this.t / 0.5);
      this.bobber.position.lerpVectors(this.bobPos, this.tip, k);
      this.bobber.position.y += Math.sin(Math.PI * k) * 1.2;
    }

    // Poisson visible : pendant un saut, ou suspendu à la canne une fois pêché
    if (this.fishModel) {
      const fm = this.fishModel;
      if (m === S.FIGHT) {
        const F = this.fight;
        fm.visible = F.jump >= 0;
        if (fm.visible) {
          fm.position.copy(F.pos);
          fm.rotation.set(0, F.angle - Math.PI / 2, Math.cos((Math.PI * F.jump) / 0.9) * 0.9);
        }
      } else if (m === S.CAUGHT) {
        const len = fm.scale.x;
        fm.position.set(this.tip.x, this.tip.y - len * 0.5 - 0.35, this.tip.z);
        fm.rotation.set(Math.sin(this.t * 12) * 0.25 * Math.exp(-this.t), this.t * 1.5, Math.PI / 2);
      }
    }

    // Ligne : du scion jusqu'au bouchon / poisson
    let sag = 0.6;
    if (m === S.AIMING) {
      this.lineEnd.set(this.tip.x, this.tip.y - 0.7, this.tip.z);
      sag = 0;
    } else if (m === S.FIGHT) {
      this.lineEnd.copy(this.fight.pos);
      sag = 0.04 + Math.max(0, 0.35 - this.fight.T) * 1.5;
    } else if (m === S.CAUGHT) {
      this.lineEnd.set(this.tip.x, this.tip.y - 0.35, this.tip.z);
      sag = 0;
    } else {
      this.lineEnd.copy(this.bobber.position);
      this.lineEnd.y += 0.3;
      sag = m === S.BITE ? 0.1 : m === S.CASTING ? 0.15 : 0.7;
    }
    this.drawLine(sag);
  }

  drawLine(sag) {
    for (let i = 0; i < LINE_PTS; i++) {
      const s = i / (LINE_PTS - 1);
      this.linePos[i * 3] = this.tip.x + (this.lineEnd.x - this.tip.x) * s;
      this.linePos[i * 3 + 1] = this.tip.y + (this.lineEnd.y - this.tip.y) * s - sag * 4 * s * (1 - s);
      this.linePos[i * 3 + 2] = this.tip.z + (this.lineEnd.z - this.tip.z) * s;
    }
    this.line.geometry.attributes.position.needsUpdate = true;
    this.line.visible = true;
  }

  // Pêche sur glace : petite canne tenue par le pêcheur au-dessus du trou.
  updateIceVisuals() {
    const I = this.ice, m = this.mode;
    this.bobber.visible = false;
    this.marker.visible = false;
    this.rod.visible = m !== S.DRILL;
    this.rod.scale.setScalar(0.45);
    this.fisher.updateMatrixWorld();
    this.base.set(HAND[0], HAND[1], HAND[2]);
    this.fisher.localToWorld(this.base);
    this.yaw = I.face;
    let pitch = 0.3;
    if (m === S.BITE) pitch = 0.45 + Math.sin(this.t * 40) * 0.05;
    else if (m === S.FIGHT) pitch = 0.5 + this.fight.T * 0.35 + Math.sin(this.t * 30) * 0.02;
    else if (m === S.CAUGHT) pitch = -0.7;
    else if (m === S.WAITING) pitch = 0.3 + Math.sin(this.t * 2.5) * 0.04; // on fait danser l'appât
    this.rod.position.copy(this.base);
    this.rod.rotation.set(pitch, this.yaw, 0);
    this.rod.updateMatrixWorld();
    this.tip.set(0, 0, ROD_LEN);
    this.rod.localToWorld(this.tip);

    if (m === S.DRILL) { this.line.visible = false; return; }
    if (m === S.CAUGHT && this.fishModel) {
      const fm = this.fishModel;
      const len = fm.scale.x;
      fm.visible = true;
      fm.position.set(this.tip.x, this.tip.y - len * 0.5 - 0.35, this.tip.z);
      fm.rotation.set(Math.sin(this.t * 12) * 0.25 * Math.exp(-this.t), this.t * 1.5, Math.PI / 2);
      this.lineEnd.set(this.tip.x, this.tip.y - 0.35, this.tip.z);
      this.drawLine(0);
      return;
    }
    if (this.fishModel) this.fishModel.visible = false;
    // La ligne descend dans le trou.
    this.lineEnd.set(I.x, I.top - (m === S.BITE ? 0.3 : 0.05), I.z);
    this.drawLine(0);
  }
}
