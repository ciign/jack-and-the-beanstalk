import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export class Nature {
  constructor(game) {
    this.game = game;
    this.mesh = null;
  }

  loadModel() {
    return new Promise((resolve, reject) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.setPath('assets/models/');
      mtlLoader.load('nature.mtl', (materials) => {
            materials.preload();

            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.setPath('assets/models/');
            objLoader.load('nature.obj', (object) => {
                  this.mesh = object;
                  this.mesh.scale.set(10, 10, 10);
                  this.mesh.position.set(0, 0, 0);

                  this.mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;

                      if (child.material) {
                        child.material.needsUpdate = true;

                        if (child.material.map) {
                          child.material.map.anisotropy = 16;
                          child.material.map.needsUpdate = true;
                        }
                      }
                    }
                  });

                  this.game.scene.add(this.mesh);
                  console.log('Nature model loaded and added to scene');
                  resolve();
                },
                (xhr) => {
                  console.log('Nature model: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
                },
                (error) => {
                  console.error('Error loading nature model:', error);
                  reject(error);
                });
          },
          (xhr) => {
            console.log('Nature MTL: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          (error) => {
            console.error('Error loading nature MTL:', error);
            reject(error);
          });
    });
  }

  getTopPosition() {
    if (!this.mesh) {
      console.error('Nature mesh is not loaded. Cannot get top position.');
      return new THREE.Vector3(0, 0, 0);
    }

    const bbox = new THREE.Box3().setFromObject(this.mesh);
    return new THREE.Vector3(0, bbox.max.y, 0);
  }

  update() {
    // Add any nature-specific update logic here
  }
}