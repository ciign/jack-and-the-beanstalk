import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.mixer = null;
    this.animations = {};
    this.currentAnimation = null;
    this.scale = 0.25;
    this.speed = 0.1;
    this.rotationSpeed = 0.05;
    this.isClimbing = false;
    this.climbSpeed = 0.05;
    this.movementDirection = new THREE.Vector3();
    this.rotationDirection = 0;
    this.rotationAngle = 0;
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

          // Set up animations
          this.mixer = new THREE.AnimationMixer(this.mesh);
          gltf.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            action.loop = THREE.LoopRepeat;
            this.animations[clip.name] = action;
          });

          console.log('Player model loaded and added to scene');
          console.log('Available animations:', Object.keys(this.animations));
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
        this.rotationDirection = 1;
        this.playAnimation('Walk');
        break;
      case 'ArrowRight':
        this.rotationDirection = -1;
        this.playAnimation('Walk');
        break;
      case 'ArrowUp':
        if (this.isNearBeanstalk()) {
          this.isClimbing = true;
          this.playAnimation('Walk');
        } else {
          this.movementDirection.z = -1;
          this.playAnimation('Run');
        }
        break;
      case 'ArrowDown':
        this.movementDirection.z = 1;
        this.playAnimation('Walk');
        break;
    }
  }

  onKeyUp(event) {
    if (!this.mesh) return;

    switch(event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this.rotationDirection = 0;
        if (this.movementDirection.z === 0) {
          this.playAnimation('Idle');
        }
        break;
      case 'ArrowUp':
        if (!this.isNearBeanstalk()) {
          this.movementDirection.z = 0;
        }
        this.isClimbing = false;
        if (this.rotationDirection === 0) {
          this.playAnimation('Idle');
        }
        break;
      case 'ArrowDown':
        this.movementDirection.z = 0;
        if (this.rotationDirection === 0) {
          this.playAnimation('Idle');
        }
        break;
    }
  }

  isNearBeanstalk() {
    if (!this.mesh) return false;
    const beanstalkBase = this.game.beanstalk.getBasePosition();
    const distance = this.mesh.position.distanceTo(beanstalkBase);
    return distance < 2; // Adjust this value as needed
  }

  playAnimation(name) {
    if (this.currentAnimation === name) return;

    if (this.currentAnimation) {
      const oldAction = this.animations[this.currentAnimation];
      oldAction.fadeOut(0.5);
    }

    const newAction = this.animations[name];
    if (newAction) {
      newAction.reset().fadeIn(0.5).play();
      this.currentAnimation = name;
    } else {
      console.warn(`Animation "${name}" not found`);
    }
  }

  update(deltaTime) {
    if (!this.mesh || !this.mixer) return;

    // Update animation mixer
    this.mixer.update(deltaTime);

    // Rotate the player
    if (this.rotationDirection !== 0) {
      this.rotationAngle += this.rotationSpeed * this.rotationDirection;
      this.mesh.rotation.y = this.rotationAngle;
      this.game.updateCameraRotation(this.rotationAngle);
    }

    // Move the player forward or backward
    if (this.movementDirection.z !== 0) {
      const movement = new THREE.Vector3(0, 0, this.movementDirection.z * this.speed);
      movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationAngle);
      this.mesh.position.add(movement);
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

    // If no movement or rotation, play Idle animation
    if (this.movementDirection.z === 0 && this.rotationDirection === 0 && !this.isClimbing) {
      this.playAnimation('Idle');
    }
  }

  getHeight() {
    return this.mesh ? this.mesh.position.y : 0;
  }
}