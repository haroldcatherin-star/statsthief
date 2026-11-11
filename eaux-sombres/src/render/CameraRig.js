// Caméra 3e personne : orbite au clic droit, zoom à la molette,
// revient doucement derrière le bateau quand on navigue.
import * as THREE from 'three';
import { clamp, wrapAngle } from '../core/Random.js';

export class CameraRig {
  constructor(camera, cfg) {
    this.camera = camera;
    this.cfg = cfg;
    this.yawOffset = 0;
    this.pitch = cfg.pitch;
    this.dist = cfg.distance;
    this.time = 0;
    this.lastManual = -1e9;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.ready = false;
  }

  update(dt, input, boat, ocean) {
    const cfg = this.cfg;
    this.time += dt;

    if (input.cameraDrag && (input.mouse.dx || input.mouse.dy)) {
      this.yawOffset -= input.mouse.dx * 0.006;
      this.pitch = clamp(this.pitch + input.mouse.dy * 0.004, cfg.minPitch, cfg.maxPitch);
      this.lastManual = this.time;
    }
    if (input.mouse.wheel) {
      this.dist = clamp(this.dist * Math.exp(input.mouse.wheel * 0.0012), cfg.minDistance, cfg.maxDistance);
    }
    if (this.time - this.lastManual > cfg.recenterDelay && Math.abs(boat.speed) > 1) {
      this.yawOffset = wrapAngle(this.yawOffset) * Math.exp(-dt * 1.2);
    }

    const yaw = boat.heading + Math.PI + this.yawOffset;
    this.target.set(boat.x, boat.y + cfg.height, boat.z);
    const cp = Math.cos(this.pitch);
    this.desired.set(
      this.target.x + Math.sin(yaw) * cp * this.dist,
      this.target.y + Math.sin(this.pitch) * this.dist,
      this.target.z + Math.cos(yaw) * cp * this.dist,
    );
    const minY = ocean.heightAt(this.desired.x, this.desired.z) + 0.8;
    if (this.desired.y < minY) this.desired.y = minY;

    if (!this.ready) {
      this.pos.copy(this.desired);
      this.look.copy(this.target);
      this.ready = true;
    } else {
      this.pos.lerp(this.desired, 1 - Math.exp(-dt * 8));
      this.look.lerp(this.target, 1 - Math.exp(-dt * 10));
    }
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }

  // Cap de la caméra en degrés (0 = nord = -Z, 90 = est = +X).
  get bearing() {
    const fx = this.look.x - this.pos.x, fz = this.look.z - this.pos.z;
    return (Math.atan2(fx, -fz) * 180) / Math.PI;
  }
}
