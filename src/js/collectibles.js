import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Collectibles {
  constructor(game) {
    this.game = game;
    this.beans = [];
    this.beanModel = null;
    this.loadBeanModel().then(() => {
      this.createBeans(20);
    });
  }

  loadBeanModel() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
          'assets/models/bean.glb',
          (gltf) => {
            this.beanModel = gltf.scene;
            this.beanModel.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
            resolve();
          },
          (xhr) => {
            console.log('Bean model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          (error) => {
            console.error('Error loading bean model:', error);
            reject(error);
          }
      );
    });
  }

  createBeans(count) {
    const beanstalkHeight = this.game.beanstalk.getHeight();
    const natureTop = this.game.nature.getTopPosition();

    for (let i = 0; i < count; i++) {
      const bean = this.beanModel.clone();
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * beanstalkHeight;
      const radius = 2 + Math.random() * 2; // Adjust based on beanstalk width
      bean.position.set(
          Math.sin(angle) * radius,
          natureTop.y + height,
          Math.cos(angle) * radius
      );
      this.beans.push(bean);
      this.game.scene.add(bean);
    }
  }

  update() {
    if (!this.game.player.mesh) return; // Exit if player mesh is not loaded yet

    const playerPos = this.game.player.mesh.position;
    for (let i = this.beans.length - 1; i >= 0; i--) {
      const bean = this.beans[i];
      bean.rotation.y += 0.01; // Rotate the bean for visual effect

      if (bean.position.distanceTo(playerPos) < 1) {
        this.game.scene.remove(bean);
        this.beans.splice(i, 1);
        this.game.incrementScore(10);

        if (this.beans.length < 10) {
          this.createBeans(1);
        }
      }
    }
  }
}