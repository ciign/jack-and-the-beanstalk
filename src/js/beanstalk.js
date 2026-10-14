import * as THREE from 'three';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Procedural beanstalk: three vine strands braided around a gently spiralling
 * centre line. Geometry is built once at full height; growth is object.scale.y.
 */
export class Beanstalk {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Object3D();
    this.targetHeight = 100;   // the castle sits at the top
    this.initialHeight = 15;
    this.currentHeight = this.initialHeight;
    this.growthSpeed = 3;      // units per second
    this.notificationInterval = 10;
    this.lastNotifiedHeight = 0;

    this.strandCount = 3;
    this.strandOffset = 0.32;  // distance of each strand from the centre line
    this.strandRadius = 0.2;
    this.twists = 7;           // how many times the strands wrap around the centre
    this.segments = 400;

    this.centerCurve = this.createCenterCurve();
    this.strandMaterials = [0x1e5a1c, 0x27702a, 0x184c1a].map((color) =>
      new THREE.MeshPhongMaterial({ color, shininess: 8 })
    );
  }

  loadModel() {
    this.createBeanstalk();
    return Promise.resolve();
  }

  createCenterCurve() {
    const points = [];
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const angle = t * Math.PI * 2 * 2.5;
      const radius = 0.25 * (1 - 0.5 * t);
      points.push(new THREE.Vector3(Math.cos(angle) * radius, t * this.targetHeight, Math.sin(angle) * radius));
    }
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  createStrandCurve(index) {
    const points = [];
    const n = 160;
    const phase = (index / this.strandCount) * Math.PI * 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const c = this.centerCurve.getPoint(t);
      const angle = phase + t * Math.PI * 2 * this.twists;
      const taper = 1 - 0.35 * t; // strands pull tighter near the top
      points.push(new THREE.Vector3(
        c.x + Math.cos(angle) * this.strandOffset * taper,
        c.y,
        c.z + Math.sin(angle) * this.strandOffset * taper
      ));
    }
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  createBeanstalk() {
    for (let i = 0; i < this.strandCount; i++) {
      const geometry = new THREE.TubeGeometry(this.createStrandCurve(i), this.segments, this.strandRadius, 8, false);
      const mesh = new THREE.Mesh(geometry, this.strandMaterials[i % this.strandMaterials.length]);
      mesh.castShadow = true;
      this.object.add(mesh);
    }
    // Core so there are no gaps between strands when viewed from above.
    const core = new THREE.Mesh(
      new THREE.TubeGeometry(this.centerCurve, this.segments / 2, this.strandOffset * 0.9, 8, false),
      this.strandMaterials[0]
    );
    this.object.add(core);

    this.applyGrowth();
    this.game.scene.add(this.object);
  }

  applyGrowth() {
    const growth = this.currentHeight / this.targetHeight;
    const girth = 0.7 + 0.3 * growth;
    this.object.scale.set(girth, growth, girth);
  }

  update(dt) {
    if (this.currentHeight >= this.targetHeight) return;
    this.currentHeight = Math.min(this.targetHeight, this.currentHeight + this.growthSpeed * dt);
    this.applyGrowth();
    const interval = this.notificationInterval;
    if (Math.floor(this.currentHeight / interval) > Math.floor(this.lastNotifiedHeight / interval)) {
      this.lastNotifiedHeight = this.currentHeight;
      this.game.onBeanstalkGrowth(Math.floor(this.currentHeight / interval) * interval);
    }
  }

  reset() {
    this.currentHeight = this.initialHeight;
    this.lastNotifiedHeight = 0;
    this.applyGrowth();
  }

  /** Climbable height above the base, in world units. */
  getHeight() {
    return this.currentHeight;
  }

  getBasePosition() {
    return this.object.position;
  }

  /** World-space centre of the stalk at a given world height (clamped to the stalk). */
  getCenterAt(worldY, target = new THREE.Vector3()) {
    const base = this.object.position;
    const t = clamp01((worldY - base.y) / Math.max(this.currentHeight, 0.001));
    const local = this.centerCurve.getPoint(t);
    return target.set(base.x + local.x * this.object.scale.x, worldY, base.z + local.z * this.object.scale.z);
  }

  /** Outer radius of the stalk at a given world height. */
  getRadiusAt(worldY) {
    const base = this.object.position;
    const t = clamp01((worldY - base.y) / Math.max(this.currentHeight, 0.001));
    const taper = 1 - 0.35 * t;
    return (this.strandOffset * taper + this.strandRadius) * this.object.scale.x;
  }
}
