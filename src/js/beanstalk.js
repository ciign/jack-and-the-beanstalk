import * as THREE from 'three';

/**
 * Procedural beanstalk. The stalk geometry is built once at full height and the
 * visible height is driven by object.scale.y, so growth costs nothing per frame.
 */
export class Beanstalk {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Object3D();
    this.targetHeight = 200;
    this.initialHeight = 15;
    this.currentHeight = this.initialHeight;
    this.growthSpeed = 3; // units per second
    this.segments = 200;
    this.leafCount = 48;
    this.flowerCount = 6;
    this.notificationInterval = 10;
    this.lastNotifiedHeight = 0;

    this.stalkMaterial = new THREE.MeshPhongMaterial({ color: 0x2e7d32, shininess: 20 });
    this.leafMaterial = new THREE.MeshPhongMaterial({ color: 0x9acd32, side: THREE.DoubleSide });
    this.flowerMaterial = new THREE.MeshPhongMaterial({ color: 0xe91e63, shininess: 50, side: THREE.DoubleSide });

    this.stalkCurve = this.createStalkCurve();
    this.leafBase = [];
    this.elapsed = 0;
  }

  loadModel() {
    this.createBeanstalk();
    return Promise.resolve();
  }

  createBeanstalk() {
    const stalkGeometry = new THREE.TubeGeometry(this.stalkCurve, this.segments, 0.45, 10, false);
    this.stalkMesh = new THREE.Mesh(stalkGeometry, this.stalkMaterial);
    this.stalkMesh.castShadow = true;
    this.object.add(this.stalkMesh);

    this.leafMesh = new THREE.InstancedMesh(this.createLeafGeometry(), this.leafMaterial, this.leafCount);
    this.flowerMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.4, 6), this.flowerMaterial, this.flowerCount);
    this.placeLeavesAndFlowers();
    this.object.add(this.leafMesh, this.flowerMesh);

    this.applyGrowth();
    this.game.scene.add(this.object);
  }

  createStalkCurve() {
    const points = [];
    const turns = 8;
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const angle = t * Math.PI * 2 * turns;
      const radius = 0.35 * (1 - t * 0.6);
      points.push(new THREE.Vector3(Math.cos(angle) * radius, t * this.targetHeight, Math.sin(angle) * radius));
    }
    return new THREE.CatmullRomCurve3(points);
  }

  createLeafGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(2, 1, 0, 4);
    shape.quadraticCurveTo(-2, 1, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape, 12);
    geometry.scale(0.35, 0.35, 0.35);
    return geometry;
  }

  placeLeavesAndFlowers() {
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const tilt = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < this.leafCount; i++) {
      const t = (i + 1) / (this.leafCount + 1);
      const pos = this.stalkCurve.getPointAt(t);
      const tangent = this.stalkCurve.getTangentAt(t);
      quat.setFromUnitVectors(up, tangent);
      tilt.setFromAxisAngle(up, i * 2.4); // spread leaves around the stalk
      quat.multiply(tilt);
      this.leafBase.push({ pos: pos.clone(), quat: quat.clone() });
      matrix.compose(pos, quat, one);
      this.leafMesh.setMatrixAt(i, matrix);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.flowerCount; i++) {
      const t = 0.75 + i * 0.04;
      const pos = this.stalkCurve.getPointAt(t);
      quat.setFromAxisAngle(up, i * 1.1);
      matrix.compose(pos, quat, one);
      this.flowerMesh.setMatrixAt(i, matrix);
    }
    this.flowerMesh.instanceMatrix.needsUpdate = true;
  }

  applyGrowth() {
    const growth = this.currentHeight / this.targetHeight;
    this.object.scale.set(0.5 + 0.5 * growth, growth, 0.5 + 0.5 * growth);
  }

  update(dt) {
    this.elapsed += dt;
    if (this.currentHeight < this.targetHeight) {
      this.currentHeight = Math.min(this.targetHeight, this.currentHeight + this.growthSpeed * dt);
      this.applyGrowth();
      if (Math.floor(this.currentHeight / this.notificationInterval) > Math.floor(this.lastNotifiedHeight / this.notificationInterval)) {
        this.lastNotifiedHeight = this.currentHeight;
        this.game.onBeanstalkGrowth(Math.floor(this.currentHeight / this.notificationInterval) * this.notificationInterval);
      }
    }

    // Gentle leaf sway, keeping each leaf's position and base orientation.
    const matrix = new THREE.Matrix4();
    const sway = new THREE.Quaternion();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.leafCount; i++) {
      const base = this.leafBase[i];
      sway.setFromAxisAngle(up, Math.sin(this.elapsed * 1.5 + i) * 0.15);
      q.copy(base.quat).multiply(sway);
      matrix.compose(base.pos, q, one);
      this.leafMesh.setMatrixAt(i, matrix);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;
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
}
