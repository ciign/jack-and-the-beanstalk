import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Castle {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.height = game.beanstalk.targetHeight; // sits at the top of the fully grown stalk
  }

  loadModel() {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load('assets/models/castle.glb', (gltf) => {
        this.mesh = gltf.scene;
        this.mesh.scale.setScalar(5);
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

  update() {}

  getPosition() {
    return this.mesh ? this.mesh.position.clone() : new THREE.Vector3(0, this.height, 0);
  }
}
