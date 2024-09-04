import * as THREE from 'three';

export class Beanstalk {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Object3D();
    this.segments = [];
    this.targetHeight = 200;
    this.growthSpeed = 0.5;
    this.currentHeight = 0;
    this.fullyGrown = false;
    this.segmentHeight = 5;
    this.radius = 2;
    this.createBeanstalk();
  }

  createBeanstalk() {
    const geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.segmentHeight, 8);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

    const natureTop = this.game.nature.getTopPosition();
    this.object.position.copy(natureTop);

    const totalSegments = Math.ceil(this.targetHeight / this.segmentHeight);

    for (let i = 0; i < totalSegments; i++) {
      const segment = new THREE.Mesh(geometry, material);
      segment.position.y = i * this.segmentHeight + this.segmentHeight / 2;
      segment.scale.set(1, 0, 1); // Start with zero height
      this.segments.push(segment);
      this.object.add(segment);
    }

    this.game.scene.add(this.object);
    console.log('Beanstalk added to scene');
  }

  update() {
    if (!this.fullyGrown) {
      this.currentHeight += this.growthSpeed;
      if (this.currentHeight >= this.targetHeight) {
        this.currentHeight = this.targetHeight;
        this.fullyGrown = true;
      }

      const grownSegments = Math.floor(this.currentHeight / this.segmentHeight);
      const partialSegmentScale = (this.currentHeight % this.segmentHeight) / this.segmentHeight;

      for (let i = 0; i < this.segments.length; i++) {
        if (i < grownSegments) {
          this.segments[i].scale.y = 1;
        } else if (i === grownSegments) {
          this.segments[i].scale.y = partialSegmentScale;
        } else {
          this.segments[i].scale.y = 0;
        }
      }
    }
  }

  getHeight() {
    return this.currentHeight;
  }

  getBasePosition() {
    return this.object.position.clone();
  }
}