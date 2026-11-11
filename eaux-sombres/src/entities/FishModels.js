// Modèles de poissons low-poly générés à partir de config/fish.js (look).
// Le corps fait 1 unité de long, tête vers +X ; on met à l'échelle selon la taille réelle.
import * as THREE from 'three';
import { FISH } from '../../config/fish.js';
import { MeshBuilder } from '../render/MeshBuilder.js';
import { hash3 } from '../core/Random.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Profil du corps : [x, hauteur relative]
const PROFILE = [[-0.5, 0.0], [-0.42, 0.3], [-0.25, 0.75], [-0.02, 1.0], [0.22, 0.88], [0.4, 0.55], [0.5, 0.12]];
const EEL = [[-0.5, 0.0], [-0.4, 0.5], [-0.2, 0.85], [0.0, 1.0], [0.2, 1.0], [0.38, 0.9], [0.5, 0.35]];

const cache = new Map();

function build(look) {
  const b = new MeshBuilder({ jitter: 0.03 });
  const H = look.height;
  const eel = look.tail === 'eel';
  const prof = eel ? EEL : PROFILE;
  const seg = 6;
  const body = new THREE.Color(look.body);
  const belly = new THREE.Color(look.belly);
  const dark = body.clone().multiplyScalar(0.55);

  const color = (v) => {
    let c = v.y > -0.05 * H ? body : belly;
    if (look.spots && hash3(v.x * 9, v.y * 9, v.z * 9) > 0.62) c = dark;
    if (look.stripes && v.y > 0 && Math.floor((v.x + 0.5) * 9) % 2 === 0) c = dark;
    return c;
  };

  const rings = prof.map(([x, h]) => {
    const hh = (h * H) / 2;
    const ww = hh * (eel ? 0.9 : 0.45);
    if (hh < 1e-4) return [V(x, 0, 0)];
    const row = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      row.push(V(x, Math.cos(a) * hh, Math.sin(a) * ww));
    }
    return row;
  });

  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    const inside = V((prof[k][0] + prof[k + 1][0]) / 2, 0, 0);
    for (let i = 0; i < seg; i++) {
      const i2 = (i + 1) % seg;
      if (A.length === 1) b.triOut('noise', A[0], B[i], B[i2], color, inside);
      else if (B.length === 1) b.triOut('noise', A[i], A[i2], B[0], color, inside);
      else b.quadOut('noise', A[i], A[i2], B[i2], B[i], color, inside);
    }
  }

  // Queue
  const fin = look.fin;
  const tx = -0.5;
  if (look.tail === 'fork') {
    b.tri('fin', V(tx + 0.04, 0, 0), V(tx - 0.2, H * 0.6, 0), V(tx - 0.1, 0, 0), fin);
    b.tri('fin', V(tx + 0.04, 0, 0), V(tx - 0.1, 0, 0), V(tx - 0.2, -H * 0.6, 0), fin);
  } else if (look.tail === 'fan' || look.tail === 'round') {
    const r = look.tail === 'fan' ? 0.55 : 0.4;
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const a = (-0.5 + i / 4) * 1.6;
      pts.push(V(tx - Math.cos(a) * 0.18, Math.sin(a) * H * r * 1.2, 0));
    }
    for (let i = 0; i < 4; i++) b.tri('fin', V(tx + 0.04, 0, 0), pts[i], pts[i + 1], fin);
  }

  // Nageoire dorsale (longue pour l'anguille), ventrale et pectorales
  const top = (H / 2) * 0.95;
  if (eel) {
    b.quad('fin', V(-0.45, top * 0.5, 0), V(0.3, top, 0), V(0.3, top + H * 0.35, 0), V(-0.5, top * 0.6 + H * 0.2, 0), fin);
  } else {
    b.tri('fin', V(-0.2, top * 0.8, 0), V(0.15, top * 0.95, 0), V(-0.1, top + H * 0.45, 0), fin);
    b.tri('fin', V(-0.15, -top * 0.8, 0), V(0.05, -top * 0.9, 0), V(-0.12, -top - H * 0.25, 0), fin);
    for (const s of [-1, 1]) {
      b.tri('fin', V(0.2, -H * 0.1, s * H * 0.2), V(0.12, -H * 0.2, s * H * 0.2), V(0.02, -H * 0.3, s * H * 0.45), fin);
    }
  }

  // Yeux
  const ex = eel ? 0.42 : 0.35;
  for (const s of [-1, 1]) {
    b.box('flat', [ex, H * 0.12, s * H * (eel ? 0.42 : 0.2)], [0.05, 0.05, 0.02], 0x101010);
  }
  // Leurre lumineux (poisson-lanterne)
  if (look.glow) {
    b.tube('flat', [0.42, H * 0.4, 0], [0.62, H * 0.75, 0], 0.01, 0.01, 3, 0x303030);
    b.ico('glow', [0.64, H * 0.78, 0], 0.045, look.glow, { jitter: 0 });
  }
  return b.build();
}

// Renvoie un nouveau groupe (géométries partagées) mis à l'échelle (taille en cm).
export function getFishModel(id, sizeCm = 40) {
  if (!cache.has(id)) cache.set(id, build(FISH[id].look));
  const g = cache.get(id).clone();
  const s = (sizeCm / 100) * 1.4; // légèrement grossi pour la lisibilité
  g.scale.setScalar(s);
  return g;
}
