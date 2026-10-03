/**
 * Sky Temple — isometric canvas renderer.
 *
 * All art is procedural: sky gradients, clouds, stars and shaded stones are
 * drawn with 2D canvas primitives. Nothing here touches game rules; it only
 * reads the StackGame state and a Camera.
 *
 * Projection (2:1 isometric):
 *   screenX = centreX + (x - z) * K
 *   screenY = anchorY + (x + z) * K / 2 - (y - focusY) * K
 * where K is the camera scale in pixels per world unit.
 */
import { stoneColors, skyColors, hsl, lerp } from '../core/palette.js';

/** @typedef {{ focusY:number, anchor:number, K:number, shakeX:number, shakeY:number }} Camera */

const MARBLE = { top: 'hsl(40 20% 92%)', right: 'hsl(40 18% 78%)', left: 'hsl(40 16% 66%)', edge: 'hsl(45 90% 70% / 0.9)' };
const PLINTH_DEPTH = 40; // how far the base column extends below the first stone (world units)

/** Small deterministic PRNG so clouds and stars are identical every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.clouds = this.makeClouds();
    this.stars = this.makeStars();
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Camera scale that makes a stone read well on any aspect ratio. */
  baseScale() {
    return Math.min(this.w * 0.27, this.h * 0.17);
  }

  /** World → screen. @returns {[number, number]} */
  project(x, y, z, cam) {
    const px = this.w / 2 + (x - z) * cam.K + cam.shakeX;
    const py = this.h * cam.anchor + (x + z) * cam.K * 0.5 - (y - cam.focusY) * cam.K + cam.shakeY;
    return [px, py];
  }

  /* ───────────── background ───────────── */

  makeClouds() {
    const rnd = mulberry32(7);
    const clouds = [];
    for (let i = 0; i < 160; i++) {
      clouds.push({
        y: -3 + i * 0.75 + rnd() * 0.5,          // world height
        off: (rnd() - 0.5) * 5.2,                 // horizontal offset in K units
        scale: 0.35 + rnd() * 0.55,
        speed: (0.04 + rnd() * 0.08) * (rnd() < 0.5 ? 1 : -1),
        puffs: 3 + Math.floor(rnd() * 3),
        seed: rnd() * 1000,
      });
    }
    return clouds;
  }

  makeStars() {
    const rnd = mulberry32(99);
    const stars = [];
    for (let i = 0; i < 140; i++) {
      stars.push({ x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.4, tw: rnd() * Math.PI * 2, par: 0.05 + rnd() * 0.12 });
    }
    return stars;
  }

  drawSky(heightStones) {
    const { ctx, w, h } = this;
    const sky = skyColors(heightStones);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return sky;
  }

  drawStars(night, cam, time) {
    if (night <= 0.01) return;
    const { ctx, w, h } = this;
    ctx.save();
    for (const s of this.stars) {
      const y = (((s.y * h + cam.focusY * cam.K * s.par) % h) + h) % h;
      const x = s.x * w;
      const tw = 0.55 + 0.45 * Math.sin(time * 2 + s.tw);
      ctx.globalAlpha = night * tw;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawClouds(cam, time, night) {
    const { ctx, w, h } = this;
    const alpha = 1 - night;
    if (alpha <= 0.02) return;
    ctx.save();
    for (const c of this.clouds) {
      const [, py] = this.project(0, c.y, 0, cam);
      if (py < -80 || py > h + 80) continue;
      const drift = ((time * c.speed * cam.K + c.seed * 37) % (w + 300)) - 150;
      const px = ((w / 2 + c.off * cam.K + drift) % (w + 300) + (w + 300)) % (w + 300) - 150;
      const r = cam.K * 0.42 * c.scale;
      ctx.globalAlpha = alpha * 0.88;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let p = 0; p < c.puffs; p++) {
        const a = c.seed + p * 1.7;
        const ox = (p - (c.puffs - 1) / 2) * r * 0.9;
        const oy = Math.sin(a) * r * 0.25;
        const rr = r * (0.7 + 0.3 * Math.abs(Math.cos(a)));
        ctx.moveTo(px + ox + rr, py + oy);
        ctx.arc(px + ox, py + oy, rr, 0, Math.PI * 2);
      }
      // flat underside
      const half = r * c.puffs * 0.45;
      ctx.moveTo(px - half, py);
      ctx.rect(px - half, py, half * 2, r * 0.45);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ───────────── stones ───────────── */

  /**
   * Draw one axis-aligned box with isometric shading.
   * @param {{x:number,z:number,w:number,d:number,y:number,h:number}} b
   * @param {{top:string,right:string,left:string,edge:string}} col
   */
  drawBlock(b, col, cam, alpha = 1) {
    const { ctx } = this;
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
    const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
    const y0 = b.y, y1 = b.y + b.h;
    const P = (x, y, z) => this.project(x, y, z, cam);

    const tA = P(x0, y1, z0), tB = P(x1, y1, z0), tC = P(x1, y1, z1), tD = P(x0, y1, z1);
    const bB = P(x1, y0, z0), bC = P(x1, y0, z1), bD = P(x0, y0, z1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';

    // +X face (right)
    ctx.fillStyle = col.right;
    ctx.beginPath();
    ctx.moveTo(tB[0], tB[1]); ctx.lineTo(tC[0], tC[1]); ctx.lineTo(bC[0], bC[1]); ctx.lineTo(bB[0], bB[1]);
    ctx.closePath(); ctx.fill();

    // +Z face (left)
    ctx.fillStyle = col.left;
    ctx.beginPath();
    ctx.moveTo(tD[0], tD[1]); ctx.lineTo(tC[0], tC[1]); ctx.lineTo(bC[0], bC[1]); ctx.lineTo(bD[0], bD[1]);
    ctx.closePath(); ctx.fill();

    // top face
    ctx.fillStyle = col.top;
    ctx.beginPath();
    ctx.moveTo(tA[0], tA[1]); ctx.lineTo(tB[0], tB[1]); ctx.lineTo(tC[0], tC[1]); ctx.lineTo(tD[0], tD[1]);
    ctx.closePath(); ctx.fill();

    // crisp lit edge along the top-front rim
    ctx.strokeStyle = col.edge;
    ctx.lineWidth = Math.max(1, cam.K * 0.018);
    ctx.beginPath();
    ctx.moveTo(tB[0], tB[1]); ctx.lineTo(tC[0], tC[1]); ctx.lineTo(tD[0], tD[1]);
    ctx.stroke();

    ctx.restore();
  }

  /** Outline of a block's top face (used for perfect rings). */
  topFacePath(b, cam, inflate = 0) {
    const { ctx } = this;
    const x0 = b.x - b.w / 2 - inflate, x1 = b.x + b.w / 2 + inflate;
    const z0 = b.z - b.d / 2 - inflate, z1 = b.z + b.d / 2 + inflate;
    const y1 = b.y + b.h;
    const P = (x, z) => this.project(x, y1, z, cam);
    const a = P(x0, z0), bb = P(x1, z0), c = P(x1, z1), d = P(x0, z1);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(bb[0], bb[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    ctx.closePath();
  }

  /** The marble plinth: stone 0 drawn as a tall column with a gold band. */
  drawPlinth(base, cam) {
    const column = { ...base, y: base.y - PLINTH_DEPTH, h: base.h + PLINTH_DEPTH };
    this.drawBlock(column, MARBLE, cam);
    // gold band just under the top rim
    const { ctx } = this;
    const band = { ...base, y: base.y - base.h * 0.25, h: base.h * 0.18 };
    const x1 = band.x + band.w / 2, z1 = band.z + band.d / 2, x0 = band.x - band.w / 2, z0 = band.z - band.d / 2;
    const P = (x, y, z) => this.project(x, y, z, cam);
    ctx.save();
    ctx.fillStyle = 'hsl(45 85% 60%)';
    let p1 = P(x1, band.y + band.h, z0), p2 = P(x1, band.y + band.h, z1), p3 = P(x1, band.y, z1), p4 = P(x1, band.y, z0);
    ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.lineTo(...p4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'hsl(45 80% 48%)';
    p1 = P(x0, band.y + band.h, z1); p2 = P(x1, band.y + band.h, z1); p3 = P(x1, band.y, z1); p4 = P(x0, band.y, z1);
    ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.lineTo(...p4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /** Whether a block is on screen (cheap vertical test; blocks are centred horizontally). */
  visible(b, cam) {
    const [, topY] = this.project(b.x - b.w / 2, b.y + b.h, b.z - b.d / 2, cam);
    const [, botY] = this.project(b.x + b.w / 2, b.y, b.z + b.d / 2, cam);
    return botY > -40 && topY < this.h + 40;
  }

  /** Draw every placed stone, bottom to top. */
  drawTower(game, cam, seedHue) {
    const blocks = game.blocks;
    const base = blocks[0];
    if (this.visible({ ...base, y: base.y - PLINTH_DEPTH, h: base.h + PLINTH_DEPTH }, cam)) this.drawPlinth(base, cam);
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (!this.visible(b, cam)) continue;
      this.drawBlock(b, stoneColors(b.index, seedHue), cam);
    }
  }

  /** Shadow of the sliding stone on the top face, then the stone itself. */
  drawMoving(game, cam, seedHue) {
    const m = game.moving;
    if (!m) return;
    const top = game.top();
    // footprint intersection → alignment shadow
    const x0 = Math.max(m.x - m.w / 2, top.x - top.w / 2), x1 = Math.min(m.x + m.w / 2, top.x + top.w / 2);
    const z0 = Math.max(m.z - m.d / 2, top.z - top.d / 2), z1 = Math.min(m.z + m.d / 2, top.z + top.d / 2);
    if (x1 > x0 && z1 > z0) {
      const sh = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y: top.y, h: top.h };
      this.topFacePath(sh, cam);
      this.ctx.fillStyle = 'rgba(0,0,0,0.16)';
      this.ctx.fill();
    }
    this.drawBlock(m, stoneColors(m.index, seedHue), cam);
  }

  /** Vignette to focus the eye and give HUD text contrast. */
  drawVignette() {
    const { ctx, w, h } = this;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

export { hsl, lerp };
