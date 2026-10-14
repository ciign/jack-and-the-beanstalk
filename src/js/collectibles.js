import * as THREE from 'three';

/** Golden beans ring the stalk just outside Jack's climbing radius so orbiting collects them. */
export class Collectibles {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.geometry = new THREE.SphereGeometry(0.28, 16, 16);
    this.material = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0x6b5300, shininess: 80 });
    this.gap = 0.45; // beyond the stalk surface, within Jack's reach
    this.pickupDistance = 0.9;
  }

  addBeansAtHeight(height) {
    const base = this.game.beanstalk.getBasePosition();
    const count = 3 + Math.floor(Math.random() * 3);
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const bean = new THREE.Mesh(this.geometry, this.material);
      const angle = offset + (i / count) * Math.PI * 2;
      const y = base.y + height + Math.random() * 6 - 3;
      const c = this.game.beanstalk.getCenterAt(y);
      const r = this.game.beanstalk.getRadiusAt(y) + this.gap;
      bean.position.set(c.x + Math.cos(angle) * r, y, c.z + Math.sin(angle) * r);
      bean.castShadow = true;
      this.game.scene.add(bean);
      this.items.push(bean);
    }
  }

  update(dt) {
    const player = this.game.player.mesh;
    this.items = this.items.filter((bean) => {
      bean.rotation.y += dt * 2;
      bean.position.y += Math.sin(this.game.elapsed * 3 + bean.position.x) * 0.002;
      if (player && bean.position.distanceTo(player.position) < this.pickupDistance) {
        this.game.scene.remove(bean);
        this.game.onBeanCollected();
        return false;
      }
      return true;
    });
  }

  reset() {
    this.items.forEach((item) => this.game.scene.remove(item));
    this.items = [];
  }
}
