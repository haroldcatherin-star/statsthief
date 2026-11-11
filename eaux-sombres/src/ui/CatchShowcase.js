// Grande animation de prise : le poisson apparaît en grand au centre de l'écran (3D),
// sur un éventail de rayons lumineux, avec son nom en lettres géantes, sa rareté,
// ses mesures qui défilent et des étincelles. Se déclenche dès qu'un poisson est sorti de l'eau.
import * as THREE from 'three';
import { FISH } from '../../config/fish.js';
import { GLOBAL, createPS1Material } from '../render/PS1Material.js';
import { getFishModel } from '../entities/FishModels.js';
import { S } from '../systems/Fishing.js';
import { LINE_H, ICON } from './PixelFont.js';

const RARITY = {
  common: { label: 'COMMUN', stars: 1, color: '#e8e0c8', ray: 0x6a90b8, ray2: 0x2a3a58 },
  uncommon: { label: 'PEU COMMUN', stars: 2, color: '#7ae0d0', ray: 0x3ab0a0, ray2: 0x184a50 },
  rare: { label: 'RARE', stars: 3, color: '#ffd060', ray: 0xffb030, ray2: 0x6a3a10 },
};

const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// Éventail de rayons (triangles alternés) derrière le poisson.
function buildRays() {
  const n = 18, r = 6;
  const pos = [], col = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2;
    pos.push(0, 0, 0, Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0);
    for (let k = 0; k < 3; k++) col.push(k === 0 ? 1 : 0.35, k === 0 ? 1 : 0.35, k === 0 ? 1 : 0.35);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  const mat = createPS1Material({
    vertexColors: true, lit: false, fogAmount: 0, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(g, mat);
}

export class CatchShowcase {
  constructor({ audio }) {
    this.audio = audio;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 50);
    this.camera.position.set(0, 0, 3.4);
    this.camera.lookAt(0, 0, 0);
    this.rays = buildRays();
    this.rays.position.z = -1.5;
    this.scene.add(this.rays);
    this.model = null;
    this.catch = null;
    this.t = 0;
    this.sparks = [];
    this.starsPlayed = 0;
    this.stampPlayed = false;
  }

  get active() { return !!this.catch; }

  start(c) {
    this.stop();
    this.catch = c;
    this.t = 0;
    this.starsPlayed = 0;
    this.stampPlayed = false;
    this.info = RARITY[FISH[c.id].rarity] || RARITY.common;
    this.model = getFishModel(c.id, 100);
    this.model.scale.setScalar(1.6);
    this.scene.add(this.model);
    this.rays.material.uniforms.uColor.value.set(this.info.ray);
    this.sparks = [];
    for (let i = 0; i < 40; i++) this.spawnSpark(true);
  }

  stop() {
    if (this.model) this.scene.remove(this.model);
    this.model = null;
    this.catch = null;
  }

  spawnSpark(burst = false) {
    const a = Math.random() * Math.PI * 2;
    const sp = burst ? 60 + Math.random() * 140 : 15 + Math.random() * 30;
    this.sparks.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6 + Math.random() * 0.8, age: 0 });
  }

  // Suit l'état de la pêche : démarre quand un poisson est sorti, s'arrête ensuite.
  update(dt, fishing) {
    if (fishing.mode === S.CAUGHT && fishing.catch) {
      if (fishing.catch !== this.catch) this.start(fishing.catch);
    } else if (this.catch) {
      this.stop();
      return;
    }
    if (!this.catch) return;
    this.t += dt;
    const t = this.t;

    // Le poisson arrive en tournoyant, rebondit, puis se balance doucement.
    const k = clamp01(t / 0.6);
    const s = 1.6 * Math.max(0.01, easeOutBack(k));
    const m = this.model;
    m.scale.setScalar(s);
    m.position.set(0, 0.0 + Math.sin(t * 1.7) * 0.05 + (1 - k) * -1.2, 0);
    const spin = (1 - easeOutBack(k)) * Math.PI * 3;
    m.rotation.set(Math.sin(t * 2.3) * 0.06, Math.sin(t * 0.9) * 0.55 + spin, Math.sin(t * 3.1) * 0.08);

    this.rays.rotation.z = t * 0.35;
    this.rays.material.uniforms.uOpacity.value = clamp01(t / 0.4) * (0.5 + 0.08 * Math.sin(t * 6));

    // Étincelles 2D
    if (Math.random() < dt * 14) this.spawnSpark(false);
    for (const p of this.sparks) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-dt * 2);
      p.vy *= Math.exp(-dt * 2);
    }
    this.sparks = this.sparks.filter((p) => p.age < p.life);

    // Sons rythmant l'animation
    const stars = this.info.stars;
    while (this.starsPlayed < stars && t > 0.75 + this.starsPlayed * 0.18) {
      this.starsPlayed++;
      this.audio.play('star', { n: this.starsPlayed });
    }
    if (!this.stampPlayed && t > 1.35 && (this.catch.isNew || this.catch.isRecord)) {
      this.stampPlayed = true;
      this.audio.play('fanfare');
    }
  }

  // Rendu 3D par-dessus la scène, avec un éclairage de studio (on restaure ensuite).
  render(gl, w, h) {
    const keep = {
      dir: GLOBAL.uSunDir.value.clone(), sun: GLOBAL.uSunColor.value.clone(),
      amb: GLOBAL.uAmbient.value.clone(), lamp: GLOBAL.uLampColor.value.clone(), night: GLOBAL.uNight.value,
    };
    GLOBAL.uSunDir.value.set(0.35, 0.7, 0.62).normalize();
    GLOBAL.uSunColor.value.setRGB(1.05, 1.0, 0.92);
    GLOBAL.uAmbient.value.setRGB(0.42, 0.44, 0.5);
    GLOBAL.uLampColor.value.setRGB(0, 0, 0);
    GLOBAL.uNight.value = 1; // les leurres lumineux brillent
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    gl.render(this.scene, this.camera);
    GLOBAL.uSunDir.value.copy(keep.dir);
    GLOBAL.uSunColor.value.copy(keep.sun);
    GLOBAL.uAmbient.value.copy(keep.amb);
    GLOBAL.uLampColor.value.copy(keep.lamp);
    GLOBAL.uNight.value = keep.night;
  }

  // Partie 2D : bandes cinéma, nom géant, étoiles, mesures, tampon, consignes.
  draw(hud, inventory) {
    if (!this.catch) return;
    const c = hud.ctx, t = this.t, W = hud.w, H = hud.h;
    const f = FISH[this.catch.id];
    const info = this.info;

    // Éclair blanc à l'arrivée
    if (t < 0.35) {
      c.fillStyle = `rgba(255,255,255,${0.8 * (1 - t / 0.35)})`;
      c.fillRect(0, 0, W, H);
    }
    // Bandes cinéma
    const bar = Math.round(Math.min(1, t / 0.3) * H * 0.14);
    c.fillStyle = '#05070c';
    c.fillRect(0, 0, W, bar);
    c.fillRect(0, H - bar, W, bar);

    // Étincelles (pixels de couleur de la rareté)
    const cx = W / 2, cy = H * 0.47;
    for (const p of this.sparks) {
      c.globalAlpha = 1 - p.age / p.life;
      c.fillStyle = Math.random() < 0.3 ? '#ffffff' : info.color;
      c.fillRect(Math.round(cx + p.x), Math.round(cy + p.y), 2, 2);
    }
    c.globalAlpha = 1;

    // Nom géant qui tombe du haut avec un rebond
    const name = f.name.toUpperCase();
    const scale = Math.max(2, Math.min(4, Math.floor((W - 20) / (name.length * 6))));
    const kn = clamp01((t - 0.2) / 0.45);
    const ny = Math.round(bar + 6 - (1 - easeOutBack(kn)) * 60);
    if (t > 0.2) hud.text(name, cx, ny, info.color, { align: 'center', scale });

    // Rareté : étoiles qui apparaissent une à une
    const sy = ny + 11 * scale + 2;
    if (t > 0.7) {
      const stars = '*'.repeat(this.starsPlayed);
      hud.text(`${stars} ${info.label}`, cx, sy, info.color, { align: 'center' });
    }

    // Mesures qui défilent
    const km = clamp01((t - 1.0) / 0.6);
    if (t > 1.0) {
      const size = Math.round(this.catch.size * km);
      const weight = (this.catch.weight * km).toFixed(1);
      const value = Math.round(this.catch.value * km);
      const ly = H - bar - 34;
      hud.text(`${size} CM  ·  ${weight} KG  ·  ${value} ${ICON.coin}`, cx, ly, '#e8e0c8', { align: 'center', scale: W > 300 ? 2 : 1 });
    }

    // Tampon « nouvelle espèce » / « record »
    if (t > 1.35 && (this.catch.isNew || this.catch.isRecord)) {
      const pulse = 1 + 0.08 * Math.sin(t * 9);
      const label = this.catch.isNew ? 'NOUVELLE ESPÈCE !' : 'NOUVEAU RECORD !';
      const ks = clamp01((t - 1.35) / 0.25);
      const sc = Math.max(1, Math.round((ks < 1 ? 3 - ks : 2) * pulse * (W > 300 ? 1 : 0.6)));
      hud.text(label, cx, Math.round(H * 0.62), '#7ae08a', { align: 'center', scale: sc });
    }

    // Consignes (après l'intro)
    if (t > 1.7) {
      const blink = Math.floor(t * 2.5) % 2 === 0;
      const fits = inventory.canFit(this.catch);
      const msg = fits ? 'CLIC / E : GARDER  ·  ESPACE : RELÂCHER' : 'PAS DE PLACE DANS LA CALE !  ESPACE : RELÂCHER';
      if (blink || !fits) hud.text(msg, cx, H - bar + Math.max(2, Math.round((bar - LINE_H) / 2)), fits ? '#ffd060' : '#ff6a50', { align: 'center' });
    }
  }
}
