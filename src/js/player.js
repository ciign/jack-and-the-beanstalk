import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.scale = 0.25;
    this.speed = 0.1;
    this.isClimbing = false;
    this.climbSpeed = 0.05;
    this.loadModel();
    this.setupControls();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        'assets/models/jack.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(this.scale, this.scale, this.scale);
          // Position Jack on the ground
          this.mesh.position.set(0, 0, 0);
          this.game.scene.add(this.mesh);
          console.log('Player model loaded and added to scene');
        },
        (xhr) => {
          console.log('Player model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          console.error('Error loading player model:', error);
        }
    );
  }

  setupControls() {
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));
  }

  onKeyDown(event) {
    if (!this.mesh) return;

    switch(event.key) {
      case 'ArrowLeft':
        this.mesh.position.x -= this.speed;
        break;
      case 'ArrowRight':
        this.mesh.position.x += this.speed;
        break;
      case 'ArrowUp':
        if (this.isNearBeanstalk()) {
          this.isClimbing = true;
        } else {
          this.mesh.position.z -= this.speed;
        }
        break;
      case 'ArrowDown':
        this.mesh.position.z += this.speed;
        break;
    }
  }

  onKeyUp(event) {
    if (event.key === 'ArrowUp') {
      this.isClimbing = false;
    }
  }

  isNearBeanstalk() {
    if (!this.mesh) return false;
    const beanstalkBase = this.game.beanstalk.getBasePosition();
    const distance = this.mesh.position.distanceTo(beanstalkBase);
    return distance < 2; // Adjust this value as needed
  }

  update() {
    if (this.isClimbing && this.isNearBeanstalk()) {
      this.mesh.position.y += this.climbSpeed;
    }

    // Ensure player doesn't fall through the ground
    if (this.mesh.position.y < 0) {
      this.mesh.position.y = 0;
    }

    // Ensure player doesn't climb higher than the beanstalk
    const maxHeight = this.game.beanstalk.getHeight();
    if (this.mesh.position.y > maxHeight) {
      this.mesh.position.y = maxHeight;
    }
  }

  getHeight() {
    return this.mesh ? this.mesh.position.y : 0;
  }
}