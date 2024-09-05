import * as THREE from 'three';
import { Player } from './player';
import { Beanstalk } from './beanstalk';
import { Collectibles } from './collectibles';
import { Obstacles } from './obstacles';
import { UI } from './ui';
import { Castle } from './castle';
import { Giant } from './giant';
import { Nature } from './nature';
import { MoreCloud } from './morecloud';

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.textureLoader = new THREE.TextureLoader();

    this.nature = new Nature(this);
    this.beanstalk = new Beanstalk(this);
    this.moreCloud = new MoreCloud(this);
    this.castle = new Castle(this);
    this.player = new Player(this);
    this.collectibles = new Collectibles(this);
    this.obstacles = new Obstacles(this);
    this.ui = new UI();
    this.giant = new Giant(this);

    this.score = 0;

    this.cameraOffset = new THREE.Vector3(0, 5, -10);
    this.cameraLookAhead = new THREE.Vector3(0, 2, 10);
    this.cameraLerpFactor = 0.1;
    this.minZoom = 5;
    this.maxZoom = 20;
    this.zoomSpeed = 0.001;
    this.isCameraMoved = false;
    this.cameraRotationSpeed = 0.02;
    this.isRotatingCamera = false;
    this.rotationDirection = 0;

    this.setupLights();
    this.init();
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.updateSunPosition();
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 10;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.scene.add(this.directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemisphereLight);
  }

  async init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 10, 30);
    this.camera.lookAt(0, 0, 0);

    this.setupEventListeners();

    try {
      await this.loadSkyTexture();
      await this.nature.loadModel();
      await this.moreCloud.loadModel();
      await this.castle.loadModel();
      await this.giant.loadModel();

      console.log("All assets loaded");
      this.start();
    } catch (error) {
      console.error("Error loading game assets:", error);
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize(), false);
    this.renderer.domElement.addEventListener('wheel', (event) => this.onWheel(event), false);
    this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event), false);
  }

  loadSkyTexture() {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
          'assets/textures/sky.png',
          (texture) => {
            texture.encoding = THREE.sRGBEncoding;
            const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
            rt.fromEquirectangularTexture(this.renderer, texture);
            this.scene.background = rt.texture;
            resolve();
          },
          undefined,
          reject
      );
    });
  }

  start() {
    console.log("Starting game loop");
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.update();
    this.render();
  }

  update() {
    this.nature.update();
    this.beanstalk.update();
    this.moreCloud.update();
    this.castle.update();
    this.updateSunPosition();

    if (this.player.mesh) {
      this.player.update();

      if (this.isRotatingCamera) {
        this.rotateCamera(this.rotationDirection);
      }

      // Update camera position
      const idealOffset = this.cameraOffset.clone().applyQuaternion(this.player.mesh.quaternion);
      const idealLookAt = this.cameraLookAhead.clone().applyQuaternion(this.player.mesh.quaternion);

      const playerPosition = this.player.mesh.position.clone();
      const targetCameraPosition = playerPosition.clone().add(idealOffset);
      const targetLookAtPosition = playerPosition.clone().add(idealLookAt);

      // Only lerp the camera if it's not already close to the ideal position
      if (this.camera.position.distanceTo(targetCameraPosition) > 0.1) {
        this.camera.position.lerp(targetCameraPosition, this.cameraLerpFactor);
      }

      // Always update lookAt to ensure smooth following
      this.camera.lookAt(targetLookAtPosition);

      const playerHeight = Math.round(this.player.getHeight());
      this.ui.updateHeight(playerHeight);

      if (playerHeight >= this.moreCloud.height - 10) {
        console.log("Player reached the MoreCloud!");
      }

      if (playerHeight >= this.castle.height - 10) {
        console.log("Player reached the castle!");
      }

      if (this.giant.mesh && this.player.mesh.position.distanceTo(this.giant.mesh.position) < 5) {
        console.log("Player caught by the giant!");
      }
    }

    this.collectibles.update();
    this.obstacles.update();
    this.giant.update();

    this.ui.updateScore(this.score);
  }

  updateSunPosition() {
    const sunDistance = this.castle.height * 1.5;
    this.directionalLight.position.set(sunDistance / 2, sunDistance, sunDistance / 2);
    this.directionalLight.target.position.set(0, 0, 0);
    this.scene.add(this.directionalLight.target);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  incrementScore(amount) {
    this.score += amount;
  }

  onWheel(event) {
    event.preventDefault();
    const zoomChange = event.deltaY * this.zoomSpeed;
    const newZoom = THREE.MathUtils.clamp(
        this.cameraOffset.length() + zoomChange,
        this.minZoom,
        this.maxZoom
    );
    this.cameraOffset.setLength(newZoom);
    this.isCameraMoved = true;
  }

  onMouseMove(event) {
    if (event.buttons & 1) { // Left mouse button is pressed (or trackpad is being used)
      const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
      const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

      // Rotate the camera around the player
      const rotationSpeed = 0.002;
      this.cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -movementX * rotationSpeed);

      // Tilt the camera up and down
      const tiltAxis = new THREE.Vector3().crossVectors(this.cameraOffset, new THREE.Vector3(0, 1, 0)).normalize();
      this.cameraOffset.applyAxisAngle(tiltAxis, -movementY * rotationSpeed);

      this.isCameraMoved = true;
    }
  }

  rotateCamera(direction) {
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    const rotationAngle = this.cameraRotationSpeed * direction;
    this.cameraOffset.applyAxisAngle(rotationAxis, rotationAngle);
    this.cameraLookAhead.applyAxisAngle(rotationAxis, rotationAngle);
    this.isCameraMoved = true;
  }

  startCameraRotation(direction) {
    this.isRotatingCamera = true;
    this.rotationDirection = direction;
  }

  stopCameraRotation() {
    this.isRotatingCamera = false;
    this.rotationDirection = 0;
  }
}