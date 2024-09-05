import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Collectibles {
  constructor(game) {
    this.game = game;
    this.beans = [];
    this.beanModel = null;
    this.beansPerInterval = 5;
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
            this.beanModel.scale.set(0.5, 0.5, 0.5);
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
    for (let i = 0; i < count; i++) {
      this.addBeanToStalk();
    }
  }

  addBeanToStalk() {
    if (!this.beanModel) return;

    const t = Math.random();
    const beanPosition = this.game.beanstalk.getPointOnStalk(t);
    const bean = this.beanModel.clone();
    bean.position.copy(beanPosition);

    // Calculate tangent to make bean face outward
    const tangent = this.game.beanstalk.createStalkCurve().getTangentAt(t);
    bean.lookAt(beanPosition.clone().add(tangent));

    // Rotate bean to face outward
    bean.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

    this.beans.push(bean);
    this.game.scene.add(bean);
  }

  addBeansAtHeight(height) {
    for (let i = 0; i < this.beansPerInterval; i++) {
      this.addBeanToStalk();
    }
  }

  update() {
    if (!this.game.player.mesh) return;

    const playerPos = this.game.player.mesh.position;
    for (let i = this.beans.length - 1; i >= 0; i--) {
      const bean = this.beans[i];
      bean.rotation.y += 0.01;

      if (bean.position.distanceTo(playerPos) < 1) {
        this.game.scene.remove(bean);
        this.beans.splice(i, 1);
        this.game.incrementScore(10);

        if (this.beans.length < 10) {
          this.addBeanToStalk();
        }
      }
    }
  }
}