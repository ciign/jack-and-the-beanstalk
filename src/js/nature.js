import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const isWater = (c) => c.b > c.r && c.b > c.g;
const isFoliage = (c) => c.g > c.r && c.g > c.b;

export class Nature {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.timeUniforms = [];
  }

  /**
   * The island is one mesh with per-material groups, so we animate by material:
   * foliage sways (gated by world height so the grass stays still) and water ripples.
   * Vertex offsets are applied in the shader only; raycasts still use the static geometry.
   */
  animateMaterial(material) {
    if (!material || !material.color) return;
    const water = isWater(material.color);
    const foliage = isFoliage(material.color);
    if (!water && !foliage) return;

    const uTime = { value: 0 };
    this.timeUniforms.push(uTime);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vWave;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 wp = modelMatrix * vec4(transformed, 1.0);
          float objScale = length(modelMatrix[0].xyz);
          ${water ? `
          float w = sin(wp.x * 1.6 + uTime * 1.8) * 0.5 + sin(wp.z * 2.3 - uTime * 1.3) * 0.5;
          transformed.y += w * 0.05 / objScale;
          vWave = w;` : `
          float sway = smoothstep(0.5, 6.0, wp.y) * 0.1;
          float phase = uTime * 1.2 + wp.x * 0.45 + wp.z * 0.3;
          transformed.x += sin(phase) * sway / objScale;
          transformed.z += cos(phase * 0.8) * sway * 0.6 / objScale;
          vWave = 0.0;`}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWave;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          ${water ? 'diffuseColor.rgb *= 1.0 + vWave * 0.08;' : ''}`);
    };
    // Materials with identical settings share a compiled program unless the cache key
    // differs; without this the water wave would be applied to the grass as well.
    material.customProgramCacheKey = () => (water ? 'ciign-water' : 'ciign-foliage');
    material.needsUpdate = true;
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
                      (Array.isArray(child.material) ? child.material : [child.material]).forEach((m) => this.animateMaterial(m));

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

  update(dt) {
    for (const u of this.timeUniforms) u.value += dt;
  }
}