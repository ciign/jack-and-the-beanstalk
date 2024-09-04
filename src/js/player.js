import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.angle = 0;
    this.height = 0;
    this.speed = 0.05;
    this.climbSpeed = 0.5;
    this.rotationSpeed = 0;
    this.isClimbing = false;
    this.loadModel();
    this.setupControls();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        'assets/models/jack.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(0.5, 0.5, 0.5);
          const beanstalkBase = this.game.beanstalk.getBasePosition();
          this.mesh.position.copy(beanstalkBase);
          this.mesh.position.y += 1;
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
    switch(event.key) {
      case 'ArrowLeft':
        this.rotationSpeed = -this.speed;
        break;
      case 'ArrowRight':
        this.rotationSpeed = this.speed;
        break;
      case 'ArrowUp':
        this.isClimbing = true;
        break;
    }
  }

  onKeyUp(event) {
    switch(event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this.rotationSpeed = 0;
        break;
      case 'ArrowUp':
        this.isClimbing = false;
        break;
    }
  }

  update() {
    if (this.mesh) {
      this.angle += this.rotationSpeed;
      if (this.isClimbing) {
        this.height += this.climbSpeed;
        this.height = Math.min(this.height, this.game.beanstalk.getHeight());
      }

      const beanstalkBase = this.game.beanstalk.getBasePosition();
      const beanstalkRadius = 2;

      this.mesh.position.x = beanstalkBase.x + Math.sin(this.angle) * beanstalkRadius;
      this.mesh.position.y = beanstalkBase.y + this.height;
      this.mesh.position.z = beanstalkBase.z + Math.cos(this.angle) * beanstalkRadius;

      // Update player rotation to face tangent to the beanstalk
      this.mesh.rotation.y = this.angle + Math.PI / 2;
    }
  }

  getHeight() {
    return this.height;
  }
}