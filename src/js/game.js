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
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
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

    this.cameraOffset = new THREE.Vector3(0, 1.5, -2.0);
    this.cameraLookAhead = new THREE.Vector3(0, 0.75, 2.5);
    this.cameraLerpFactor = 0.1;
    this.cameraAngle = 0;

    this.assetLoadPromises = [];

    this.frustum = new THREE.Frustum();
    this.frustumMatrix = new THREE.Matrix4();

    this.clock = new THREE.Clock();

    this.isLoading = true;
    this.isGameStarted = false;

    this.setupLights();
    this.setupUI();
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.updateSunPosition();
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
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

  setupUI() {
    this.loader = document.getElementById('loader');
    this.startScreen = document.getElementById('start-screen');
    this.startBtn = document.getElementById('start-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.menuBtn = document.getElementById('menu-btn');
    this.menu = document.getElementById('menu');

    this.startBtn.addEventListener('click', () => this.startGame());
    this.resetBtn.addEventListener('click', () => this.resetGame());
    this.menuBtn.addEventListener('click', () => this.toggleMenu());
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
      this.assetLoadPromises.push(this.loadSkyTexture());
      this.assetLoadPromises.push(this.nature.loadModel());
      this.assetLoadPromises.push(this.moreCloud.loadModel());
      this.assetLoadPromises.push(this.castle.loadModel());
      this.assetLoadPromises.push(this.giant.loadModel());
      this.assetLoadPromises.push(this.beanstalk.loadModel());

      await Promise.all(this.assetLoadPromises);

      console.log("All assets loaded");
      this.positionBeanstalk();
      this.isLoading = false;
      this.hideLoader();
      this.showStartScreen();
    } catch (error) {
      console.error("Error loading game assets:", error);
    }
  }

  hideLoader() {
    this.loader.style.display = 'none';
  }

  showStartScreen() {
    this.startScreen.style.display = 'flex';
  }

  hideStartScreen() {
    this.startScreen.style.display = 'none';
  }

  startGame() {
    this.isGameStarted = true;
    this.hideStartScreen();
    this.start();
  }

  resetGame() {
    // Reset game state
    this.score = 0;
    this.player.mesh.position.copy(this.player.initialPosition);
    this.player.rotationAngle = 0;
    this.player.mesh.rotation.y = 0;
    this.beanstalk.currentHeight = 0;
    this.beanstalk.update();
    this.collectibles.reset();
    this.obstacles.reset();
    this.ui.updateScore(this.score);
    this.ui.updateHeight(0);
  }

  toggleMenu() {
    this.menu.style.display = this.menu.style.display === 'none' ? 'block' : 'none';
  }

  onBeanstalkGrowth(height) {
    console.log(`Beanstalk grew to height: ${height}`);
    this.collectibles.addBeansAtHeight(height);
    this.obstacles.addCloudsAtHeight(height);
  }

  positionBeanstalk() {
    if (this.nature.mesh && this.beanstalk.object) {
      const natureTopPosition = this.nature.getTopPosition();
      const raycaster = new THREE.Raycaster();
      const rayOrigin = new THREE.Vector3(5, natureTopPosition.y, 0);
      const rayDirection = new THREE.Vector3(0, -1, 0);
      raycaster.set(rayOrigin, rayDirection);
      const intersects = raycaster.intersectObject(this.nature.mesh, true);

      if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;
        this.beanstalk.object.position.copy(intersectionPoint);
        console.log('Beanstalk positioned successfully on Nature surface');
      } else {
        console.error('Could not find a suitable position on Nature surface');
        this.beanstalk.object.position.copy(natureTopPosition);
      }
    } else {
      console.error('Nature or Beanstalk not loaded. Unable to position beanstalk.');
    }
  }

  onPlayerLoaded() {
    console.log('Player loaded and positioned');
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
    if (this.isGameStarted) {
      console.log("Starting game loop");
      this.animate();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const deltaTime = this.clock.getDelta();
    this.update(deltaTime);
    this.render();
  }

  update(deltaTime) {
    this.nature.update(deltaTime);
    this.beanstalk.update(deltaTime);
    this.moreCloud.update(deltaTime);
    this.castle.update(deltaTime);
    this.updateSunPosition();

    if (this.player.mesh) {
      this.player.update(deltaTime);

      const cameraOffset = new THREE.Vector3(
          Math.sin(this.cameraAngle) * this.cameraOffset.z,
          this.cameraOffset.y,
          Math.cos(this.cameraAngle) * this.cameraOffset.z
      );

      const playerPosition = this.player.mesh.position.clone();
      const targetCameraPosition = playerPosition.clone().add(cameraOffset);

      this.camera.position.lerp(targetCameraPosition, this.cameraLerpFactor);

      const lookAtOffset = new THREE.Vector3(
          Math.sin(this.cameraAngle) * this.cameraLookAhead.z,
          this.cameraLookAhead.y,
          Math.cos(this.cameraAngle) * this.cameraLookAhead.z
      );
      const targetLookAtPosition = playerPosition.clone().add(lookAtOffset);

      this.camera.lookAt(targetLookAtPosition);

      const playerHeight = Math.round(this.player.getHeight());
      this.ui.updateHeight(playerHeight);

      this.frustumMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.frustumMatrix);

      this.performFrustumCulling();

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

    if (this.collectibles) this.collectibles.update(deltaTime);
    if (this.obstacles) this.obstacles.update(deltaTime);
    if (this.giant) this.giant.update(deltaTime);

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
    this.cameraAngle = playerRotationAngle;
  }

  playerHitObstacle() {
    console.log("Player hit an obstacle!");
    // Implement obstacle collision logic here
    // For example:
    // this.player.slowDown();
    // this.decrementScore(5);
  }

  performFrustumCulling() {
    // Cull collectibles
    if (this.collectibles && this.collectibles.items) {
      this.collectibles.items.forEach(item => {
        if (item && item.position) {
          item.visible = this.frustum.containsPoint(item.position);
        }
      });
    }

    // Cull obstacles
    if (this.obstacles && this.obstacles.clouds) {
      this.obstacles.clouds.forEach(cloud => {
        if (cloud && cloud.position) {
          cloud.visible = this.frustum.containsPoint(cloud.position);
        }
      });
    }

    // Cull other objects as needed
    if (this.moreCloud && this.moreCloud.mesh) {
      this.moreCloud.mesh.visible = this.frustum.containsPoint(this.moreCloud.mesh.position);
    }
    if (this.castle && this.castle.mesh) {
      this.castle.mesh.visible = this.frustum.containsPoint(this.castle.mesh.position);
    }
    if (this.giant && this.giant.mesh) {
      this.giant.mesh.visible = this.frustum.containsPoint(this.giant.mesh.position);
    }
  }
}