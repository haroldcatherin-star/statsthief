// Rendu basse résolution : la scène est dessinée dans une render target ~320x240,
// passe par la réduction de palette, puis le canvas est agrandi en nearest-neighbor (CSS).
import * as THREE from 'three';
import { GLOBAL } from './PS1Material.js';
import { PostPass } from './PostPass.js';

export class Renderer {
  constructor(canvas, cfg) {
    this.cfg = cfg;
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(1);
    this.gl.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.gl.setClearColor(0x000000, 1);
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      generateMipmaps: false,
    });
    this.post = new PostPass(cfg);
    this.ps1 = true;
    this.width = 1;
    this.height = 1;
    this.resize();
  }

  setPS1(on) {
    this.ps1 = on;
    GLOBAL.uSnap.value = on ? this.cfg.snap : 0;
    GLOBAL.uAffine.value = on ? this.cfg.affine : 0;
    this.post.setRetro(on, this.cfg);
    this.resize();
  }

  resize() {
    const aspect = window.innerWidth / window.innerHeight;
    if (this.ps1) {
      this.height = this.cfg.lowResHeight;
      this.width = Math.round(this.height * aspect);
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    }
    this.gl.setSize(this.width, this.height, false);
    this.target.setSize(this.width, this.height);
    GLOBAL.uResolution.value.set(this.width, this.height);
    return aspect;
  }

  // overlay (optionnel) : { active, render(gl, w, h) } dessiné par-dessus la scène,
  // dans la même image basse résolution (donc avec le même rendu PS1).
  render(scene, camera, overlay = null) {
    this.gl.setRenderTarget(this.target);
    this.gl.clear();
    this.gl.render(scene, camera);
    if (overlay && overlay.active) {
      this.gl.autoClear = false;
      this.gl.clearDepth();
      overlay.render(this.gl, this.width, this.height);
      this.gl.autoClear = true;
    }
    this.post.render(this.gl, this.target.texture);
  }
}
