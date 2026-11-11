// Passe finale : réduction de palette (15 bits) + tramage Bayer 4x4.
import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uLevels;
uniform float uDither;
varying vec2 vUv;

float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
                          3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return m[x + y * 4] / 16.0;
}

void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float steps = uLevels - 1.0;
  float b = bayer4(floor(gl_FragCoord.xy)) - 0.5;
  c += b * uDither / steps;
  c = floor(c * steps + 0.5) / steps;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

export class PostPass {
  constructor(cfg) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uLevels: { value: cfg.colorLevels },
        uDither: { value: cfg.dither },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setRetro(on, cfg) {
    this.material.uniforms.uLevels.value = on ? cfg.colorLevels : 256;
    this.material.uniforms.uDither.value = on ? cfg.dither : 0;
  }

  render(gl, texture) {
    this.material.uniforms.tDiffuse.value = texture;
    gl.setRenderTarget(null);
    gl.render(this.scene, this.camera);
  }
}
