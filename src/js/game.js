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
import { Minimap } from './minimap';

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.textureLoader = new THREE.TextureLoader();

    this.nature = new Nature(this);
    this.beanstalk = new Beanstalk(this);
    this.moreCloud = new MoreCloud(this);
    this.castle = new Castle(this);
    this.player = new Player(this);
    this.collectibles = new Collectibles(this);
    this.obstacles = new Obstacles(this);
    this.giant = new Giant(this);
    this.ui = new UI();
    this.minimap = new Minimap(this);

    this.score = 0;
    this.elapsed = 0;
    this.cameraAngle = 0;
    this.cameraDistance = 3.0;
    this.cameraHeight = 1.4;
    this.cameraLookHeight = 0.8;
    this.cameraLerp = 6; // per second
    this.cameraTarget = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();

    this.clock = new THREE.Clock();
    this.isGameStarted = false;
    this.hasWon = false;
    this.running = false;

    this.setupLights();
    this.setupAudio();
    this.setupUI();
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    this.scene.add(new THREE.HemisphereLight(0xbfdfff, 0x3a5a2a, 0.6));

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(60, 120, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  setupAudio() {
    this.musicEnabled = true;
    try {
      this.music = new Audio('assets/audio/background_music.mp3');
      this.music.loop = true;
      this.music.volume = 0.35;
      this.collectSound = new Audio('assets/audio/collect_bean.wav');
      this.collectSound.volume = 0.6;
    } catch (e) {
      this.music = null;
      this.collectSound = null;
    }
  }

  setupUI() {
    this.loader = document.getElementById('loader');
    this.startScreen = document.getElementById('start-screen');
    this.winScreen = document.getElementById('win-screen');
    this.menu = document.getElementById('menu');
    this.musicBtn = document.getElementById('music-btn');

    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('reset-btn').addEventListener('click', () => { this.resetGame(); this.hideMenu(); });
    document.getElementById('play-again-btn').addEventListener('click', () => this.resetGame());
    document.getElementById('menu-btn').addEventListener('click', () => this.toggleMenu());
    this.musicBtn.addEventListener('click', () => this.toggleMusic());
  }

  async init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.set(-14, 4, 6);
    this.camera.lookAt(0, 2, 0);

    window.addEventListener('resize', () => this.onWindowResize(), false);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clock.getDelta(); });

    try {
      await Promise.all([
        this.loadSkyTexture(),
        this.nature.loadModel(),
        this.beanstalk.loadModel(),
        this.moreCloud.loadModel(),
        this.castle.loadModel(),
        this.giant.loadModel(),
        this.player.loadModel(),
      ]);
    } catch (error) {
      console.error('Error loading game assets:', error);
      this.loader.textContent = 'Could not load the game. Please reload the page.';
      return;
    }

    // Loaders set transforms but world matrices are only computed on render; raycasts need them now.
    this.scene.updateMatrixWorld(true);
    this.positionBeanstalk();
    this.castle.updatePosition();
    this.giant.updatePosition();
    this.moreCloud.updatePosition();
    this.player.placeOnGround();
    this.seedWorld();
    this.minimap.capture();

    this.loader.style.display = 'none';
    this.startScreen.style.display = 'flex';

    // Render the idle scene behind the start screen.
    this.running = true;
    this.animate();
  }

  /** Beans and clouds for the part of the stalk that already exists at the start. */
  seedWorld() {
    for (let h = 10; h <= this.beanstalk.getHeight(); h += this.beanstalk.notificationInterval) {
      this.collectibles.addBeansAtHeight(h);
      this.obstacles.addCloudsAtHeight(h);
    }
    this.beanstalk.lastNotifiedHeight = this.beanstalk.getHeight();
  }

  startGame() {
    this.isGameStarted = true;
    this.startScreen.style.display = 'none';
    this.clock.getDelta();
    this.playMusic();
  }

  resetGame() {
    this.score = 0;
    this.hasWon = false;
    this.winScreen.style.display = 'none';
    this.beanstalk.reset();
    this.collectibles.reset();
    this.obstacles.reset();
    this.seedWorld();
    this.player.reset();
    this.ui.updateScore(0);
    this.ui.updateHeight(0);
    this.cameraAngle = 0;
    if (!this.isGameStarted) this.startGame();
  }

  win() {
    if (this.hasWon) return;
    this.hasWon = true;
    document.getElementById('final-score').textContent = this.score;
    this.winScreen.style.display = 'flex';
  }

  // ---- menu / audio ------------------------------------------------------

  toggleMenu() {
    const open = getComputedStyle(this.menu).display !== 'none';
    this.menu.style.display = open ? 'none' : 'block';
  }

  hideMenu() {
    this.menu.style.display = 'none';
  }

  playMusic() {
    if (this.music && this.musicEnabled) this.music.play().catch(() => {});
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.musicBtn.textContent = this.musicEnabled ? 'Music: On' : 'Music: Off';
    if (!this.music) return;
    if (this.musicEnabled) this.playMusic();
    else this.music.pause();
  }

  // ---- world events ------------------------------------------------------

  onBeanstalkGrowth(height) {
    this.collectibles.addBeansAtHeight(height);
    this.obstacles.addCloudsAtHeight(height);
  }

  onBeanCollected() {
    this.score += 1;
    if (this.collectSound) {
      this.collectSound.currentTime = 0;
      this.collectSound.play().catch(() => {});
    }
  }

  playerHitObstacle() {
    this.player.knockDown(3);
    this.score = Math.max(0, this.score - 1);
  }

  positionBeanstalk() {
    if (!this.nature.mesh) return;
    const raycaster = new THREE.Raycaster(new THREE.Vector3(5, 500, 0), new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObject(this.nature.mesh, true);
    if (hits.length) this.beanstalk.object.position.copy(hits[0].point);
    else this.beanstalk.object.position.set(5, 0, 0);
  }

  loadSkyTexture() {
    return new Promise((resolve, reject) => {
      this.textureLoader.load('assets/textures/sky.png', (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        const rt = new THREE.WebGLCubeRenderTarget(Math.min(texture.image.height, 1024));
        rt.fromEquirectangularTexture(this.renderer, texture);
        this.scene.background = rt.texture;
        resolve();
      }, undefined, reject);
    });
  }

  // ---- loop --------------------------------------------------------------

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.1); // clamp after tab switches
    this.elapsed += dt;
    if (this.isGameStarted && !this.hasWon) this.update(dt);
    else { this.nature.update(dt); this.updateCamera(dt); }
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    this.nature.update(dt);
    this.beanstalk.update(dt);
    this.moreCloud.update(dt);
    this.giant.update(dt);
    this.player.update(dt);
    this.collectibles.update(dt);
    this.obstacles.update(dt);
    this.updateCamera(dt);
    this.minimap.update();

    const height = this.player.getHeight();
    this.ui.updateHeight(height);
    this.ui.updateScore(this.score);

    if (height >= this.castle.height - 2) this.win();
  }

  updateCamera(dt) {
    if (!this.player.mesh) return;
    const p = this.player.mesh.position;
    const a = this.cameraAngle;
    // Camera sits behind Jack (opposite his facing direction) and slightly above.
    this.cameraTarget.set(p.x - Math.sin(a) * this.cameraDistance, p.y + this.cameraHeight, p.z - Math.cos(a) * this.cameraDistance);
    const t = 1 - Math.exp(-this.cameraLerp * dt);
    this.camera.position.lerp(this.cameraTarget, t);
    this.lookTarget.set(p.x, p.y + this.cameraLookHeight, p.z);
    this.camera.lookAt(this.lookTarget);
  }

  updateCameraRotation(angle) {
    this.cameraAngle = angle;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
