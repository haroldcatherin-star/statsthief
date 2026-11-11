// Ciel et cycle jour/nuit : dégradé, soleil, lune, étoiles,
// et pilotage des uniformes globaux (lumière, brouillard, nuit).
import * as THREE from 'three';
import { TIME_KEYFRAMES, FOG } from '../../config/environment.js';
import { GLOBAL, createPS1Material } from '../render/PS1Material.js';
import { Tex } from '../render/TextureGen.js';
import { RNG, smoothstep } from '../core/Random.js';

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'fog', 'light', 'ambient', 'sunTint'];
const SCALAR_KEYS = ['fogDist', 'night', 'stars'];

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOME_FRAG = /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uFogColor;
uniform vec3 uSunDirSky;
uniform vec3 uSunTint;
uniform float uSunVis;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 c = mix(uFogColor, uSkyHorizon, smoothstep(0.0, 0.12, y));
  c = mix(c, uSkyTop, smoothstep(0.12, 0.7, y));
  if (y < 0.0) c = uFogColor;
  float halo = pow(max(dot(d, uSunDirSky), 0.0), 48.0);
  c += uSunTint * halo * 0.45 * uSunVis;
  gl_FragColor = vec4(c, 1.0);
}
`;

const STAR_VERT = /* glsl */ `
uniform float uStars;
uniform float uTime;
uniform vec2 uResolution;
attribute float aSeed;
varying float vA;
void main() {
  float px = max(1.0, floor(uResolution.y / 240.0));
  gl_PointSize = px * (aSeed > 0.93 ? 2.0 : 1.0);
  float tw = 0.7 + 0.3 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 40.0);
  vA = uStars * (0.4 + aSeed * 0.6) * tw * smoothstep(0.02, 0.25, normalize(position).y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const STAR_FRAG = /* glsl */ `
varying float vA;
void main() {
  gl_FragColor = vec4(vec3(0.9, 0.92, 1.0), vA);
}
`;

export class Sky {
  constructor(scene) {
    this.keys = TIME_KEYFRAMES.map((k) => {
      const o = { hour: k.hour };
      for (const c of COLOR_KEYS) o[c] = new THREE.Color(k[c]);
      for (const s of SCALAR_KEYS) o[s] = k[s];
      return o;
    });
    this.p = {};
    for (const c of COLOR_KEYS) this.p[c] = new THREE.Color();
    this.sunDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3();
    this.lightDir = new THREE.Vector3();

    // Dôme
    this.domeUniforms = {
      uSkyTop: { value: new THREE.Color() },
      uSkyHorizon: { value: new THREE.Color() },
      uFogColor: GLOBAL.uFogColor,
      uSunDirSky: { value: new THREE.Vector3() },
      uSunTint: { value: new THREE.Color() },
      uSunVis: { value: 0 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(500, 16, 10),
      new THREE.ShaderMaterial({
        uniforms: this.domeUniforms,
        vertexShader: DOME_VERT,
        fragmentShader: DOME_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Étoiles
    const rng = new RNG(99);
    const n = 700;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const th = rng.float(0, Math.PI * 2);
      const y = Math.pow(rng.next(), 0.7);
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(th) * r * 470, y * 470, Math.sin(th) * r * 470], i * 3);
      seed[i] = rng.next();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.starUniforms = { uStars: { value: 0 }, uTime: GLOBAL.uTime, uResolution: GLOBAL.uResolution };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.starUniforms,
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // Soleil et lune (sprites pixelisés)
    const mk = (tex, size) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        createPS1Material({ map: tex, lit: false, fogAmount: 0, transparent: true, depthWrite: false, alphaTest: 0.1, affine: 0 }),
      );
      m.renderOrder = -8;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    this.sun = mk(Tex('sun'), 40);
    this.moon = mk(Tex('moon'), 26);
  }

  sample(hour) {
    const K = this.keys;
    let i = 0;
    while (i < K.length - 2 && hour >= K[i + 1].hour) i++;
    const a = K[i], b = K[i + 1];
    let t = (hour - a.hour) / Math.max(b.hour - a.hour, 1e-6);
    t = t * t * (3 - 2 * t);
    for (const c of COLOR_KEYS) this.p[c].copy(a[c]).lerp(b[c], t);
    for (const s of SCALAR_KEYS) this.p[s] = a[s] + (b[s] - a[s]) * t;
  }

  // zoneEnv : ambiance de la zone (Zones.env)
  update(hour, camera, zoneEnv) {
    this.sample(hour);
    const p = this.p;

    // Course du soleil : lever à l'est (+X) à 6h, coucher à l'ouest à 18h.
    const a = ((hour - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(a), Math.sin(a), -0.35).normalize();
    this.moonDir.set(-Math.cos(a), -Math.sin(a), 0.35).normalize();
    const dayW = smoothstep(-0.12, 0.08, this.sunDir.y);
    this.lightDir.copy(this.moonDir).lerp(this.sunDir, dayW);
    this.lightDir.y = Math.max(this.lightDir.y, 0.25);
    this.lightDir.normalize();

    // Uniformes globaux
    GLOBAL.uSunDir.value.copy(this.lightDir);
    GLOBAL.uSunColor.value.copy(p.light);
    GLOBAL.uAmbient.value.copy(p.ambient);
    GLOBAL.uNight.value = p.night;
    GLOBAL.uFogColor.value.copy(p.fog).multiply(zoneEnv.fogTint);
    const fs = p.fogDist * zoneEnv.fogScale;
    GLOBAL.uFogNear.value = FOG.near * fs;
    GLOBAL.uFogFar.value = FOG.far * fs;

    // Ciel
    const cam = camera.position;
    this.dome.position.copy(cam);
    this.stars.position.copy(cam);
    this.domeUniforms.uSkyTop.value.copy(p.skyTop);
    this.domeUniforms.uSkyHorizon.value.copy(p.skyHorizon).multiply(zoneEnv.fogTint);
    this.domeUniforms.uSunDirSky.value.copy(this.sunDir);
    this.domeUniforms.uSunTint.value.copy(p.sunTint);
    this.domeUniforms.uSunVis.value = smoothstep(-0.15, 0.05, this.sunDir.y) * zoneEnv.fogScale;
    this.starUniforms.uStars.value = p.stars * Math.min(1, zoneEnv.fogScale * 1.2);

    this.sun.position.copy(cam).addScaledVector(this.sunDir, 450);
    this.sun.quaternion.copy(camera.quaternion);
    this.sun.material.uniforms.uColor.value.copy(p.sunTint);
    this.sun.material.uniforms.uOpacity.value = smoothstep(-0.06, 0.03, this.sunDir.y);

    this.moon.position.copy(cam).addScaledVector(this.moonDir, 450);
    this.moon.quaternion.copy(camera.quaternion);
    this.moon.material.uniforms.uOpacity.value = smoothstep(-0.06, 0.03, this.moonDir.y) * (0.35 + 0.65 * p.night);
  }
}
