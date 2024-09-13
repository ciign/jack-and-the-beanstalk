import * as THREE from 'three';

export class Collectibles {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.geometry = new THREE.SphereGeometry(0.5, 32, 32);
    this.material = new THREE.MeshPhongMaterial({ color: 0xFFD700 }); // Gold color
  }

  addBeansAtHeight(height) {
    const beanCount = 5; // Number of beans to add at each height
    for (let i = 0; i < beanCount; i++) {
      const bean = new THREE.Mesh(this.geometry, this.material);

      // Position the bean
      const angle = (i / beanCount) * Math.PI * 2;
      const radius = 5; // Distance from the beanstalk
      bean.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
      );

      bean.castShadow = true;
      bean.receiveShadow = true;

      this.game.scene.add(bean);
      this.items.push(bean);
    }
  }

  update(deltaTime) {
    // Rotate the beans
    this.items.forEach(bean => {
      bean.rotation.y += deltaTime * 2;
    });

    // Check for collisions with the player
    if (this.game.player && this.game.player.mesh) {
      const playerPosition = this.game.player.mesh.position;
      this.items = this.items.filter(bean => {
        if (bean.position.distanceTo(playerPosition) < 1) {
          // Collision detected
          this.game.scene.remove(bean);
          this.game.incrementScore(1);
          return false;
        }
        return true;
      });
    }
  }

  reset() {
    // Remove all existing collectibles from the scene
    this.items.forEach(item => {
      if (item.parent) {
        item.parent.remove(item);
      }
    });

    // Clear the items array
    this.items = [];

    // You might want to add some initial collectibles here
    // For example:
    // this.addBeansAtHeight(10);
  }
}