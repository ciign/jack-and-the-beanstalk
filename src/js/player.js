import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.scale = 0.25;
    this.speed = 0.035; // Reduced from 0.1 to 0.05 for slower movement
    this.rotationSpeed = 0.05; // Keep original rotation speed
    this.isClimbing = false;
    this.climbSpeed = 0.05;
    this.movementDirection = new THREE.Vector3();
    this.rotationDirection = 0;
    this.rotationAngle = 0;
    this.clock = new THREE.Clock();
    this.initialPosition = new THREE.Vector3(-10, 0, 0); // Set initial position here
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
          this.mesh.position.copy(this.initialPosition); // Use the initial position
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

          // Start with Idle animation
          this.playAnimation('Idle');

          // Notify game that player is ready
          this.game.onPlayerLoaded();
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
        this.playAnimation('Run');
        break;
      case 'ArrowRight':
        this.rotationDirection = -1;
        this.playAnimation('Run');
        break;
      case 'ArrowUp':
        if (this.isNearBeanstalk()) {
          this.isClimbing = true;
          this.playAnimation('Walk');
        } else {
          this.movementDirection.z = 1;
          this.playAnimation('Run');
        }
        break;
      case 'ArrowDown':
        this.movementDirection.z = -1;
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
    console.log(`Playing animation: ${name}`);
    if (this.currentAction && this.currentAction._clip.name === name) return;

    const newAction = this.animations[name];
    if (newAction) {
      if (this.currentAction) {
        const oldAction = this.currentAction;
        newAction.time = 0;
        newAction.enabled = true;
        newAction.setEffectiveTimeScale(1);
        newAction.setEffectiveWeight(1);
        newAction.crossFadeFrom(oldAction, 0.5, true);
        newAction.play();
      } else {
        newAction.play();
      }
      this.currentAction = newAction;
    } else {
      console.warn(`Animation "${name}" not found`);
    }
  }

  update() {
    if (!this.mesh || !this.mixer) return;

    const delta = this.clock.getDelta();
    this.mixer.update(delta);

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