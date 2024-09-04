import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.scale = 0.25; // 50% of original size
    this.angle = 0;
    this.height = 0;
    this.rotationSpeed = 0.05;
    this.climbSpeed = 0.5;
    this.isClimbing = false;
    this.targetHeight = 0;
    this.smoothFactor = 0.1; // Adjust this for smoother or quicker movement
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
          const beanstalkBase = this.game.beanstalk.getBasePosition();
          this.mesh.position.copy(beanstalkBase);
          this.mesh.position.y += 1; // Lift slightly above the ground
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
        this.rotationSpeed = -0.05;
        break;
      case 'ArrowRight':
        this.rotationSpeed = 0.05;
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
      // Update angle
      this.angle += this.rotationSpeed;

      // Update height
      if (this.isClimbing) {
        this.targetHeight += this.climbSpeed;
      }
      this.targetHeight = Math.min(this.targetHeight, this.game.beanstalk.getHeight());

      // Smooth height transition
      this.height += (this.targetHeight - this.height) * this.smoothFactor;

      // Get beanstalk curve
      const beanstalkCurve = this.game.beanstalk.getCurve();
      const t = this.height / this.game.beanstalk.getHeight();
      const position = beanstalkCurve.getPointAt(t);
      const tangent = beanstalkCurve.getTangentAt(t);

      // Calculate player position
      const radius = 0.5; // Adjust based on beanstalk thickness
      const radialPosition = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(radius);
      radialPosition.applyAxisAngle(tangent, this.angle);

      this.mesh.position.copy(position).add(radialPosition);

      // Orient player to face outward from beanstalk
      const lookAtPos = this.mesh.position.clone().add(radialPosition.normalize());
      this.mesh.lookAt(lookAtPos);
      this.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), -Math.PI / 1);
    }
  }

  getHeight() {
    return this.height;
  }
}