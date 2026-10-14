import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Jack has two states:
 *  - on the ground: left/right turn, up/down run forward/back. Walking into the
 *    beanstalk while pressing up grabs it.
 *  - on the stalk: up/down climb, left/right orbit around the stalk. Pressing
 *    down at the bottom lets go.
 * All speeds are per second and scaled by deltaTime so the feel is frame-rate independent.
 */
export class Player {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.ready = false;

    this.scale = 0.25;
    this.runSpeed = 4;        // ground movement, units/s
    this.turnSpeed = 2.2;     // ground turning, rad/s
    this.climbSpeed = 4;      // climbing, units/s
    this.orbitSpeed = 1.6;    // orbiting the stalk, rad/s
    this.stalkRadius = 0.9;   // distance from stalk centre while climbing
    this.grabDistance = 2.5;  // horizontal distance at which "up" grabs the stalk

    this.input = { forward: 0, turn: 0 };
    this.onStalk = false;
    this.stalkAngle = 0;
    this.rotationAngle = 0;
    this.groundY = 0;
    this.initialPosition = new THREE.Vector3(-10, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector3();
    this.tmp = new THREE.Vector3();

    this.setupKeyboard();
    this.setupTouchControls();
  }

  loadModel() {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        'assets/models/jack.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.setScalar(this.scale);
          this.mesh.position.copy(this.initialPosition);
          this.mesh.traverse((child) => { if (child.isMesh) child.castShadow = true; });
          this.game.scene.add(this.mesh);

          this.mixer = new THREE.AnimationMixer(this.mesh);
          gltf.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            action.loop = THREE.LoopRepeat;
            this.animations[clip.name] = action;
          });
          this.playAnimation('Idle');
          this.ready = true;
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  // ---- input -------------------------------------------------------------

  setupKeyboard() {
    const map = { ArrowUp: ['forward', 1], ArrowDown: ['forward', -1], ArrowLeft: ['turn', 1], ArrowRight: ['turn', -1],
                  w: ['forward', 1], s: ['forward', -1], a: ['turn', 1], d: ['turn', -1] };
    document.addEventListener('keydown', (e) => {
      const m = map[e.key];
      if (!m) return;
      e.preventDefault();
      this.input[m[0]] = m[1];
    });
    document.addEventListener('keyup', (e) => {
      const m = map[e.key];
      if (!m) return;
      e.preventDefault();
      if (this.input[m[0]] === m[1]) this.input[m[0]] = 0;
    });
    window.addEventListener('blur', () => { this.input.forward = 0; this.input.turn = 0; });
  }

  setupTouchControls() {
    const buttons = { up: ['forward', 1], down: ['forward', -1], left: ['turn', 1], right: ['turn', -1] };
    Object.entries(buttons).forEach(([id, [axis, value]]) => {
      const btn = document.getElementById(`${id}-btn`);
      if (!btn) return;
      const start = (e) => { e.preventDefault(); this.input[axis] = value; };
      const end = (e) => { e.preventDefault(); if (this.input[axis] === value) this.input[axis] = 0; };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('pointerleave', end);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  // ---- world queries -----------------------------------------------------

  /** Height of the terrain under (x, z); falls back to the last known ground. */
  sampleGround(x, z) {
    const terrain = this.game.nature.mesh;
    if (!terrain) return this.groundY;
    this.rayOrigin.set(x, 500, z);
    this.raycaster.set(this.rayOrigin, new THREE.Vector3(0, -1, 0));
    const hits = this.raycaster.intersectObject(terrain, true);
    return hits.length ? hits[0].point.y : this.groundY;
  }

  placeOnGround() {
    if (!this.mesh) return;
    this.groundY = this.sampleGround(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.y = this.groundY;
  }

  horizontalDistanceToStalk() {
    const base = this.game.beanstalk.getBasePosition();
    const dx = this.mesh.position.x - base.x;
    const dz = this.mesh.position.z - base.z;
    return Math.hypot(dx, dz);
  }

  // ---- update ------------------------------------------------------------

  update(dt) {
    if (!this.ready) return;
    this.mixer.update(dt);
    if (this.onStalk) this.updateOnStalk(dt);
    else this.updateOnGround(dt);
  }

  updateOnGround(dt) {
    const { forward, turn } = this.input;

    if (turn !== 0) {
      this.rotationAngle += turn * this.turnSpeed * dt;
      this.mesh.rotation.y = this.rotationAngle;
    }

    if (forward !== 0) {
      const step = forward * this.runSpeed * dt;
      this.tmp.set(Math.sin(this.rotationAngle) * step, 0, Math.cos(this.rotationAngle) * step);
      this.mesh.position.add(this.tmp);
      this.groundY = this.sampleGround(this.mesh.position.x, this.mesh.position.z);
    }
    this.mesh.position.y = this.groundY;

    // Grab the stalk when walking into it.
    if (forward > 0 && this.horizontalDistanceToStalk() < this.grabDistance) {
      this.mountStalk();
      return;
    }

    this.game.updateCameraRotation(this.rotationAngle);
    this.playAnimation(forward > 0 ? 'Run' : (forward < 0 || turn !== 0) ? 'Walk' : 'Idle');
  }

  mountStalk() {
    const base = this.game.beanstalk.getBasePosition();
    this.onStalk = true;
    this.stalkAngle = Math.atan2(this.mesh.position.z - base.z, this.mesh.position.x - base.x);
    this.groundY = base.y;
    this.mesh.position.y = Math.max(this.mesh.position.y, base.y);
  }

  dismountStalk() {
    this.onStalk = false;
    // Step back from the stalk so we do not immediately re-grab it.
    const base = this.game.beanstalk.getBasePosition();
    const r = this.grabDistance + 0.5;
    this.mesh.position.set(base.x + Math.cos(this.stalkAngle) * r, base.y, base.z + Math.sin(this.stalkAngle) * r);
    this.rotationAngle = this.mesh.rotation.y + Math.PI; // face away from the stalk
    this.mesh.rotation.y = this.rotationAngle;
    this.placeOnGround();
  }

  updateOnStalk(dt) {
    const { forward, turn } = this.input;
    const base = this.game.beanstalk.getBasePosition();
    const topY = base.y + this.game.beanstalk.getHeight();

    this.stalkAngle += turn * this.orbitSpeed * dt;
    const y = clamp(this.mesh.position.y + forward * this.climbSpeed * dt, base.y, topY);

    if (forward < 0 && y <= base.y + 0.01) {
      this.dismountStalk();
      return;
    }

    this.mesh.position.set(
      base.x + Math.cos(this.stalkAngle) * this.stalkRadius,
      y,
      base.z + Math.sin(this.stalkAngle) * this.stalkRadius
    );

    // Face the stalk: forward is +Z in model space, yaw = atan2(dx, dz) toward the centre.
    const yaw = Math.atan2(base.x - this.mesh.position.x, base.z - this.mesh.position.z);
    this.rotationAngle = yaw;
    this.mesh.rotation.set(0, yaw, 0);
    this.game.updateCameraRotation(yaw);

    this.playAnimation(forward !== 0 || turn !== 0 ? 'Walk' : 'Idle');
  }

  /** Knock Jack down the stalk a little (cloud hit). */
  knockDown(amount) {
    if (!this.onStalk) return;
    const base = this.game.beanstalk.getBasePosition();
    this.mesh.position.y = Math.max(base.y, this.mesh.position.y - amount);
  }

  reset() {
    if (!this.mesh) return;
    this.onStalk = false;
    this.input.forward = 0;
    this.input.turn = 0;
    this.rotationAngle = 0;
    this.stalkAngle = 0;
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.position.copy(this.initialPosition);
    this.placeOnGround();
    this.game.updateCameraRotation(0);
    this.playAnimation('Idle');
  }

  // ---- animation ---------------------------------------------------------

  playAnimation(name) {
    let next = this.animations[name];
    if (!next) {
      // Fall back to anything available so a renamed clip never freezes Jack.
      const names = Object.keys(this.animations);
      if (!names.length) return;
      next = this.animations[names.includes('Idle') ? 'Idle' : names[0]];
    }
    if (this.currentAction === next) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    if (this.currentAction) next.crossFadeFrom(this.currentAction, 0.25, true);
    next.play();
    this.currentAction = next;
  }

  /** Height above the base of the beanstalk, in metres for the HUD. */
  getHeight() {
    if (!this.mesh) return 0;
    const base = this.game.beanstalk.getBasePosition();
    return Math.max(0, this.mesh.position.y - base.y);
  }
}
