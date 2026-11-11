// Décors des zones lointaines : Fjord Gelé (falaises enneigées, icebergs, banquise, comptoir)
// et Haute Mer (aiguilles de basalte, épaves). Un groupe par zone pour le frustum culling.
import * as THREE from 'three';
import { ZONES } from '../../config/zones.js';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { RNG } from '../core/Random.js';
import { buildHull } from '../entities/Boat.js';
import { makeIsland, makeRock, PROFILES, PALETTES } from './Props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function polar(rng, zone, minK, maxK) {
  const a = rng.float(0, Math.PI * 2), d = rng.float(minK, maxK) * zone.radius;
  return [zone.center[0] + Math.cos(a) * d, zone.center[1] + Math.sin(a) * d];
}

function makeShack(b, glows, x, y, z, rot, color) {
  b.box('paint', [x, y + 1.1, z], [2.4, 2.2, 2.0], color, rot);
  b.cone('wood', [x, y + 2.7, z], 1.9, 1.1, 4, 0x4a3a2a, rot + Math.PI / 4);
  b.tube('metal', [x + 0.6, y + 2.2, z], [x + 0.6, y + 3.4, z], 0.08, 0.08, 4, 0x303030);
  b.box('window', [x + Math.sin(rot) * 1.02, y + 1.3, z + Math.cos(rot) * 1.02], [0.5, 0.4, 0.05], 0xffffff, rot);
  glows.add(x + Math.sin(rot) * 1.3, y + 1.3, z + Math.cos(rot) * 1.3, 0xffc070, 1.0, 0.7, 1);
}

export function buildCold(scene, glows) {
  const zone = ZONES.find((z) => z.id === 'cold');
  const L = zone.layout;
  const rng = new RNG(L.seed);
  const b = new MeshBuilder({ rng: () => rng.next() });
  const out = { colliders: [], reefSpots: [], iceSheets: [], outpost: null };
  const taken = [];
  const free = (x, z, r) => taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + r + 25);

  // --- Comptoir du Fjord (au sud, près de l'arrivée) ---
  const O = zone.outpost;
  const ix = O.x, iz = O.z - 34;
  makeIsland(b, rng, ix, iz, 18, PROFILES.hill(7), 10, PALETTES.snow);
  out.colliders.push({ x: ix, z: iz, r: 18 * 1.08, kind: 'island' });
  taken.push({ x: ix, z: iz, r: 60 });
  b.box('wood', [O.x, 1.2, O.z - 8], [3, 0.25, 18], 0x7a6a50);
  b.box('wood', [O.x, 1.2, O.z + 1.5], [9, 0.25, 4], 0x7a6a50);
  for (let z = O.z - 15; z <= O.z + 3; z += 4.5) {
    for (const dx of [-1.4, 1.4]) b.tube('wood', [O.x + dx, -4, z], [O.x + dx, 1.35, z], 0.18, 0.18, 5, 0x4a3a2a);
  }
  for (let z = O.z - 14; z <= O.z - 2; z += 4) out.colliders.push({ x: O.x, z, r: 2, kind: 'dock' });
  for (const dx of [-3, 0, 3]) out.colliders.push({ x: O.x + dx, z: O.z + 1.5, r: 2.4, kind: 'dock' });
  makeShack(b, glows, O.x - 4, 3.0, iz + 10, 0, 0x8a3a2a);
  b.box('paint', [O.x + 3.4, 1.95, O.z + 2.5], [0.6, 1.3, 0.5], 0xc83a2a);
  b.tube('wood', [O.x + 1.4, 1.3, O.z + 2.8], [O.x + 1.4, 3.0, O.z + 2.8], 0.07, 0.07, 4, 0x4a3a2a);
  b.box('window', [O.x + 1.4, 3.1, O.z + 2.8], [0.25, 0.3, 0.25], 0xffffff);
  glows.add(O.x + 1.4, 3.1, O.z + 2.8, 0xffc070, 1.8, 0.9, 1);
  out.outpost = { dock: { x: O.x + 7, z: O.z + 4, r: 10 }, place: O };

  // --- Falaises enneigées ---
  for (let i = 0, t = 0; i < L.cliffs && t < 400; t++) {
    const r = rng.float(14, 40);
    const [x, z] = polar(rng, zone, 0.3, 0.92);
    if (!free(x, z, r)) continue;
    const h = rng.float(10, 30);
    makeIsland(b, rng, x, z, r, PROFILES.hill(h), 9, PALETTES.snow);
    out.colliders.push({ x, z, r: r * 1.08, kind: 'island' });
    taken.push({ x, z, r: r * 1.4 });
    i++;
  }

  // --- Banquise (plaques de glace où l'on peut pêcher) ---
  for (let i = 0, t = 0; i < L.iceSheets && t < 400; t++) {
    const r = rng.float(35, 70);
    const [x, z] = polar(rng, zone, 0.1, 0.65);
    if (!free(x, z, r) || z > O.z - 150) continue;
    makeIsland(b, rng, x, z, r, [[1.04, -1.6], [1.0, 0.35], [0.6, 0.42], [0, 0.45]], 12, PALETTES.ice);
    out.colliders.push({ x, z, r: r * 1.0, kind: 'ice' });
    out.iceSheets.push({ x, z, r });
    taken.push({ x, z, r });
    if (rng.chance(0.6)) makeShack(b, glows, x + rng.float(-r, r) * 0.4, 0.4, z + rng.float(-r, r) * 0.4, rng.float(0, 6), 0x9a3a2a);
    i++;
  }

  // --- Icebergs ---
  for (let i = 0, t = 0; i < L.icebergs && t < 600; t++) {
    const s = rng.float(2.5, 11);
    const [x, z] = polar(rng, zone, 0.05, 0.95);
    if (!free(x, z, s) || Math.hypot(x - O.x, z - O.z) < 80) continue;
    b.ico('noise', [x, -s * 0.25, z], s, rng.chance(0.5) ? 0xdce8f0 : 0xb8d0e0, { jitter: 0.35, scaleY: 0.8, rotY: rng.float(0, 3) });
    out.colliders.push({ x, z, r: s * 0.95, kind: 'rock' });
    taken.push({ x, z, r: s });
    i++;
  }

  const group = b.build();
  scene.add(group);
  return out;
}

export function buildAbyss(scene, glows) {
  const zone = ZONES.find((z) => z.id === 'abyss');
  const L = zone.layout;
  const rng = new RNG(L.seed);
  const b = new MeshBuilder({ rng: () => rng.next() });
  const out = { colliders: [], reefSpots: [] };
  const taken = [];
  const free = (x, z, r) => taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + r + 60);

  // Aiguilles de basalte
  for (let i = 0, t = 0; i < L.stacks && t < 400; t++) {
    const r = rng.float(6, 15);
    const [x, z] = polar(rng, zone, 0.1, 0.9);
    if (!free(x, z, r)) continue;
    makeIsland(b, rng, x, z, r, PROFILES.hill(rng.float(18, 45)), 7, PALETTES.basalt);
    for (let k = 0; k < 3; k++) makeRock(b, rng, x + rng.float(-r, r) * 1.6, rng.float(-1, 0.2), z + rng.float(-r, r) * 1.6, rng.float(1.5, 3), 0x2a2c30);
    out.colliders.push({ x, z, r: r * 1.08, kind: 'island' });
    out.reefSpots.push({ x, z, r: r * 2 });
    taken.push({ x, z, r });
    i++;
  }

  // Épaves à demi coulées, dont une avec un feu qui brûle encore...
  for (let i = 0, t = 0; i < L.wrecks && t < 200; t++) {
    const [x, z] = polar(rng, zone, 0.2, 0.85);
    if (!free(x, z, 6)) continue;
    b.matrix = new THREE.Matrix4().compose(
      V(x, -1.1, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.float(-0.4, 0.4), rng.float(0, 6), rng.float(0.3, 0.7))),
      V(1.6, 1.6, 1.6),
    );
    buildHull(b, { top: 0x2a2e30, bottom: 0x3a2018, deck: 0x2a241e });
    b.tube('wood', [0, 0.6, 0.5], [0.2, 3.5, 0.6], 0.08, 0.06, 4, 0x2a241e);
    b.matrix = null;
    out.colliders.push({ x, z, r: 6, kind: 'rock' });
    out.reefSpots.push({ x, z, r: 10 });
    if (i === 0) glows.add(x, 3.2, z, 0xff6030, 1.4, 0.8, 1);
    taken.push({ x, z, r: 6 });
    i++;
  }

  const group = b.build();
  scene.add(group);
  return out;
}
