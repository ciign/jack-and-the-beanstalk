import * as THREE from 'three';

/**
 * Top-down minimap. The island is rendered once into a small texture after the
 * assets load; markers (Jack, stalk, beans, castle) are drawn on a 2D canvas each
 * frame. A vertical bar beside it shows progress up the stalk.
 */
export class Minimap {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('minimap');
    this.fill = document.getElementById('height-fill');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.size = this.canvas ? this.canvas.width : 0;
    this.background = null;
    this.bounds = null;
    this.tmp = new THREE.Vector3();
    this.frame = 0;
  }

  /** Render the terrain from above into an offscreen image. Call once after loading. */
  capture() {
    if (!this.ctx || !this.game.nature.mesh) return;
    const { renderer, scene, player } = this.game;
    const box = new THREE.Box3().setFromObject(this.game.nature.mesh);
    const pad = 2;
    this.bounds = { minX: box.min.x - pad, maxX: box.max.x + pad, minZ: box.min.z - pad, maxZ: box.max.z + pad };
    const w = this.bounds.maxX - this.bounds.minX;
    const d = this.bounds.maxZ - this.bounds.minZ;
    const span = Math.max(w, d);
    const cx = (this.bounds.minX + this.bounds.maxX) / 2;
    const cz = (this.bounds.minZ + this.bounds.maxZ) / 2;
    // Square bounds so the map is not stretched.
    this.bounds = { minX: cx - span / 2, maxX: cx + span / 2, minZ: cz - span / 2, maxZ: cz + span / 2 };

    const camera = new THREE.OrthographicCamera(-span / 2, span / 2, span / 2, -span / 2, 1, 1000);
    camera.position.set(cx, box.max.y + 100, cz);
    camera.up.set(0, 0, -1);
    camera.lookAt(cx, 0, cz);

    const size = this.size;
    const target = new THREE.WebGLRenderTarget(size, size);
    const hidden = [player.mesh, this.game.beanstalk.object, this.game.castle.mesh, this.game.giant.mesh, this.game.moreCloud.mesh].filter(Boolean);
    const prevVisible = hidden.map((o) => o.visible);
    hidden.forEach((o) => { o.visible = false; });
    const prevBackground = scene.background;
    scene.background = new THREE.Color(0x0b0716);

    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(size * size * 4);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    renderer.setRenderTarget(null);
    target.dispose();

    scene.background = prevBackground;
    hidden.forEach((o, i) => { o.visible = prevVisible[i]; });

    // GL rows are bottom-up; flip so +z (map down) ends up at the bottom.
    const image = this.ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * size * 4;
      image.data.set(pixels.subarray(src, src + size * 4), y * size * 4);
    }
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    off.getContext('2d').putImageData(image, 0, 0);
    this.background = off;
  }

  toMap(x, z) {
    const b = this.bounds;
    return [((x - b.minX) / (b.maxX - b.minX)) * this.size, ((z - b.minZ) / (b.maxZ - b.minZ)) * this.size];
  }

  update() {
    if (!this.ctx || !this.background) return;
    if (this.frame++ % 2) return; // 30 Hz is plenty
    const ctx = this.ctx;
    const g = this.game;
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.drawImage(this.background, 0, 0);

    // Beanstalk base + castle.
    const base = g.beanstalk.getBasePosition();
    let [bx, bz] = this.toMap(base.x, base.z);
    ctx.beginPath();
    ctx.arc(bx, bz, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#7ddc5a';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#1b5e20';
    ctx.stroke();

    // Beans still to collect.
    ctx.fillStyle = '#ffd700';
    g.collectibles.items.forEach((bean) => {
      const [x, z] = this.toMap(bean.position.x, bean.position.z);
      ctx.beginPath();
      ctx.arc(x, z, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Jack: a small arrow showing his heading.
    if (g.player.mesh) {
      const p = g.player.mesh.position;
      const [x, z] = this.toMap(p.x, p.z);
      const a = g.player.rotationAngle; // forward = (sin a, cos a) in world xz
      ctx.save();
      ctx.translate(x, z);
      ctx.rotate(Math.atan2(Math.sin(a), Math.cos(a))); // screen-x = world-x, screen-y = world-z
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(-5, -5);
      ctx.lineTo(0, -2);
      ctx.lineTo(5, -5);
      ctx.closePath();
      ctx.fillStyle = '#ff00ae';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Height progress.
    if (this.fill) {
      const pct = Math.min(1, g.player.getHeight() / g.beanstalk.targetHeight);
      this.fill.style.height = `${(pct * 100).toFixed(1)}%`;
    }
  }
}
