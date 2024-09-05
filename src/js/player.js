import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.scale = 0.25;
    this.speed = 0.1;
    this.rotationSpeed = 0.05;
    this.isClimbing = false;
    this.climbSpeed = 0.05;
    this.movementDirection = new THREE.Vector3();
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
        if (this.game.isCameraMoved) {
          this.game.startCameraRotation(1);
        } else {
          this.movementDirection.x = -1;
        }
        break;
      case 'ArrowRight':
        if (this.game.isCameraMoved) {
          this.game.startCameraRotation(-1);
        } else {
          this.movementDirection.x = 1;
        }
        break;
      case 'ArrowUp':
        if (this.isNearBeanstalk()) {
          this.isClimbing = true;
        } else {
          this.movementDirection.z = -1;
        }
        break;
      case 'ArrowDown':
        this.movementDirection.z = 1;
        break;
    }
  }

  onKeyUp(event) {
    if (!this.mesh) return;

    switch(event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this.movementDirection.x = 0;
        this.game.stopCameraRotation();
        break;
      case 'ArrowUp':
        if (!this.isNearBeanstalk()) {
          this.movementDirection.z = 0;
        }
        this.isClimbing = false;
        break;
      case 'ArrowDown':
        this.movementDirection.z = 0;
        break;
    }
  }

  isNearBeanstalk() {
    if (!this.mesh) return false;
    const beanstalkBase = this.game.beanstalk.getBasePosition();
    const distance = this.mesh.position.distanceTo(beanstalkBase);
    return distance < 2; // Adjust this value as needed
  }

  update() {
    if (!this.mesh) return;

    if (this.movementDirection.length() > 0) {
      this.movementDirection.normalize();
      const movement = this.movementDirection.clone().multiplyScalar(this.speed);
      this.mesh.position.add(movement);

      // Rotate the player to face the movement direction
      const angle = Math.atan2(this.movementDirection.x, this.movementDirection.z);
      this.mesh.rotation.y = angle;
    }

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