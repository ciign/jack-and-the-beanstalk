import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Castle {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.height = 200; // Fixed height for the castle
    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        'assets/models/castle.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(5, 5, 5);
          this.updatePosition();
          this.game.scene.add(this.mesh);
        },
        (xhr) => {
          console.log('Castle: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          console.error('An error happened', error);
        }
    );
  }

  updatePosition() {
    if (this.mesh) {
      const beanstalkBase = this.game.beanstalk.getBasePosition();
      this.mesh.position.set(beanstalkBase.x, this.height, beanstalkBase.z);
    }
  }

  update() {
    // The castle doesn't need to move, but we'll keep this method in case we need to add any animations or effects later
  }

  getPosition() {
    return this.mesh ? this.mesh.position.clone() : new THREE.Vector3(0, this.height, 0);
  }
}