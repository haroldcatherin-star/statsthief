// Modèles de bateau supplémentaires.
// center_console : bateau de pêche sportive (coque blanche à liseré bleu marine, console centrale,
// T-top, tangons, porte-cannes, deux moteurs hors-bord).
import * as THREE from 'three';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { createPS1Material } from '../render/PS1Material.js';
import { PixelFont } from '../ui/PixelFont.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const WHITE = 0xf2f2ec;
const HULL_LOW = 0xe2e2da;
const NAVY = 0x1a2a50;
const DECK = 0xd2d2c8;
const STEEL = 0xd8dadc;

// Coque en V profond : z, demi-largeur pont, hauteur pont, demi-largeur bouchain, hauteur bouchain, quille
const CC_SECTIONS = [
  [-3.7, 1.25, 0.75, 1.15, -0.05, -0.55],
  [-2.0, 1.35, 0.78, 1.2, -0.1, -0.7],
  [0.0, 1.35, 0.85, 1.1, -0.1, -0.78],
  [1.8, 1.1, 0.98, 0.75, 0.0, -0.65],
  [3.0, 0.6, 1.15, 0.3, 0.2, -0.35],
];

function buildCCHull(b) {
  const S = CC_SECTIONS.map(([z, dw, dy, cw, cy, ky]) => {
    const rw = cw + (dw - cw) * 0.88, ry = dy - 0.16; // liseré sous le plat-bord
    return {
      dl: V(dw, dy, z), dr: V(-dw, dy, z),
      rl: V(rw, ry, z), rr: V(-rw, ry, z),
      cl: V(cw, cy, z), cr: V(-cw, cy, z), k: V(0, ky, z),
    };
  });
  const TIP = V(0, 1.28, 3.95);
  const STEM = V(0, 0.05, 3.75);
  for (let i = 0; i < S.length - 1; i++) {
    const A = S[i], B = S[i + 1];
    const zc = (A.k.z + B.k.z) / 2;
    const ins = V(0, 0.2, zc);
    b.quadOut('paint', A.dl, B.dl, B.rl, A.rl, NAVY, ins);
    b.quadOut('paint', A.dr, B.dr, B.rr, A.rr, NAVY, ins);
    b.quadOut('paint', A.rl, B.rl, B.cl, A.cl, WHITE, ins);
    b.quadOut('paint', A.rr, B.rr, B.cr, A.cr, WHITE, ins);
    b.quadOut('paint', A.cl, B.cl, B.k, A.k, HULL_LOW, ins);
    b.quadOut('paint', A.cr, B.cr, B.k, A.k, HULL_LOW, ins);
    b.quadOut('noise', A.dl, B.dl, B.dr, A.dr, DECK, V(0, -1, zc));
  }
  const L = S[S.length - 1];
  const ins = V(0, 0.2, 3.3);
  b.quadOut('paint', L.dl, TIP, STEM, L.cl, WHITE, ins);
  b.quadOut('paint', L.dr, TIP, STEM, L.cr, WHITE, ins);
  b.triOut('paint', L.cl, STEM, L.k, HULL_LOW, ins);
  b.triOut('paint', L.cr, STEM, L.k, HULL_LOW, ins);
  b.triOut('noise', L.dl, TIP, L.dr, DECK, V(0, -1, 3.5));
  const s0 = S[0], insT = V(0, 0.2, -2.5);
  b.triOut('paint', s0.dl, s0.cl, s0.k, WHITE, insT);
  b.triOut('paint', s0.dl, s0.k, s0.dr, WHITE, insT);
  b.triOut('paint', s0.dr, s0.k, s0.cr, WHITE, insT);

  // Plat-bord (liston inox) et balcon avant
  for (const side of ['dl', 'dr']) {
    for (let i = 0; i < S.length - 1; i++) {
      b.tube('metal', S[i][side].clone().add(V(0, 0.06, 0)), S[i + 1][side].clone().add(V(0, 0.06, 0)), 0.04, 0.04, 4, STEEL);
    }
    const p = S[3][side], q = S[4][side];
    b.tube('metal', p.clone().add(V(0, 0.45, 0)), q.clone().add(V(0, 0.45, 0)), 0.025, 0.025, 4, STEEL);
    b.tube('metal', q.clone().add(V(0, 0.45, 0)), TIP.clone().add(V(0, 0.4, -0.15)), 0.025, 0.025, 4, STEEL);
    b.tube('metal', p, p.clone().add(V(0, 0.45, 0)), 0.02, 0.02, 3, STEEL);
    b.tube('metal', q, q.clone().add(V(0, 0.45, 0)), 0.02, 0.02, 3, STEEL);
  }
  return S;
}

export function buildCenterConsole() {
  let seed = 7;
  const b = new MeshBuilder({ rng: () => ((seed = (seed * 16807) % 2147483647) / 2147483647) });
  buildCCHull(b);
  const dy = 0.82;

  // Console centrale, pare-brise, siège
  b.box('paint', [0, dy + 0.55, 0.3], [1.1, 1.1, 0.9], WHITE);
  b.box('paint', [0, dy + 1.12, 0.25], [1.14, 0.06, 0.95], NAVY);
  b.box('flat', [0, dy + 1.32, 0.68], [1.0, 0.36, 0.04], 0x2a3a4a);
  b.box('metal', [0, dy + 1.0, -0.18], [0.5, 0.25, 0.06], 0x202428); // tableau de bord
  b.box('paint', [0, dy + 0.4, -0.75], [0.95, 0.8, 0.5], WHITE);     // leaning post
  b.box('paint', [0, dy + 0.85, -0.75], [0.95, 0.12, 0.55], NAVY);
  b.box('paint', [0, dy + 0.25, 1.9], [0.9, 0.5, 0.6], WHITE);       // glacière avant
  b.box('paint', [0, dy + 0.52, 1.9], [0.92, 0.06, 0.62], NAVY);

  // T-top : quatre montants inox, toit blanc, radôme et antennes
  const topY = dy + 2.15;
  for (const [x, z] of [[-0.55, 0.65], [0.55, 0.65], [-0.55, -1.0], [0.55, -1.0]]) {
    b.tube('metal', [x, dy, z], [x * 1.08, topY, z * 0.95], 0.045, 0.045, 5, STEEL);
  }
  b.box('paint', [0, topY + 0.05, -0.2], [1.7, 0.1, 2.0], WHITE);
  b.box('paint', [0, topY - 0.02, -0.2], [1.74, 0.06, 2.04], NAVY);
  b.cylinder('paint', [0, topY + 0.22, -0.05], 0.26, 0.28, 0.24, 8, WHITE);
  b.tube('metal', [0.65, topY + 0.1, -0.9], [0.7, topY + 1.4, -1.0], 0.02, 0.015, 3, 0xf0f0f0);
  b.tube('metal', [-0.65, topY + 0.1, -0.9], [-0.68, topY + 0.9, -1.0], 0.02, 0.015, 3, 0x303030);

  // Tangons (outriggers) et porte-cannes à l'arrière du T-top
  for (const s of [-1, 1]) {
    b.tube('metal', [s * 0.75, topY, -0.4], [s * 2.6, topY + 3.2, -2.8], 0.035, 0.02, 4, STEEL);
  }
  for (const x of [-0.45, -0.15, 0.15, 0.45]) {
    b.tube('metal', [x, topY + 0.05, -1.15], [x * 1.6, topY + 1.7, -2.3], 0.02, 0.012, 3, 0x1a1a1a);
  }
  for (const s of [-1, 1]) { // cannes dans les porte-cannes du plat-bord
    b.tube('metal', [s * 1.15, dy + 0.1, -2.6], [s * 1.9, dy + 2.4, -4.2], 0.02, 0.012, 3, 0x1a1a1a);
  }

  // Deux moteurs hors-bord
  for (const x of [-0.5, 0.5]) {
    b.box('paint', [x, 0.95, -4.05], [0.46, 0.75, 0.6], WHITE);
    b.box('paint', [x, 1.22, -4.05], [0.48, 0.12, 0.62], NAVY);
    b.box('metal', [x, 0.25, -4.1], [0.16, 0.9, 0.3], 0x202428);
    b.box('metal', [x, -0.25, -4.12], [0.12, 0.12, 0.42], 0x202428);
  }
  // Main courante de la plateforme de bain
  b.box('noise', [0, 0.45, -3.85], [2.2, 0.08, 0.35], DECK);
  return b.build();
}

// Nom peint sur les deux flancs (texture canvas pixelisée).
export function addHullName(group, name, { z = 1.0, y = 0.5, x = 1.22, height = 0.3, color = '#1a2a50' } = {}) {
  if (!name) return;
  const font = new PixelFont();
  const w = font.measure(name) + 4;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = 12;
  font.draw(canvas.getContext('2d'), name, 2, 0, color, { shadow: false });
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  const mat = createPS1Material({ map: tex, transparent: true, alphaTest: 0.5, affine: 0 });
  const geo = new THREE.PlaneGeometry((w / 12) * height, height);
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(s * x, y, z);
    m.rotation.y = s * Math.PI / 2;
    m.rotation.x = 0;
    group.add(m);
  }
}

// Paramètres propres à chaque modèle (lanterne, sillage, dimensions pour la flottaison).
export const BOAT_SPECS = {
  trawler: { lamp: [0, 3.75, -0.9], stern: -2.9, sternHalf: 0.9, bow: 2.6, length: 6.2, width: 2.4, nameZ: 1.2, nameX: 1.08, nameY: 0.3 },
  center_console: { lamp: [0, 3.25, 0.6], stern: -3.8, sternHalf: 1.0, bow: 3.4, length: 7.6, width: 2.7, nameZ: 1.4, nameX: 1.24, nameY: 0.55 },
};
