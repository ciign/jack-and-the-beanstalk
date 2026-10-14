import * as THREE from 'three';

/** Small clouds that drift around the stalk. Touching one knocks Jack down a little. */
export class Obstacles {
  constructor(game) {
    this.game = game;
    this.clouds = [];
    this.geometry = new THREE.SphereGeometry(0.6, 16, 16);
    this.material = new THREE.MeshPhongMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.8 });
    this.gap = 0.5;
    this.center = new THREE.Vector3();
    this.hitDistance = 1.0;
    this.hitCooldown = 0;
  }

  addCloudsAtHeight(height) {
    const base = this.game.beanstalk.getBasePosition();
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const cloud = new THREE.Mesh(this.geometry, this.material);
      cloud.userData.angle = Math.random() * Math.PI * 2;
      cloud.userData.speed = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
      cloud.userData.baseY = base.y + height + 5 + Math.random() * 4;
      this.game.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  update(dt) {
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    const player = this.game.player.mesh;

    this.clouds.forEach((cloud) => {
      cloud.userData.angle += cloud.userData.speed * dt;
      const y = cloud.userData.baseY + Math.sin(this.game.elapsed * 2 + cloud.userData.angle) * 0.3;
      const c = this.game.beanstalk.getCenterAt(y, this.center);
      const r = this.game.beanstalk.getRadiusAt(y) + this.gap;
      cloud.position.set(c.x + Math.cos(cloud.userData.angle) * r, y, c.z + Math.sin(cloud.userData.angle) * r);
      if (player && this.hitCooldown === 0 && cloud.position.distanceTo(player.position) < this.hitDistance) {
        this.hitCooldown = 1.0;
        this.game.playerHitObstacle();
      }
    });
  }

  reset() {
    this.clouds.forEach((cloud) => this.game.scene.remove(cloud));
    this.clouds = [];
    this.hitCooldown = 0;
  }
}
