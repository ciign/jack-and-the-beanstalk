import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Obstacles {
  constructor(game) {
    this.game = game;
    this.clouds = [];
    this.cloudModel = null;
    this.loadCloudModel().then(() => {
      this.createClouds(10);
    });
  }

  loadCloudModel() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
          'assets/models/cloud.glb',
          (gltf) => {
            this.cloudModel = gltf.scene;
            this.cloudModel.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
            resolve();
          },
          (xhr) => {
            console.log('Cloud model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          (error) => {
            console.error('Error loading cloud model:', error);
            reject(error);
          }
      );
    });
  }

  createClouds(count) {
    const beanstalkHeight = this.game.beanstalk.getHeight();
    for (let i = 0; i < count; i++) {
      const cloud = this.cloudModel.clone();
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * beanstalkHeight;
      const radius = 5 + Math.random() * 5; // Vary distance from beanstalk
      cloud.position.set(
          Math.sin(angle) * radius,
          height,
          Math.cos(angle) * radius
      );
      this.clouds.push(cloud);
      this.game.scene.add(cloud);
    }
  }

  update() {
    // Check if player mesh exists before accessing its position
    if (!this.game.player.mesh) return;

    const playerPos = this.game.player.mesh.position;
    this.clouds.forEach((cloud) => {
      cloud.rotation.y += 0.005;

      if (cloud.position.distanceTo(playerPos) < 1.5) {
        console.log("Player hit a cloud!");
        // Implement collision logic here
      }
    });
  }
}