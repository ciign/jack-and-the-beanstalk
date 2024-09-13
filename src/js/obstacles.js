import * as THREE from 'three';

export class Obstacles {
  constructor(game) {
    this.game = game;
    this.clouds = [];
    this.geometry = new THREE.SphereGeometry(1, 32, 32);
    this.material = new THREE.MeshPhongMaterial({ color: 0xDDDDDD, transparent: true, opacity: 0.7 });
  }

  addCloudsAtHeight(height) {
    const cloudCount = 3; // Number of clouds to add at each height
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Mesh(this.geometry, this.material);

      // Position the cloud
      const angle = (i / cloudCount) * Math.PI * 2;
      const radius = 8; // Distance from the beanstalk
      cloud.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
      );

      cloud.castShadow = true;
      cloud.receiveShadow = true;

      this.game.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  update(deltaTime) {
    // Move the clouds
    this.clouds.forEach(cloud => {
      cloud.position.y += Math.sin(this.game.clock.elapsedTime * 2) * 0.01;
    });

    // Check for collisions with the player
    if (this.game.player && this.game.player.mesh) {
      const playerPosition = this.game.player.mesh.position;
      this.clouds.forEach(cloud => {
        if (cloud.position.distanceTo(playerPosition) < 1.5) {
          // Collision detected
          this.game.playerHitObstacle();
        }
      });
    }
  }

  reset() {
    // Remove all existing obstacles from the scene
    this.clouds.forEach(cloud => {
      if (cloud.parent) {
        cloud.parent.remove(cloud);
      }
    });

    // Clear the clouds array
    this.clouds = [];

    // You might want to add some initial obstacles here
    // For example:
    // this.addCloudsAtHeight(20);
  }
}