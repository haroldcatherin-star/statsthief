// Océan : grille qui suit la caméra, déformée dans le shader par la houle.
// heightAt() reproduit exactement la même formule en JS pour faire flotter les objets.
import * as THREE from 'three';
import { BALANCE } from '../../config/balance.js';
import { WAVES } from '../../config/environment.js';
import { GLOBAL, createPS1Material } from '../render/PS1Material.js';
import { Tex } from '../render/TextureGen.js';

export class Ocean {
  constructor(scene) {
    const { oceanSize, oceanSegments, seabedDepth } = BALANCE.world;
    this.cell = oceanSize / oceanSegments;

    this.waves = WAVES.map((w, i) => {
      const k = (Math.PI * 2) / w.length;
      return {
        dx: Math.cos(w.angle),
        dz: Math.sin(w.angle),
        k,
        amp: w.amplitude,
        omega: Math.sqrt(9.81 * k) * w.speed,
        phase: w.phase ?? i * 1.7,
      };
    });
    this.waves.forEach((w, i) => {
      GLOBAL.uWaveA.value[i].set(w.dx, w.dz, w.k, w.amp);
      GLOBAL.uWaveB.value[i].set(w.omega, w.phase, 0, 0);
    });

    const geo = new THREE.PlaneGeometry(oceanSize, oceanSize, oceanSegments, oceanSegments);
    geo.rotateX(-Math.PI / 2);
    this.material = createPS1Material({
      map: Tex('water'),
      waves: true,
      worldUV: true,
      uvScale: [1 / 6, 1 / 6],
      uvOffset: [0.012, 0.007],
      transparent: true,
      affine: 0.6,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);

    // Fond marin : visible à travers l'eau semi-transparente.
    const bedGeo = new THREE.PlaneGeometry(oceanSize * 1.2, oceanSize * 1.2, 12, 12);
    bedGeo.rotateX(-Math.PI / 2);
    this.bedMaterial = createPS1Material({ map: Tex('sand'), worldUV: true, uvScale: [1 / 4, 1 / 4], color: 0x3a8a80 });
    this.bed = new THREE.Mesh(bedGeo, this.bedMaterial);
    this.bed.position.y = seabedDepth;
    this.bed.frustumCulled = false;
    scene.add(this.bed);
  }

  heightAt(x, z) {
    const t = GLOBAL.uTime.value;
    const sc = GLOBAL.uWaveScale.value;
    let h = 0;
    for (const w of this.waves) {
      h += w.amp * sc * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
    }
    return h;
  }

  update(camX, camZ, seabedColor) {
    // On déplace la grille par pas entiers de cellule pour éviter que l'eau « glisse ».
    const c = this.cell;
    this.mesh.position.set(Math.round(camX / c) * c, 0, Math.round(camZ / c) * c);
    this.bed.position.x = Math.round(camX / 10) * 10;
    this.bed.position.z = Math.round(camZ / 10) * 10;
    if (seabedColor) this.bedMaterial.uniforms.uColor.value.copy(seabedColor);
  }
}
