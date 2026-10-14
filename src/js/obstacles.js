import * as THREE from 'three';

/** Small clouds that drift around the stalk. Touching one knocks Jack down a little. */
export class Obstacles {
  constructor(game) {
    this.game = game;
    this.clouds = [];
    this.geometry = new THREE.SphereGeometry(0.6, 16, 16);
    this.material = new THREE.MeshPhongMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.8 });
    this.ringRadius = 1.2;
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
    const base = this.game.beanstalk.getBasePosition();
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    const player = this.game.player.mesh;

    this.clouds.forEach((cloud) => {
      cloud.userData.angle += cloud.userData.speed * dt;
      cloud.position.set(
        base.x + Math.cos(cloud.userData.angle) * this.ringRadius,
        cloud.userData.baseY + Math.sin(this.game.elapsed * 2 + cloud.userData.angle) * 0.3,
        base.z + Math.sin(cloud.userData.angle) * this.ringRadius
      );
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
