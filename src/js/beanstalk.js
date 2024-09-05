import * as THREE from 'three';

export class Beanstalk {
  constructor(game) {
    this.game = game;
    this.object = new THREE.Object3D();
    this.targetHeight = 200;
    this.growthSpeed = 0.025;
    this.currentHeight = 0;
    this.fullyGrown = false;
    this.radius = 0.5;
    this.curve = this.createCurve();
    this.createBeanstalk();
  }

  createCurve() {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, this.targetHeight * 0.25, 2),
      new THREE.Vector3(-2, this.targetHeight * 0.5, -2),
      new THREE.Vector3(2, this.targetHeight * 0.75, 2),
      new THREE.Vector3(0, this.targetHeight, 0),
    ]);
  }

  createBeanstalk() {
    const stalkMaterial = new THREE.MeshPhongMaterial({
      color: 0x228B22,
      shininess: 10,
    });

    const leafMaterial = new THREE.MeshPhongMaterial({
      color: 0x32CD32,
      side: THREE.DoubleSide,
    });

    const tubeGeometry = new THREE.TubeGeometry(this.curve, 100, this.radius, 8, false);
    const stalkMesh = new THREE.Mesh(tubeGeometry, stalkMaterial);
    this.object.add(stalkMesh);

    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const position = this.curve.getPointAt(t);

      const leafGeometry = new THREE.CircleGeometry(1, 32);
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.copy(position);
      leaf.lookAt(this.curve.getTangentAt(t).add(position));
      leaf.rotateX(Math.PI / 2);
      this.object.add(leaf);

      const tendrilCurve = new THREE.CatmullRomCurve3([
        position,
        new THREE.Vector3(position.x + Math.random() * 2 - 1, position.y + Math.random() * 2 - 1, position.z + Math.random() * 2 - 1),
        new THREE.Vector3(position.x + Math.random() * 2 - 1, position.y + Math.random() * 2 - 1, position.z + Math.random() * 2 - 1),
      ]);
      const tendrilGeometry = new THREE.TubeGeometry(tendrilCurve, 20, 0.05, 8, false);
      const tendril = new THREE.Mesh(tendrilGeometry, stalkMaterial);
      this.object.add(tendril);
    }

    this.game.scene.add(this.object);
  }

  update() {
    if (!this.fullyGrown) {
      this.currentHeight += this.growthSpeed;
      if (this.currentHeight >= this.targetHeight) {
        this.currentHeight = this.targetHeight;
        this.fullyGrown = true;
      }
      this.object.scale.y = this.currentHeight / this.targetHeight;
    }
  }

  getHeight() {
    return this.currentHeight;
  }

  getBasePosition() {
    return this.curve.getPointAt(0);
  }

  getCurve() {
    return this.curve;
  }
}