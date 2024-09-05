import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Obstacles {
  constructor(game) {
    this.game = game;
    this.clouds = [];
    this.cloudModel = null;
    this.cloudsPerInterval = 2;
    this.cloudRadius = 5; // Increased radius for better visibility
    this.cloudVerticalSpacing = 5;
    this.loadCloudModel();
  }

  loadCloudModel() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
          'assets/models/cloud.glb',
          (gltf) => {
            this.cloudModel = gltf.scene;
            this.cloudModel.scale.set(0.5, 0.5, 0.5);
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
    for (let i = 0; i < count; i++) {
      this.addCloudAroundStalk();
    }
  }

  addCloudAroundStalk() {
    if (!this.cloudModel || !this.game.beanstalk) return;

    const beanstalkHeight = this.game.beanstalk.getHeight();
    if (beanstalkHeight <= 0) return;

    const cloudHeight = Math.random() * beanstalkHeight;
    const t = cloudHeight / beanstalkHeight;
    const stalkPoint = this.game.beanstalk.getPointOnStalk(t);

    if (!stalkPoint) return;

    const cloud = this.cloudModel.clone();

    const angle = Math.random() * Math.PI * 2;
    const radialDistance = this.cloudRadius + Math.random() * 2; // Add some variation to the distance

    cloud.position.set(
        stalkPoint.x + Math.cos(angle) * radialDistance,
        cloudHeight,
        stalkPoint.z + Math.sin(angle) * radialDistance
    );

    // Rotate the cloud to face the beanstalk
    cloud.lookAt(stalkPoint);

    // Add some random rotation for variety
    cloud.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.random() * Math.PI / 4 - Math.PI / 8);
    cloud.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);

    this.clouds.push(cloud);
    this.game.scene.add(cloud);
  }

  addCloudsAtHeight(height) {
    for (let i = 0; i < this.cloudsPerInterval; i++) {
      const cloudHeight = height + (i - this.cloudsPerInterval / 2) * this.cloudVerticalSpacing;
      const t = cloudHeight / this.game.beanstalk.targetHeight;
      const stalkPoint = this.game.beanstalk.getPointOnStalk(t);

      if (!stalkPoint) continue;

      const cloud = this.cloudModel.clone();
      const angle = Math.random() * Math.PI * 2;
      const radialDistance = this.cloudRadius + Math.random() * 2;

      cloud.position.set(
          stalkPoint.x + Math.cos(angle) * radialDistance,
          cloudHeight,
          stalkPoint.z + Math.sin(angle) * radialDistance
      );

      // Rotate the cloud to face the beanstalk
      cloud.lookAt(stalkPoint);

      // Add some random rotation for variety
      cloud.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.random() * Math.PI / 4 - Math.PI / 8);
      cloud.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);

      this.clouds.push(cloud);
      this.game.scene.add(cloud);
    }
  }

  update() {
    if (!this.game.player.mesh) return;

    const playerPos = this.game.player.mesh.position;
    this.clouds.forEach((cloud) => {
      // Gentle bobbing motion
      cloud.position.y += Math.sin(Date.now() * 0.001 + cloud.position.x) * 0.01;

      if (cloud.position.distanceTo(playerPos) < 1.5) {
        console.log("Player hit a cloud!");
        this.game.playerHitObstacle();
      }
    });

    const removeDistance = 50;
    this.clouds = this.clouds.filter(cloud => {
      if (cloud.position.y < playerPos.y - removeDistance) {
        this.game.scene.remove(cloud);
        return false;
      }
      return true;
    });
  }
}