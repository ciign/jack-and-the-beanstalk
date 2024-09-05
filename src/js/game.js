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

    this.cameraOffset = new THREE.Vector3(0, 2, -3); // Changed from (0, 3, -5)
    this.cameraLookAhead = new THREE.Vector3(0, 1, 3); // Changed from (0, 1.5, 5)
    this.cameraLerpFactor = 0.1;
    this.cameraAngle = 0;

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

      // Update camera position
      const cameraOffset = new THREE.Vector3(
          Math.sin(this.cameraAngle) * this.cameraOffset.z,
          this.cameraOffset.y,
          Math.cos(this.cameraAngle) * this.cameraOffset.z
      );

      const playerPosition = this.player.mesh.position.clone();
      const targetCameraPosition = playerPosition.clone().add(cameraOffset);

      // Smoothly interpolate camera position
      this.camera.position.lerp(targetCameraPosition, this.cameraLerpFactor);

      // Update camera look-at point
      const lookAtOffset = new THREE.Vector3(
          Math.sin(this.cameraAngle) * this.cameraLookAhead.z,
          this.cameraLookAhead.y,
          Math.cos(this.cameraAngle) * this.cameraLookAhead.z
      );
      const targetLookAtPosition = playerPosition.clone().add(lookAtOffset);

      // Always update lookAt to ensure smooth following
      this.camera.lookAt(targetLookAtPosition);
      console.log('Camera angle:', this.cameraAngle);

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

  updateCameraRotation(playerRotationAngle) {
    this.cameraAngle = playerRotationAngle
  }
}