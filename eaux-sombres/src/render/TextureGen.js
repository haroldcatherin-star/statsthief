// Textures générées dans un canvas (32x32 ou 16x16), sans filtrage.
// La plupart sont en niveaux de gris : la couleur vient des sommets.
import * as THREE from 'three';
import { RNG, tileNoise } from '../core/Random.js';

const cache = new Map();

function makeTexture(size, draw, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rng = new RNG(seed);
  const set = (x, y, r, g, b, a = 255) => {
    x = ((x % size) + size) % size;
    y = ((y % size) + size) % size;
    const i = (y * size + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
  };
  draw({ size, rng, set });
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

const q = (v, step = 8) => Math.max(0, Math.min(255, Math.round(v / step) * step));
const gray = (set, x, y, v) => { const c = q(v); set(x, y, c, c, c); };

const GENERATORS = {
  noise({ size, rng, set }) {
    const n = tileNoise(size, 4, rng);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      gray(set, x, y, 200 + n[y * size + x] * 45 + rng.float(-8, 8));
    }
  },

  wood({ size, rng, set }) {
    const n = tileNoise(size, 4, rng);
    for (let y = 0; y < size; y++) {
      const plank = Math.floor(y / 8);
      const base = 180 + ((plank * 37) % 5) * 9;
      const off = plank * 11;
      for (let x = 0; x < size; x++) {
        let v = base + Math.sin((x + off) * 0.55 + n[y * size + x] * 4) * 12;
        if (y % 8 === 7) v = 110;
        if ((x + off * 3) % 32 === 0 && y % 8 === 3) v = 120; // clou
        gray(set, x, y, v + rng.float(-5, 5));
      }
    }
  },

  paint({ size, rng, set }) {
    const n = tileNoise(size, 4, rng);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let v = 232 + n[y * size + x] * 16;
      if (rng.chance(0.05)) v = 185;
      if (y > size - 6 && rng.chance(0.25)) v -= 30; // traînées de crasse
      gray(set, x, y, v);
    }
  },

  sand({ size, rng, set }) {
    const n = tileNoise(size, 4, rng);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let v = 205 + n[y * size + x] * 35;
      if (rng.chance(0.08)) v = 170;
      else if (rng.chance(0.05)) v = 255;
      gray(set, x, y, v);
    }
  },

  rock({ size, rng, set }) {
    const n = tileNoise(size, 4, rng);
    const f = tileNoise(size, 16, rng);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      gray(set, x, y, 150 + n[y * size + x] * 70 + f[y * size + x] * 25);
    }
    for (let c = 0; c < 4; c++) { // fissures
      let x = rng.int(0, size), y = rng.int(0, size);
      for (let i = 0; i < 12; i++) {
        gray(set, x, y, 95);
        x += rng.int(-1, 1); y += 1;
      }
    }
  },

  thatch({ size, rng, set }) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let v = 190 + ((x * 7) % 5) * 10 + rng.float(-10, 10);
      if (y % 8 === 7) v = 140;
      gray(set, x, y, v);
    }
  },

  metal({ size, rng, set }) {
    const n = tileNoise(size, 4, rng);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = n[y * size + x];
      if (v > 0.72) set(x, y, q(170), q(115), q(80)); // rouille
      else gray(set, x, y, 175 + v * 35);
    }
  },

  water({ size, rng, set }) {
    const n = tileNoise(size, 4, rng);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      gray(set, x, y, 200 + n[y * size + x] * 30);
    }
    for (let i = 0; i < 14; i++) { // reflets clairs
      const x = rng.int(0, size), y = rng.int(0, size), l = rng.int(2, 4);
      for (let k = 0; k < l; k++) gray(set, x + k, y, 255);
    }
    for (let i = 0; i < 10; i++) { // creux sombres
      const x = rng.int(0, size), y = rng.int(0, size), l = rng.int(2, 3);
      for (let k = 0; k < l; k++) gray(set, x + k, y, 165);
    }
  },

  leaf({ size, rng, set }) {
    // fond transparent, palme dans l'axe vertical (v = longueur)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, 0, 0, 0, 0);
    const mid = size / 2;
    for (let y = 0; y < size; y++) {
      const taper = Math.sin((Math.PI * (y + 2)) / (size + 2));
      const reach = Math.floor(taper * (mid - 1));
      if (y % 2 === 0) {
        for (let k = 1; k <= reach; k++) {
          const yy = y - Math.floor(k / 3);
          const g = 140 + rng.int(0, 50);
          set(mid + k, yy, 50 + rng.int(0, 30), g, 40 + rng.int(0, 20));
          set(mid - k, yy, 50 + rng.int(0, 30), g, 40 + rng.int(0, 20));
        }
      }
      set(mid, y, 110, 120, 50);
      set(mid - 1, y, 100, 110, 45);
    }
  },

  sun({ size, set }) {
    const c = size / 2 - 0.5;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d < 5) set(x, y, 255, 250, 230);
      else if (d < 6.5) set(x, y, 255, 220, 160);
      else if (d < 7.5 && (x + y) % 2 === 0) set(x, y, 255, 200, 120, 200);
      else set(x, y, 0, 0, 0, 0);
    }
  },

  moon({ size, set }) {
    const c = size / 2 - 0.5;
    const craters = [[5, 6], [9, 9], [7, 10], [10, 5]];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d < 6.2) {
        const cr = craters.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 1.2);
        if (cr) set(x, y, 170, 175, 190); else set(x, y, 225, 228, 238);
      } else set(x, y, 0, 0, 0, 0);
    }
  },
};

const SIZES = { sun: 16, moon: 16 };

export function Tex(name) {
  if (!cache.has(name)) {
    const gen = GENERATORS[name];
    if (!gen) throw new Error(`Texture inconnue : ${name}`);
    let seed = 0;
    for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    cache.set(name, makeTexture(SIZES[name] || 32, gen, seed));
  }
  return cache.get(name);
}
