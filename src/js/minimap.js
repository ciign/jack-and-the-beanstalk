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
    this.viewRadius = 14; // world units visible from the centre to the edge of the circle
    this.center = { x: 0, z: 0 };
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

  /** World (x, z) to canvas pixels, centred on Jack (before the heading rotation). */
  toMap(x, z) {
    const scale = this.size / 2 / this.viewRadius;
    return [this.size / 2 + (x - this.center.x) * scale, this.size / 2 + (z - this.center.z) * scale];
  }

  drawBackground() {
    const b = this.bounds;
    const worldPerPx = (b.maxX - b.minX) / this.size; // capture image scale
    // Draw a window 1.5x wider than the circle so rotation never shows the square's corners.
    const r = this.viewRadius * 1.5;
    const sx = (this.center.x - r - b.minX) / worldPerPx;
    const sz = (this.center.z - r - b.minZ) / worldPerPx;
    const sw = (r * 2) / worldPerPx;
    const d = this.size * 1.5;
    this.ctx.drawImage(this.background, sx, sz, sw, sw, (this.size - d) / 2, (this.size - d) / 2, d, d);
  }

  update() {
    if (!this.ctx || !this.background) return;
    if (this.frame++ % 2) return; // 30 Hz is plenty
    const ctx = this.ctx;
    const g = this.game;
    if (g.player.mesh) {
      this.center.x = g.player.mesh.position.x;
      this.center.z = g.player.mesh.position.z;
    }
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.size / 2, this.size / 2, this.size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#0b0716';
    ctx.fillRect(0, 0, this.size, this.size);

    // Heading-up: rotate the world around Jack so his forward direction points up.
    // Forward in world xz is (sin a, cos a); screen x = world x, screen y = world z.
    const heading = g.player.rotationAngle;
    ctx.translate(this.size / 2, this.size / 2);
    ctx.rotate(heading - Math.PI);
    ctx.translate(-this.size / 2, -this.size / 2);
    this.drawBackground();

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

    ctx.restore();

    // Jack: fixed at the centre, always pointing up.
    ctx.save();
    ctx.translate(this.size / 2, this.size / 2);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fillStyle = '#ff00ae';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Compass: which way is north on the rotated map.
    ctx.save();
    ctx.translate(this.size / 2, this.size / 2);
    ctx.rotate(heading - Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -this.size / 2 + 12);
    ctx.restore();

    // Height progress.
    if (this.fill) {
      const pct = Math.min(1, g.player.getHeight() / g.beanstalk.targetHeight);
      this.fill.style.height = `${(pct * 100).toFixed(1)}%`;
    }
  }
}
