import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Giant {
  constructor(game) {
    this.game = game;
    this.mesh = null;
  }

  loadModel() {
    return new Promise((resolve, reject) => {
      new GLTFLoader().load('assets/models/giant.glb', (gltf) => {
        this.mesh = gltf.scene;
        this.mesh.scale.setScalar(10);
        this.game.scene.add(this.mesh);
        resolve();
      }, undefined, reject);
    });
  }

  updatePosition() {
    if (!this.mesh) return;
    const castle = this.game.castle.getPosition();
    this.mesh.position.set(castle.x + 20, castle.y - 10, castle.z);
  }

  update(dt) {
    if (this.mesh) this.mesh.rotation.y += dt * 0.2;
  }
}
