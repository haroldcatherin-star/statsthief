// Construit des modèles low-poly à facettes, avec couleurs par sommet.
// Chaque « calque » (layer) correspond à un matériau (wood, paint, leaf...) :
// un modèle entier = un mesh par matériau, donc très peu d'appels de dessin.
import * as THREE from 'three';
import { getMaterial } from './PS1Material.js';
import { hash3 } from '../core/Random.js';

const _cb = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _tmp = new THREE.Color();

const toColor = (c) => (c instanceof THREE.Color ? c : _tmp.set(c));
const v3 = (a) => (a instanceof THREE.Vector3 ? a : new THREE.Vector3(a[0], a[1], a[2]));

export class MeshBuilder {
  constructor({ uvScale = 0.5, jitter = 0.04, rng = Math.random } = {}) {
    this.layers = new Map();
    this.uvScale = uvScale;
    this.jitter = jitter;
    this.rng = rng;
    this.matrix = null; // transformation optionnelle appliquée à tout ce qui est ajouté
  }

  _layer(name) {
    if (!this.layers.has(name)) this.layers.set(name, { p: [], n: [], c: [], u: [] });
    return this.layers.get(name);
  }

  // color : couleur fixe ou fonction (sommet, normale) -> couleur
  tri(layer, a, b, c, color, uvs = null) {
    if (this.matrix) {
      a = a.clone().applyMatrix4(this.matrix);
      b = b.clone().applyMatrix4(this.matrix);
      c = c.clone().applyMatrix4(this.matrix);
    }
    _cb.subVectors(c, b);
    _ab.subVectors(a, b);
    _n.crossVectors(_cb, _ab);
    const len = _n.length();
    if (len < 1e-9) return;
    _n.divideScalar(len);

    const L = this._layer(layer);
    const j = 1 + (this.rng() - 0.5) * 2 * this.jitter;
    const verts = [a, b, c];
    for (let i = 0; i < 3; i++) {
      const v = verts[i];
      L.p.push(v.x, v.y, v.z);
      L.n.push(_n.x, _n.y, _n.z);
      const col = typeof color === 'function' ? toColor(color(v, _n)) : toColor(color);
      L.c.push(col.r * j, col.g * j, col.b * j);
      if (uvs) {
        L.u.push(uvs[i][0], uvs[i][1]);
      } else {
        const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
        const s = this.uvScale;
        if (ay >= ax && ay >= az) L.u.push(v.x * s, v.z * s);
        else if (ax >= az) L.u.push(v.z * s, v.y * s);
        else L.u.push(v.x * s, v.y * s);
      }
    }
  }

  // Triangle orienté pour que sa normale s'éloigne du point « inside ».
  triOut(layer, a, b, c, color, inside, uvs = null) {
    _cb.subVectors(c, b);
    _ab.subVectors(a, b);
    _n.crossVectors(_cb, _ab);
    const cx = (a.x + b.x + c.x) / 3 - inside.x;
    const cy = (a.y + b.y + c.y) / 3 - inside.y;
    const cz = (a.z + b.z + c.z) / 3 - inside.z;
    if (_n.x * cx + _n.y * cy + _n.z * cz < 0) this.tri(layer, a, c, b, color, uvs && [uvs[0], uvs[2], uvs[1]]);
    else this.tri(layer, a, b, c, color, uvs);
  }

  quad(layer, a, b, c, d, color, uvs = null) {
    this.tri(layer, a, b, c, color, uvs && [uvs[0], uvs[1], uvs[2]]);
    this.tri(layer, a, c, d, color, uvs && [uvs[0], uvs[2], uvs[3]]);
  }

  quadOut(layer, a, b, c, d, color, inside) {
    this.triOut(layer, a, b, c, color, inside);
    this.triOut(layer, a, c, d, color, inside);
  }

  // Ajoute une géométrie Three.js (transformée par matrix).
  geometry(layer, geom, matrix, color, deform = null) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    const pos = g.attributes.position;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      if (deform) { deform(a); deform(b); deform(c); }
      a.applyMatrix4(matrix); b.applyMatrix4(matrix); c.applyMatrix4(matrix);
      this.tri(layer, a, b, c, color);
    }
    if (g !== geom) g.dispose();
    geom.dispose();
  }

  box(layer, pos, size, color, rotY = 0) {
    _q.setFromAxisAngle(_up, rotY);
    _m.compose(v3(pos), _q, _s);
    this.geometry(layer, new THREE.BoxGeometry(size[0], size[1], size[2]), _m.clone(), color);
  }

  // Cylindre centré sur pos.
  cylinder(layer, pos, rTop, rBot, h, seg, color, rotY = 0) {
    _q.setFromAxisAngle(_up, rotY);
    _m.compose(v3(pos), _q, _s);
    this.geometry(layer, new THREE.CylinderGeometry(rTop, rBot, h, seg, 1), _m.clone(), color);
  }

  cone(layer, pos, r, h, seg, color, rotY = 0) {
    this.cylinder(layer, pos, 0, r, h, seg, color, rotY);
  }

  // Tube entre deux points a et b.
  tube(layer, a, b, r0, r1, seg, color) {
    a = v3(a); b = v3(b);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-6) return;
    dir.divideScalar(len);
    const q = new THREE.Quaternion().setFromUnitVectors(_up, dir);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const m = new THREE.Matrix4().compose(mid, q, _s);
    this.geometry(layer, new THREE.CylinderGeometry(r1, r0, len, seg, 1), m, color);
  }

  // Rocher / corail : icosaèdre déformé de façon stable.
  ico(layer, pos, radius, color, { jitter = 0.3, scaleY = 1, rotY = 0 } = {}) {
    const p = v3(pos);
    const seed = p.x * 0.37 + p.z * 0.71;
    const deform = (v) => {
      const k = 1 + (hash3(v.x + seed, v.y, v.z - seed) - 0.5) * 2 * jitter;
      v.multiplyScalar(k);
      v.y *= scaleY;
    };
    _q.setFromAxisAngle(_up, rotY);
    const m = new THREE.Matrix4().compose(p, _q, _s);
    this.geometry(layer, new THREE.IcosahedronGeometry(radius, 0), m, color, deform);
  }

  build() {
    const group = new THREE.Group();
    for (const [name, L] of this.layers) {
      if (!L.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(L.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(L.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(L.c, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(L.u, 2));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, getMaterial(name));
      mesh.name = name;
      group.add(mesh);
    }
    return group;
  }
}
