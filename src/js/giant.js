import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Giant {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        'assets/models/giant.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(10, 10, 10);
          this.updatePosition();
          this.game.scene.add(this.mesh);
        },
        (xhr) => {
          console.log('Giant: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          console.error('An error happened', error);
        }
    );
  }

  updatePosition() {
    if (this.mesh && this.game.castle.mesh) {
      const castlePosition = this.game.castle.getPosition();
      this.mesh.position.set(
          castlePosition.x + 20, // Offset from the castle
          castlePosition.y - 10, // Slightly below the castle
          castlePosition.z
      );
    }
  }

  update() {
    this.updatePosition();
    // Add any giant-specific update logic here
  }
}