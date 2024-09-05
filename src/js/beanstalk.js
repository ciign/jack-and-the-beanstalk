import * as THREE from 'three';

export class Beanstalk {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Object3D();
    this.targetHeight = 200;
    this.currentHeight = 0;
    this.growthSpeed = 1;
    this.segments = 50; // Reduced from 100
    this.leafCount = 10; // Reduced from 20
    this.flowerCount = 3; // Reduced from 5

    this.stalkMaterial = new THREE.MeshPhongMaterial({
      color: 0x033003,
      shininess: 30,
    });

    this.leafMaterial = new THREE.MeshPhongMaterial({
      color: 0x9ACD32,
      side: THREE.DoubleSide,
    });

    this.flowerMaterial = new THREE.MeshPhongMaterial({
      color: 0xe91e63,
      shininess: 50,
    });

    this.clock = new THREE.Clock();
    this.stalkMesh = null;
    this.leafMesh = null;
    this.flowerMesh = null;
    this.lastNotifiedHeight = 0;
    this.notificationInterval = 10;
    this.stalkCurve = this.createStalkCurve();
  }

  loadModel() {
    return new Promise((resolve) => {
      this.createBeanstalk();
      resolve();
    });
  }

  createBeanstalk() {
    const stalkGeometry = new THREE.TubeGeometry(this.stalkCurve, this.segments, 0.1, 8, false);
    this.stalkMesh = new THREE.Mesh(stalkGeometry, this.stalkMaterial);
    this.object.add(this.stalkMesh);

    const leafGeometry = this.createLeafGeometry();
    this.leafMesh = new THREE.InstancedMesh(leafGeometry, this.leafMaterial, this.leafCount);

    const flowerGeometry = new THREE.CircleGeometry(0.3, 5);
    this.flowerMesh = new THREE.InstancedMesh(flowerGeometry, this.flowerMaterial, this.flowerCount);

    this.updateLeafAndFlowerPositions();

    this.object.add(this.leafMesh, this.flowerMesh);
    this.game.scene.add(this.object);
  }

  createStalkCurve() {
    const points = [];
    for (let i = 0; i <= this.segments; i++) {
      const t = i / this.segments;
      const angle = t * Math.PI * 2 * 8;
      const radius = 0.5 * (1 - t * 0.85);
      points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          t * this.targetHeight,
          Math.sin(angle) * radius
      ));
    }
    return new THREE.CatmullRomCurve3(points);
  }

  createLeafGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(2, 1, 0, 4);
    shape.quadraticCurveTo(-2, 1, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape, 12);
    geometry.scale(0.3, 0.3, 0.3);
    return geometry;
  }

  updateLeafAndFlowerPositions() {
    const matrix = new THREE.Matrix4();
    const tempVector = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();

    for (let i = 0; i < this.leafCount; i++) {
      const t = i / (this.leafCount - 1);
      const leafPosition = this.stalkCurve.getPointAt(t);
      const tangent = this.stalkCurve.getTangentAt(t);

      tempQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      matrix.makeRotationFromQuaternion(tempQuaternion);
      matrix.setPosition(leafPosition);

      this.leafMesh.setMatrixAt(i, matrix);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.flowerCount; i++) {
      const t = 0.8 + (i * 0.04);
      const flowerPosition = this.stalkCurve.getPointAt(t);
      const tangent = this.stalkCurve.getTangentAt(t);

      tempQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      matrix.makeRotationFromQuaternion(tempQuaternion);
      matrix.setPosition(flowerPosition);

      this.flowerMesh.setMatrixAt(i, matrix);
    }
    this.flowerMesh.instanceMatrix.needsUpdate = true;
  }

  update() {
    const deltaTime = this.clock.getDelta();
    const previousHeight = this.currentHeight;
    this.currentHeight += this.growthSpeed * deltaTime;
    if (this.currentHeight > this.targetHeight) {
      this.currentHeight = this.targetHeight;
    }

    if (Math.floor(this.currentHeight / this.notificationInterval) >
        Math.floor(this.lastNotifiedHeight / this.notificationInterval)) {
      this.game.onBeanstalkGrowth(this.currentHeight);
      this.lastNotifiedHeight = this.currentHeight;
    }

    const growthFactor = this.currentHeight / this.targetHeight;
    this.object.scale.y = growthFactor;

    if (this.stalkMesh) {
      const minWidth = 0.1;
      const maxWidth = 0.8;
      const newWidth = minWidth + (maxWidth - minWidth) * growthFactor;

      const newGeometry = new THREE.TubeGeometry(this.stalkCurve, this.segments, newWidth, 8, false);
      this.stalkMesh.geometry.dispose();
      this.stalkMesh.geometry = newGeometry;
    }

    // Update leaf rotations
    const tempMatrix = new THREE.Matrix4();
    for (let i = 0; i < this.leafCount; i++) {
      this.leafMesh.getMatrixAt(i, tempMatrix);
      const rotation = Math.sin(this.clock.elapsedTime + i) * 0.1;
      tempMatrix.makeRotationY(rotation);
      this.leafMesh.setMatrixAt(i, tempMatrix);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;

    if (Math.abs(this.currentHeight - this.targetHeight) > 1) {
      this.stalkCurve = this.createStalkCurve();
      this.updateLeafAndFlowerPositions();
    }
  }

  getHeight() {
    return this.currentHeight;
  }

  getBasePosition() {
    return this.object.position;
  }

  getPointOnStalk(t) {
    return this.stalkCurve.getPointAt(t);
  }
}