// Points carrés pixelisés : lumières lointaines (additives, percent le brouillard)
// et particules (écume du sillage). Un seul objet = un seul appel de dessin.
import * as THREE from 'three';
import { GLOBAL } from './PS1Material.js';

const VERT = /* glsl */ `
uniform vec2 uResolution;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogAmount;
uniform float uNight;
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aNight;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float w = max(gl_Position.w, 0.001);
  gl_PointSize = clamp(aSize * projectionMatrix[1][1] * uResolution.y * 0.5 / w, 1.0, 48.0);
  float fog = clamp((length(mv.xyz) - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0) * uFogAmount;
  vAlpha = aAlpha * (1.0 - fog) * mix(1.0, uNight, aNight);
  vColor = aColor;
}
`;

const FRAG = /* glsl */ `
uniform float uSoft;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  if (d > 1.0) discard;
  float a = vAlpha * (uSoft > 0.5 ? (1.0 - d) : 1.0);
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

export class PointSprites {
  constructor(scene, capacity, { additive = true, soft = true, fogAmount = 0.35, renderOrder = 3 } = {}) {
    this.capacity = capacity;
    this.count = 0;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.night = new Float32Array(capacity);

    const g = new THREE.BufferGeometry();
    this.attrs = {
      position: new THREE.BufferAttribute(this.pos, 3),
      aColor: new THREE.BufferAttribute(this.col, 3),
      aSize: new THREE.BufferAttribute(this.size, 1),
      aAlpha: new THREE.BufferAttribute(this.alpha, 1),
      aNight: new THREE.BufferAttribute(this.night, 1),
    };
    for (const [k, a] of Object.entries(this.attrs)) {
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(k, a);
    }
    g.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uResolution: GLOBAL.uResolution,
        uFogNear: GLOBAL.uFogNear,
        uFogFar: GLOBAL.uFogFar,
        uNight: GLOBAL.uNight,
        uFogAmount: { value: fogAmount },
        uSoft: { value: soft ? 1 : 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = renderOrder;
    this.geometry = g;
    this.dirty = true;
    scene.add(this.points);
  }

  // night = 1 : visible seulement la nuit
  add(x, y, z, color, size, alpha = 1, night = 0) {
    if (this.count >= this.capacity) return -1;
    const i = this.count++;
    const c = new THREE.Color(color);
    this.pos.set([x, y, z], i * 3);
    this.col.set([c.r, c.g, c.b], i * 3);
    this.size[i] = size;
    this.alpha[i] = alpha;
    this.night[i] = night;
    this.geometry.setDrawRange(0, this.count);
    this.dirty = true;
    return i;
  }

  setPos(i, x, y, z) {
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.dirty = true;
  }
  setAlpha(i, a) { this.alpha[i] = a; this.dirty = true; }
  setSize(i, s) { this.size[i] = s; this.dirty = true; }

  update() {
    if (!this.dirty) return;
    for (const a of Object.values(this.attrs)) a.needsUpdate = true;
    this.dirty = false;
  }
}
