import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class MoreCloud {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.height = 180; // Set this to be below the castle height
    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        'assets/models/moreclouds.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(20, 20, 20); // Adjust scale as needed
          this.updatePosition();
          this.game.scene.add(this.mesh);
        },
        (xhr) => {
          console.log('MoreCloud: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          console.error('An error happened while loading MoreCloud', error);
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
    if (this.mesh) {
      this.mesh.rotation.y += 0.001; // Slow rotation for visual effect
    }
  }

  getPosition() {
    return this.mesh ? this.mesh.position.clone() : new THREE.Vector3(0, this.height, 0);
  }
}