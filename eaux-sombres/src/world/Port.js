// Le port : île principale, ponton, cabanes (dont la future poissonnerie), phare.
import * as THREE from 'three';
import { WORLD } from '../../config/zones.js';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { createPS1Material } from '../render/PS1Material.js';
import { RNG } from '../core/Random.js';
import { makeIsland, makePalm, makeRock, PROFILES, groundAt } from './Props.js';

const WOOD = 0xa07a4a;
const WOOD_DARK = 0x5e4630;

export class Port {
  constructor(scene, glows) {
    const rng = new RNG(42);
    const b = new MeshBuilder({ rng: () => rng.next() });
    const P = WORLD.port;
    this.glows = glows;
    this.colliders = [];

    // --- Île ---
    const rings = PROFILES.flat();
    makeIsland(b, rng, P.x, P.z, P.radius, rings, 12);
    this.colliders.push({ x: P.x, z: P.z, r: P.radius * 1.05, kind: 'island' });

    // --- Ponton (de l'île vers le large, vers -Z) ---
    b.box('wood', [0, 1.2, 23], [3, 0.25, 30], WOOD);
    b.box('wood', [0, 1.2, 7.5], [12, 0.25, 5], WOOD);
    for (let z = 9; z <= 38; z += 4.5) {
      for (const x of [-1.35, 1.35]) b.tube('wood', [x, -4, z], [x, 1.35, z], 0.18, 0.18, 5, WOOD_DARK);
    }
    for (const x of [-5.6, -2, 2, 5.6]) {
      for (const z of [5.3, 9.7]) b.tube('wood', [x, -4, z], [x, 1.35, z], 0.2, 0.2, 5, WOOD_DARK);
    }
    for (const x of [-5.4, 5.4]) b.cylinder('metal', [x, 1.55, 5.4], 0.15, 0.2, 0.5, 6, 0x3a3a3a); // bittes d'amarrage
    b.box('wood', [-4.5, 1.75, 6.5], [0.9, 0.9, 0.9], 0x8a6a40, 0.3);
    b.box('wood', [-3.6, 1.65, 6.2], [0.7, 0.7, 0.7], 0x7a5a38, -0.2);
    b.cylinder('metal', [4.6, 1.8, 8.6], 0.35, 0.35, 1.0, 7, 0x6a4a3a);
    b.cylinder('metal', [3.9, 1.8, 8.9], 0.35, 0.35, 1.0, 7, 0x4a5a6a);
    b.box('paint', [5, 1.95, 7.2], [0.6, 1.3, 0.5], 0xc83a2a); // pompe à carburant (phase 3)
    for (const z of [12, 24, 36]) {
      b.tube('wood', [1.45, 1.3, z], [1.45, 3.0, z], 0.07, 0.07, 4, WOOD_DARK);
      b.box('window', [1.45, 3.1, z], [0.25, 0.3, 0.25], 0xffffff);
      glows.add(1.45, 3.1, z, 0xffc070, 1.6, 0.9, 1);
    }
    for (let z = 12; z <= 36; z += 4) this.colliders.push({ x: 0, z, r: 2, kind: 'dock' });
    for (const x of [-4, 0, 4]) this.colliders.push({ x, z: 7.5, r: 3, kind: 'dock' });

    // --- Cabanes sur pilotis ---
    const huts = [
      { x: -6, z: 48, rot: 0, w: 6, d: 4.5, color: 0x8ab4c8, sign: true },   // poissonnerie
      { x: 11, z: 55, rot: -0.5, w: 4, d: 4, color: 0xd88a6a },
      { x: -15, z: 63, rot: 0.6, w: 4.2, d: 3.8, color: 0xa8c890 },
      { x: 8, z: 73, rot: 0.2, w: 3.5, d: 3.5, color: 0xd8c890 },
    ];
    for (const h of huts) this.makeHut(b, h);

    // --- Phare ---
    const LX = 20, LZ = 58;
    const base = 1.4;
    b.cylinder('rock', [LX, base + 0.6, LZ], 2.4, 2.7, 1.6, 8, 0x8a8880);
    const levels = 7;
    for (let i = 0; i < levels; i++) {
      const r0 = 2.0 - (0.75 * i) / levels, r1 = 2.0 - (0.75 * (i + 1)) / levels;
      b.cylinder('paint', [LX, base + 1.4 + i * 2 + 1, LZ], r1, r0, 2, 8, i % 2 ? 0xe8e4dc : 0xb83a30);
    }
    const topY = base + 1.4 + levels * 2;
    b.cylinder('metal', [LX, topY + 0.12, LZ], 1.9, 1.9, 0.25, 8, 0x30343a);
    b.cylinder('window', [LX, topY + 1.05, LZ], 1.0, 1.0, 1.6, 8, 0xffffff);
    b.cone('paint', [LX, topY + 2.5, LZ], 1.35, 1.3, 8, 0xb83a30);
    this.colliders.push({ x: LX, z: LZ, r: 3 });
    const lampY = topY + 1.05;
    glows.add(LX, lampY, LZ, 0xfff0b0, 5, 1, 1);

    // --- Palmiers et rochers de l'île ---
    const taken = huts.map((h) => [h.x, h.z]).concat([[LX, LZ], [0, 40]]);
    let placed = 0;
    for (let t = 0; t < 80 && placed < 11; t++) {
      const ratio = rng.float(0.15, 0.8), ang = rng.float(0, Math.PI * 2);
      const x = P.x + Math.cos(ang) * ratio * P.radius, z = P.z + Math.sin(ang) * ratio * P.radius;
      if (taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 7)) continue;
      makePalm(b, rng, x, groundAt(rings, ratio) - 0.3, z, rng.float(5, 8));
      taken.push([x, z]);
      placed++;
    }
    for (let i = 0; i < 6; i++) {
      const ang = rng.float(Math.PI * 0.1, Math.PI * 0.9) + Math.PI; // côté nord, hors ponton
      makeRock(b, rng, P.x + Math.cos(ang + 0.6) * P.radius * 1.02, rng.float(-0.5, 0.2), P.z + Math.sin(ang + 0.6) * P.radius * 1.02, rng.float(1, 2));
    }

    this.group = b.build();
    scene.add(this.group);

    // --- Faisceau du phare (visible la nuit) ---
    const beamLen = 48;
    const beamGeo = new THREE.ConeGeometry(3.2, beamLen, 6, 4, true);
    beamGeo.translate(0, -beamLen / 2, 0);
    beamGeo.rotateZ(Math.PI / 2);
    // Le faisceau s'estompe vers son extrémité (couleur de sommet décroissante).
    const bp = beamGeo.attributes.position;
    const fade = new Float32Array(bp.count * 3);
    for (let i = 0; i < bp.count; i++) {
      const k = Math.pow(1 - Math.min(1, bp.getX(i) / beamLen), 1.5);
      fade.set([k, k, k], i * 3);
    }
    beamGeo.setAttribute('color', new THREE.BufferAttribute(fade, 3));
    this.beamMat = createPS1Material({
      color: 0xffe8a0, vertexColors: true, lit: false, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fogAmount: 0.5,
    });
    this.beam = new THREE.Group();
    const b1 = new THREE.Mesh(beamGeo, this.beamMat);
    const b2 = new THREE.Mesh(beamGeo, this.beamMat);
    b2.rotation.y = Math.PI;
    this.beam.add(b1, b2);
    this.beam.position.set(LX, lampY, LZ);
    this.beam.renderOrder = 4;
    b1.renderOrder = b2.renderOrder = 4;
    scene.add(this.beam);

    // Zone d'amarrage (servira à la vente en phase 2).
    this.dock = { x: 8, z: 7, r: 9 };
  }

  makeHut(b, h) {
    const { x, z, rot, w, d, color } = h;
    const c = Math.cos(rot), s = Math.sin(rot);
    const L = (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
    const floor = 2.0;
    for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
      b.tube('wood', L(lx, -0.5, lz), L(lx, floor, lz), 0.15, 0.15, 5, WOOD_DARK);
    }
    b.box('wood', L(0, floor, 0), [w + 0.6, 0.2, d + 0.6], 0x9a7a50, rot);
    b.box('paint', L(0, floor + 1.3, 0), [w, 2.6, d], color, rot);
    b.box('wood', L(0, floor + 0.95, -d / 2 - 0.03), [0.9, 1.7, 0.08], 0x5a3a24, rot);
    for (const lx of [-w * 0.3, w * 0.3]) {
      if (Math.abs(lx) < 0.8) continue;
      b.box('window', L(lx, floor + 1.5, -d / 2 - 0.03), [0.7, 0.6, 0.06], 0xffffff, rot);
      const p = L(lx, floor + 1.5, -d / 2 - 0.3);
      this.glows.add(p[0], p[1], p[2], 0xffb860, 1.1, 0.7, 1);
    }
    b.box('window', L(w / 2 + 0.03, floor + 1.5, 0), [0.06, 0.6, 0.7], 0xffffff, rot);
    b.cone('thatch', L(0, floor + 2.6 + 1.0, 0), Math.max(w, d) * 0.78, 2.0, 4, 0xc8a860, rot + Math.PI / 4);
    if (h.sign) {
      b.box('paint', L(0, floor + 2.95, -d / 2 - 0.12), [2.6, 0.6, 0.1], 0xd8b040, rot);
      b.box('wood', L(0, floor + 2.95, -d / 2 - 0.08), [2.8, 0.75, 0.05], 0x5a3a24, rot);
    }
    this.colliders.push({ x, z, r: Math.max(w, d) * 0.7 });
  }

  update(dt, night) {
    this.beam.rotation.y += dt * 0.6;
    this.beamMat.uniforms.uOpacity.value = Math.max(0, night - 0.5) * 2 * 0.22;
  }
}
