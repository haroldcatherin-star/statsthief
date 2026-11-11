// Matériau « PS1 » commun à tout le jeu :
//  - vertex snapping (les sommets s'alignent sur la grille de pixels basse résolution)
//  - textures affines (sans correction de perspective)
//  - éclairage par sommet (soleil/lune + ambiance + lanterne du bateau)
//  - brouillard par sommet
import * as THREE from 'three';
import { Tex } from './TextureGen.js';

const vec4s = () => [0, 1, 2, 3].map(() => new THREE.Vector4());

// Uniformes partagés : on les modifie une fois par image, tous les matériaux suivent.
export const GLOBAL = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(320, 240) },
  uSnap: { value: 1 },
  uAffine: { value: 1 },
  uFogColor: { value: new THREE.Color(0.6, 0.7, 0.8) },
  uFogNear: { value: 20 },
  uFogFar: { value: 160 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunColor: { value: new THREE.Color(1, 1, 1) },
  uAmbient: { value: new THREE.Color(0.3, 0.3, 0.35) },
  uNight: { value: 0 },
  uLampPos: { value: new THREE.Vector3() },
  uLampColor: { value: new THREE.Color(0, 0, 0) },
  uLampRange: { value: 16 },
  // Océan
  uWaveA: { value: vec4s() },  // dirX, dirZ, k, amplitude
  uWaveB: { value: vec4s() },  // omega, phase
  uWaveScale: { value: 1 },
  uWaterColor: { value: new THREE.Color(0.1, 0.5, 0.6) },
  uWaterDeep: { value: new THREE.Color(0.05, 0.3, 0.4) },
  uFoamColor: { value: new THREE.Color(0.8, 0.9, 0.9) },
  uWaterOpacity: { value: 0.8 },
};

export const COMMON_GLSL = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform float uSnap;
uniform float uAffine;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform float uNight;
uniform vec3 uLampPos;
uniform vec3 uLampColor;
uniform float uLampRange;

vec4 ps1Snap(vec4 clip) {
  if (uSnap > 0.0 && clip.w > 0.0) {
    vec2 grid = uResolution * 0.5 / uSnap;
    vec2 ndc = clip.xy / clip.w;
    ndc = floor(ndc * grid + 0.5) / grid;
    clip.xy = ndc * clip.w;
  }
  return clip;
}
`;

// Même formule que Ocean.heightAt() côté JS.
export const WAVES_GLSL = /* glsl */ `
uniform vec4 uWaveA[4];
uniform vec4 uWaveB[4];
uniform float uWaveScale;
void waveSample(vec2 p, float t, out float h, out vec3 n) {
  h = 0.0;
  float dx = 0.0;
  float dz = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 a = uWaveA[i];
    vec4 b = uWaveB[i];
    float ph = a.z * dot(a.xy, p) - b.x * t + b.y;
    float A = a.w * uWaveScale;
    h += A * sin(ph);
    float c = A * a.z * cos(ph);
    dx += c * a.x;
    dz += c * a.y;
  }
  n = normalize(vec3(-dx, 1.0, -dz));
}
`;

const VERT = /* glsl */ `
${COMMON_GLSL}
uniform vec3 uColor;
uniform float uLit;
uniform float uTwoSided;
uniform vec3 uEmissive;
uniform float uEmissiveNight;
uniform float uFogAmount;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
uniform float uOpacity;

#ifdef WAVES
${WAVES_GLSL}
uniform vec3 uWaterColor;
uniform vec3 uWaterDeep;
uniform vec3 uFoamColor;
uniform float uWaterOpacity;
#endif

varying vec3 vUvW;
varying vec2 vUvP;
varying vec3 vLight;
varying float vFog;
varying float vAlpha;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 base = uColor;
#ifdef USE_COLOR
  base *= color;
#endif
  vAlpha = uOpacity;

#ifdef WAVES
  float h;
  vec3 wn;
  waveSample(wp.xz, uTime, h, wn);
  wp.y += h;
  n = wn;
  float hn = h / (uWaveScale * 1.1 + 0.001);
  base *= mix(uWaterDeep, uWaterColor, clamp(0.5 + hn * 0.5, 0.0, 1.0));
  base = mix(base, uFoamColor, smoothstep(0.6, 1.0, hn) * 0.6);
#endif

  vec2 uvv;
#ifdef WORLD_UV
  uvv = wp.xz * uUvScale + uUvOffset * uTime;
#else
  uvv = uv * uUvScale + uUvOffset * uTime;
#endif

  vec4 mv = viewMatrix * wp;
  vec4 clip = ps1Snap(projectionMatrix * mv);
  gl_Position = clip;

  // Astuce affine : on interpole uv*w et w, puis on divise par pixel.
  vUvW = vec3(uvv * clip.w, clip.w);
  vUvP = uvv;

  vec3 light = vec3(1.0);
  if (uLit > 0.5) {
    float d = dot(n, uSunDir);
    d = uTwoSided > 0.5 ? abs(d) : max(d, 0.0);
    light = uAmbient + uSunColor * d;
    vec3 lv = uLampPos - wp.xyz;
    float ld = length(lv);
    float la = clamp(1.0 - ld / uLampRange, 0.0, 1.0);
    float lnd = dot(n, lv / max(ld, 0.001));
    lnd = uTwoSided > 0.5 ? abs(lnd) : max(lnd, 0.0);
    light += uLampColor * la * la * (0.35 + 0.65 * lnd);
  }
  vLight = base * light + uEmissive * mix(1.0, uNight, uEmissiveNight);

#ifdef WAVES
  vec3 V = normalize(cameraPosition - wp.xyz);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  vec3 R = reflect(-uSunDir, n);
  float spec = pow(max(dot(R, V), 0.0), 24.0);
  vLight = mix(vLight, uFogColor, fres * 0.5) + uSunColor * spec * 0.55;
  vAlpha = mix(uWaterOpacity, 1.0, fres);
#endif

  float dist = length(mv.xyz);
  vFog = clamp((dist - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0) * uFogAmount;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uAffine;
uniform float uAffineAmount;
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uAlphaTest;

varying vec3 vUvW;
varying vec2 vUvP;
varying vec3 vLight;
varying float vFog;
varying float vAlpha;

void main() {
  vec2 uvA = vUvW.xy / vUvW.z;
  vec2 uvv = mix(vUvP, uvA, uAffine * uAffineAmount);
  vec4 tex = vec4(1.0);
  if (uHasMap > 0.5) tex = texture2D(uMap, uvv);
  if (tex.a < uAlphaTest) discard;
  vec3 c = tex.rgb * vLight;
  c = mix(c, uFogColor, vFog);
  gl_FragColor = vec4(c, tex.a * vAlpha);
}
`;

export function createPS1Material(opts = {}) {
  const {
    map = null,
    color = 0xffffff,
    vertexColors = false,
    lit = true,
    twoSided = false,
    emissive = 0x000000,
    emissiveNight = 0,
    fogAmount = 1,
    alphaTest = 0,
    transparent = false,
    opacity = 1,
    side = THREE.FrontSide,
    uvScale = [1, 1],
    uvOffset = [0, 0],
    worldUV = false,
    waves = false,
    affine = 1,
    depthWrite = true,
    blending = THREE.NormalBlending,
  } = opts;

  const defines = {};
  if (waves) defines.WAVES = '';
  if (worldUV) defines.WORLD_UV = '';

  return new THREE.ShaderMaterial({
    uniforms: {
      ...GLOBAL,
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uColor: { value: new THREE.Color(color) },
      uLit: { value: lit ? 1 : 0 },
      uTwoSided: { value: twoSided ? 1 : 0 },
      uEmissive: { value: new THREE.Color(emissive) },
      uEmissiveNight: { value: emissiveNight },
      uFogAmount: { value: fogAmount },
      uAlphaTest: { value: alphaTest },
      uOpacity: { value: opacity },
      uUvScale: { value: new THREE.Vector2(uvScale[0], uvScale[1]) },
      uUvOffset: { value: new THREE.Vector2(uvOffset[0], uvOffset[1]) },
      uAffineAmount: { value: affine },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines,
    vertexColors,
    transparent,
    side,
    depthWrite,
    blending,
  });
}

// Matériaux prêts à l'emploi : la texture donne le détail (en gris),
// la couleur vient des sommets (palette limitée).
const PRESETS = {
  flat: {},
  noise: { map: 'noise' },
  wood: { map: 'wood' },
  paint: { map: 'paint' },
  sand: { map: 'sand' },
  rock: { map: 'rock' },
  thatch: { map: 'thatch' },
  metal: { map: 'metal' },
  leaf: { map: 'leaf', alphaTest: 0.5, side: THREE.DoubleSide, twoSided: true },
  window: { color: 0x3a3a44, emissive: 0xffc870, emissiveNight: 1 },
  fin: { side: THREE.DoubleSide, twoSided: true },
  glow: { lit: false },
};

const materialCache = new Map();

export function getMaterial(name) {
  if (!materialCache.has(name)) {
    const p = PRESETS[name];
    if (!p) throw new Error(`Matériau inconnu : ${name}`);
    materialCache.set(name, createPS1Material({
      vertexColors: true,
      ...p,
      map: p.map ? Tex(p.map) : null,
    }));
  }
  return materialCache.get(name);
}
