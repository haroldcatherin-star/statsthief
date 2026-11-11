// Décors procéduraux : îles, palmiers, rochers, coraux, épave, bouées.
import * as THREE from 'three';
import { ZONES, WORLD } from '../../config/zones.js';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { RNG } from '../core/Random.js';
import { buildHull } from '../entities/Boat.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const C = {
  wet: 0x8f8a5e,
  sand: 0xe2d39a,
  jungle: 0x3f8a3a,
  jungleDark: 0x2e6a30,
  rock: 0x7c7a70,
  trunkA: 0x8a6a40,
  trunkB: 0x74583a,
  coconut: 0x5a4020,
};
const CORAL_COLORS = [0xff6a8a, 0xff9a40, 0xa060d0, 0xf0d040, 0x40c0b0, 0xe85050];

// Profils d'île : [facteur de rayon, hauteur], de l'extérieur vers le centre.
export const PROFILES = {
  hill: (h) => [[1.45, -14], [1.12, -2.2], [1.0, 0.2], [0.86, 0.9], [0.62, 0.9 + (h - 0.9) * 0.55], [0.34, 0.9 + (h - 0.9) * 0.9], [0, h]],
  flat: () => [[1.4, -14], [1.1, -2.2], [1.0, 0.2], [0.85, 1.1], [0.7, 1.6], [0.4, 2.1], [0, 2.3]],
  sandbar: (h) => [[1.5, -14], [1.15, -2.0], [1.0, 0.15], [0.6, h * 0.8], [0, h]],
};

// Hauteur approximative du sol à une distance relative du centre (0 = centre, 1 = rivage).
export function groundAt(rings, ratio) {
  for (let k = rings.length - 1; k >= 1; k--) {
    const inner = rings[k], outer = rings[k - 1];
    if (ratio >= inner[0] && ratio <= outer[0]) {
      const t = (ratio - inner[0]) / (outer[0] - inner[0]);
      return inner[1] + (outer[1] - inner[1]) * t;
    }
  }
  return rings[0][1];
}

// palette : { wet, sand, jungle, jungleDark } (par défaut : île tropicale)
export const PALETTES = {
  tropical: { wet: C.wet, sand: C.sand, jungle: C.jungle, jungleDark: C.jungleDark },
  snow: { wet: 0x2e3236, sand: 0x5a5e66, jungle: 0xdfe6ee, jungleDark: 0xf0f4f8 },
  ice: { wet: 0x8aa8bc, sand: 0xe0ecf4, jungle: 0xe8f0f8, jungleDark: 0xf4f8fc },
  basalt: { wet: 0x16181c, sand: 0x24262a, jungle: 0x2e3034, jungleDark: 0x383a40 },
};

export function makeIsland(b, rng, cx, cz, r, rings, seg = 10, palette = PALETTES.tropical, layer = 'noise') {
  const inside = V(cx, -40, cz);
  const top = rings[rings.length - 1][1];
  const jA = Array.from({ length: seg }, () => rng.next() - 0.5);
  const rows = rings.map(([rf, y], k) => {
    if (rf === 0) return [V(cx, y, cz)];
    const row = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const j = 1 + jA[i] * 0.24 + (rng.next() - 0.5) * 0.08;
      const yy = y + (k >= 3 ? (rng.next() - 0.5) * 0.35 : 0);
      row.push(V(cx + Math.cos(a) * r * rf * j, yy, cz + Math.sin(a) * r * rf * j));
    }
    return row;
  });
  const P = palette;
  const color = (v) => {
    if (v.y < -1.0) return P.wet;
    if (v.y < 0.75 || top < 1.2) return P.sand;
    return v.y > top * 0.8 && top > 4 ? P.jungleDark : P.jungle;
  };
  for (let k = 0; k < rows.length - 1; k++) {
    const A = rows[k], B = rows[k + 1];
    for (let i = 0; i < seg; i++) {
      const i2 = (i + 1) % seg;
      if (B.length === 1) b.triOut(layer, A[i], A[i2], B[0], color, inside);
      else b.quadOut(layer, A[i], A[i2], B[i2], B[i], color, inside);
    }
  }
}

export function makePalm(b, rng, x, y, z, height = 6) {
  const la = rng.float(0, Math.PI * 2);
  const lean = rng.float(0.15, 0.35) * height;
  const dx = Math.cos(la), dz = Math.sin(la);
  let prev = V(x, y, z);
  const segs = 5;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const p = V(x + dx * lean * t * t, y + height * t, z + dz * lean * t * t);
    b.tube('wood', prev, p, 0.3 - (i - 1) * 0.03, 0.3 - i * 0.03, 5, i % 2 ? C.trunkA : C.trunkB);
    prev = p;
  }
  const top = prev;
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng.float(-0.2, 0.2);
    const ox = Math.cos(a), oz = Math.sin(a);
    const px = -oz, pz = ox;
    const L = rng.float(2.6, 3.4);
    const mid = V(top.x + ox * L * 0.5, top.y + 0.45, top.z + oz * L * 0.5);
    const tip = V(top.x + ox * L, top.y - 0.9, top.z + oz * L);
    const off = (p, w) => [V(p.x - px * w, p.y, p.z - pz * w), V(p.x + px * w, p.y, p.z + pz * w)];
    const [b0, b1] = off(top, 0.12);
    const [m0, m1] = off(mid, 0.75);
    const [t0, t1] = off(tip, 0.25);
    const tint = 0xffffff;
    b.quad('leaf', b0, b1, m1, m0, tint, [[0.45, 0], [0.55, 0], [1, 0.5], [0, 0.5]]);
    b.quad('leaf', m0, m1, t1, t0, tint, [[0, 0.5], [1, 0.5], [0.65, 1], [0.35, 1]]);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    b.ico('noise', [top.x + Math.cos(a) * 0.3, top.y - 0.25, top.z + Math.sin(a) * 0.3], 0.2, C.coconut, { jitter: 0.1 });
  }
}

export function makeRock(b, rng, x, y, z, size, color = C.rock) {
  b.ico('rock', [x, y, z], size, color, { jitter: 0.35, scaleY: 0.75, rotY: rng.float(0, Math.PI) });
}

export function makeCoral(b, rng, x, y, z) {
  const col = rng.pick(CORAL_COLORS);
  const type = rng.int(0, 2);
  if (type === 0) {
    const n = rng.int(2, 4);
    for (let i = 0; i < n; i++) {
      const a = rng.float(0, Math.PI * 2), tilt = rng.float(0.2, 0.7), len = rng.float(0.8, 1.8);
      b.tube('noise', [x, y, z], [x + Math.cos(a) * tilt * len, y + len, z + Math.sin(a) * tilt * len], 0.18, 0.07, 4, col);
    }
  } else if (type === 1) {
    b.ico('noise', [x, y, z], rng.float(0.5, 1.1), col, { jitter: 0.2, scaleY: 0.6 });
  } else {
    b.box('noise', [x, y + 0.6, z], [rng.float(1, 1.6), 1.2, 0.08], col, rng.float(0, Math.PI));
  }
}

function makeBuoy(color) {
  const b = new MeshBuilder();
  b.cylinder('paint', [0, 0.1, 0], 0.45, 0.55, 0.9, 7, color);
  b.cone('paint', [0, 0.9, 0], 0.4, 0.7, 7, color);
  b.tube('metal', [0, 1.2, 0], [0, 2.0, 0], 0.05, 0.05, 4, 0x707070);
  b.box('window', [0, 2.05, 0], [0.18, 0.18, 0.18], 0xffffff);
  return b.build();
}

export class Props {
  constructor(scene, glows, ocean) {
    this.ocean = ocean;
    this.glows = glows;
    const zone = ZONES[0];
    const L = zone.layout;
    const rng = new RNG(L.seed);
    const b = new MeshBuilder({ rng: () => rng.next() });
    this.colliders = [];
    this.reefSpots = [];   // récifs immergés (pas de collision, mais des poissons)
    const P = WORLD.port;
    const islands = [];

    const inLane = (x, z, r) => Math.abs(x) < 45 + r && z < 20 && z > -170;
    const nearPort = (x, z, r) => Math.hypot(x - P.x, z - P.z) < 110 + r;
    const outside = (x, z, r) => Math.hypot(x - zone.center[0], z - zone.center[1]) > zone.radius - 40 - r;
    const onIsland = (x, z, pad) => islands.some((p) => Math.hypot(p.x - x, p.z - z) < p.r * 1.5 + pad);
    const randomSpot = (minD, r) => {
      for (let t = 0; t < 200; t++) {
        const a = rng.float(0, Math.PI * 2), d = rng.float(minD, zone.radius - 60);
        const x = zone.center[0] + Math.cos(a) * d, z = zone.center[1] + Math.sin(a) * d;
        if (inLane(x, z, r) || nearPort(x, z, r) || outside(x, z, r) || onIsland(x, z, r + 6)) continue;
        return [x, z];
      }
      return null;
    };

    // --- Îles ---
    let tries = 0;
    while (islands.length < L.islands && tries++ < 1000) {
      const kind = rng.chance(0.35) ? 'sandbar' : 'hill';
      const r = kind === 'sandbar' ? rng.float(7, 14) : rng.float(10, 26);
      const a = rng.float(0, Math.PI * 2), d = rng.float(110, zone.radius - 60);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (inLane(x, z, r) || nearPort(x, z, r) || outside(x, z, r)) continue;
      if (islands.some((p) => Math.hypot(p.x - x, p.z - z) < p.r * 1.5 + r * 1.5 + 30)) continue;
      islands.push({ x, z, r, kind });
    }
    for (const isl of islands) {
      const h = isl.kind === 'sandbar' ? rng.float(0.6, 1.0) : isl.r * rng.float(0.25, 0.5) + 2;
      const rings = PROFILES[isl.kind](h);
      makeIsland(b, rng, isl.x, isl.z, isl.r, rings);
      this.colliders.push({ x: isl.x, z: isl.z, r: isl.r * 1.08, kind: 'island' });

      const palms = isl.kind === 'sandbar' ? rng.int(0, 2) : Math.floor(isl.r / 4) + rng.int(0, 2);
      for (let i = 0; i < palms; i++) {
        const ratio = rng.float(0.05, 0.65), ang = rng.float(0, Math.PI * 2);
        const g = groundAt(rings, ratio);
        if (g < 0.4) continue;
        makePalm(b, rng, isl.x + Math.cos(ang) * ratio * isl.r, g - 0.3, isl.z + Math.sin(ang) * ratio * isl.r, rng.float(4.5, 7.5));
      }
      const shoreRocks = rng.int(0, 3);
      for (let i = 0; i < shoreRocks; i++) {
        const ang = rng.float(0, Math.PI * 2), ratio = rng.float(0.95, 1.12);
        makeRock(b, rng, isl.x + Math.cos(ang) * isl.r * ratio, rng.float(-0.6, 0), isl.z + Math.sin(ang) * isl.r * ratio, rng.float(1, 2.2));
      }
      if (isl.kind === 'sandbar' || rng.chance(0.5)) {
        const n = rng.int(6, 12);
        for (let i = 0; i < n; i++) {
          const ang = rng.float(0, Math.PI * 2), ratio = rng.float(1.05, 1.35);
          makeCoral(b, rng, isl.x + Math.cos(ang) * isl.r * ratio, rng.float(-4.5, -1.8), isl.z + Math.sin(ang) * isl.r * ratio);
        }
      }
    }

    // --- Rochers ---
    for (let i = 0; i < L.rockClusters; i++) {
      const spot = randomSpot(60, 6);
      if (!spot) continue;
      const n = rng.int(1, 4);
      for (let k = 0; k < n; k++) {
        const size = rng.float(1.2, 3.5);
        const x = spot[0] + rng.float(-6, 6), z = spot[1] + rng.float(-6, 6);
        const y = rng.float(-1.4, 0.1);
        makeRock(b, rng, x, y, z, size);
        if (y + size * 0.75 > -0.4) this.colliders.push({ x, z, r: size * 0.85, kind: 'rock' });
        else this.reefSpots.push({ x, z, r: size });
      }
    }

    // --- Coraux isolés ---
    for (let i = 0; i < L.coralPatches; i++) {
      const spot = randomSpot(70, 8);
      if (!spot) continue;
      const n = rng.int(7, 13);
      for (let k = 0; k < n; k++) {
        makeCoral(b, rng, spot[0] + rng.float(-7, 7), rng.float(-5, -2), spot[1] + rng.float(-7, 7));
      }
      this.reefSpots.push({ x: spot[0], z: spot[1], r: 8 });
    }

    // --- Épave à demi coulée ---
    const wreck = { x: -230, z: 170 };
    b.matrix = new THREE.Matrix4().compose(
      V(wreck.x, -0.9, wreck.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 1.1, 0.55)),
      V(1, 1, 1),
    );
    buildHull(b, { top: 0x3a3e38, bottom: 0x5a3020, deck: 0x4a3a2a });
    b.tube('wood', [0, 0.6, 0.5], [0.3, 2.6, 0.7], 0.08, 0.06, 4, 0x4a3a2a);
    b.matrix = null;
    makeRock(b, rng, wreck.x + 4, -0.8, wreck.z - 2, 2.2);
    this.colliders.push({ x: wreck.x, z: wreck.z, r: 4.5, kind: 'rock' });

    this.group = b.build();
    scene.add(this.group);

    // --- Bouées du chenal (flottent sur la houle, clignotent la nuit) ---
    this.buoys = [];
    const spots = [[-16, -25], [16, -25], [-20, -75], [20, -75], [-24, -130], [24, -130]];
    spots.forEach(([x, z], i) => {
      const red = x < 0;
      const g = makeBuoy(red ? 0xc83228 : 0x2a9a4a);
      scene.add(g);
      const glow = glows.add(x, 2, z, red ? 0xff4030 : 0x40ff70, 1.4, 1, 1);
      this.buoys.push({ x, z, g, glow, phase: i * 0.7 });
    });
  }

  update(t) {
    for (const bu of this.buoys) {
      const y = this.ocean.heightAt(bu.x, bu.z);
      bu.g.position.set(bu.x, y - 0.1, bu.z);
      bu.g.rotation.set(Math.sin(t * 1.3 + bu.phase) * 0.12, 0, Math.cos(t * 1.1 + bu.phase) * 0.12);
      this.glows.setPos(bu.glow, bu.x, y + 2.05, bu.z);
      this.glows.setAlpha(bu.glow, Math.sin(t * 2.2 + bu.phase) > 0.3 ? 1 : 0.15);
    }
  }
}
