import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class MoreCloud {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.height = 180; // just below the castle
  }

  loadModel() {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load('assets/models/moreclouds.glb', (gltf) => {
        this.mesh = gltf.scene;
        this.mesh.scale.setScalar(20);
        this.game.scene.add(this.mesh);
        resolve();
      }, undefined, reject);
    });
  }

  updatePosition() {
    if (!this.mesh) return;
    const base = this.game.beanstalk.getBasePosition();
    this.mesh.position.set(base.x, base.y + this.height, base.z);
  }

  update(dt) {
    if (this.mesh) this.mesh.rotation.y += dt * 0.05;
  }
}
