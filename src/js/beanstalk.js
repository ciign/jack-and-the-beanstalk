import * as THREE from 'three';

export class Beanstalk {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Object3D();
    this.targetHeight = 200;
    this.currentHeight = 0;
    this.growthSpeed = 1;
    this.segments = 100;
    this.leafCount = 20;
    this.flowerCount = 5;

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

    for (let i = 0; i < this.leafCount; i++) {
      const t = i / (this.leafCount - 1);
      const leafPosition = this.stalkCurve.getPointAt(t);
      const leaf = this.createLeaf();
      leaf.position.copy(leafPosition);
      leaf.lookAt(this.stalkCurve.getTangentAt(t).add(leafPosition));
      this.object.add(leaf);
    }

    for (let i = 0; i < this.flowerCount; i++) {
      const t = 0.8 + (i * 0.04);
      const flowerPosition = this.stalkCurve.getPointAt(t);
      const flower = this.createFlower();
      flower.position.copy(flowerPosition);
      flower.lookAt(this.stalkCurve.getTangentAt(t).add(flowerPosition));
      this.object.add(flower);
    }

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

  createLeaf() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(2, 1, 0, 4);
    shape.quadraticCurveTo(-2, 1, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape, 12);
    const leaf = new THREE.Mesh(geometry, this.leafMaterial);
    leaf.scale.set(0.3, 0.3, 0.3);
    return leaf;
  }

  createFlower() {
    const geometry = new THREE.CircleGeometry(0.3, 5);
    return new THREE.Mesh(geometry, this.flowerMaterial);
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

    this.object.children.forEach((child, index) => {
      if (child.geometry instanceof THREE.ShapeGeometry) {
        child.rotation.y = Math.sin(this.clock.elapsedTime + index) * 0.1;
      }
    });

    if (Math.abs(this.currentHeight - this.targetHeight) > 1) {
      this.stalkCurve = this.createStalkCurve();
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