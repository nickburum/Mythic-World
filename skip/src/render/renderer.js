/**
 * SKIP — the lake, tuned for phones.
 *
 * Performance: expensive layers (sky gradient + sun glow, water gradient,
 * vignette) are rasterised once into offscreen canvases and only rebuilt when
 * the day phase or the viewport changes. Live layers (mountains, water lines,
 * stone, particles) are cheap polygons and arcs. `setQuality` trades DPR and
 * particle counts for frame time; main.js steps it down when frames run long.
 *
 * Light: the sun arcs across the sky with distance and sets; the moon rises.
 * Every shadow (stone, lily pads, clouds) is cast from the current light
 * through the object onto the water plane (see core/sky.js), so shadows swing
 * and lengthen as the sun goes down.
 */
import { CONFIG } from '../core/config.js';
import { scene, STONE, MOTE, PAD, hsl, lerp } from '../core/palette.js';
import { sky, shadowX } from '../core/sky.js';

const TAU = Math.PI * 2;
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(seed) {
  const rnd = mulberry32(seed), vals = Array.from({ length: 512 }, () => rnd());
  return (x) => { const i = Math.floor(x), f = x - i, a = vals[((i % 512) + 512) % 512], b = vals[(((i + 1) % 512) + 512) % 512]; const u = f * f * (3 - 2 * f); return a + (b - a) * u; };
}

export const QUALITY = Object.freeze({
  high:   { dpr: 2,   stars: 160, clouds: 6, waterLines: 1,   fireflies: 18, birds: true },
  medium: { dpr: 1.5, stars: 100, clouds: 5, waterLines: 0.6, fireflies: 12, birds: true },
  low:    { dpr: 1,   stars: 60,  clouds: 4, waterLines: 0.35, fireflies: 8,  birds: false },
});

export class Renderer {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.w = 0; this.h = 0; this.dpr = 1;
    this.ppm = 40; this.vScale = 2.6; this.camX = -3; this.waterY = 0;
    this.noiseFar = makeNoise(11); this.noiseNear = makeNoise(23); this.noiseTrees = makeNoise(37);
    this.stars = this.makeStars(); this.clouds = this.makeClouds();
    this.birds = null; this.nextBirds = 6;
    this.cache = { phase: -1, sky: null, water: null, vignette: null };
    this.setQuality(quality);
  }

  setQuality(level) {
    this.quality = level; this.q = QUALITY[level] || QUALITY.high;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.q.dpr);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ppm = Math.max(26, Math.min(this.w / 10.5, this.h / 16));
    this.waterY = Math.round(this.h * 0.58);
    this.cache.phase = -1; this.cache.vignette = null;   // force layer rebuild
  }

  makeStars() { const r = mulberry32(3); return Array.from({ length: 160 }, () => ({ x: r(), y: r() * 0.9, r: 0.5 + r() * 1.3, tw: r() * TAU })); }
  makeClouds() { const r = mulberry32(9); return Array.from({ length: 6 }, (_, i) => ({ x: i / 6 + r() * 0.1, y: 0.1 + r() * 0.3, s: 0.45 + r() * 0.55, puffs: 3 + Math.floor(r() * 3), seed: r() * 100 })); }

  /* ───────────── camera ───────────── */
  follow(stoneX, dt, snap = false) {
    const target = stoneX - (this.w * 0.36) / this.ppm;
    if (snap) { this.camX = target; return; }
    this.camX += (target - this.camX) * Math.min(1, dt * 7);
  }
  sx(x) { return (x - this.camX) * this.ppm; }
  sy(y) { return this.waterY - y * this.ppm * this.vScale; }

  /** Screen position of a celestial body / the light. alt 1 = 38 % down the sky. */
  bodyScreen(b) { return [b.x * this.w, this.waterY * (1 - 0.62 * b.alt)]; }

  /* ───────────── cached layers ───────────── */
  layer(name) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(this.w * this.dpr)); c.height = Math.max(1, Math.round(this.h * this.dpr));
    const ctx = c.getContext('2d'); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cache[name] = c; return ctx;
  }

  /** Rebuild sky + water gradients when the phase has moved enough to notice. */
  ensureLayers(S, K, phase) {
    if (Math.abs(phase - this.cache.phase) < 0.004 && this.cache.sky) return;
    this.cache.phase = phase;
    const { w, h, waterY } = this;
    // sky
    let ctx = this.layer('sky');
    const g = ctx.createLinearGradient(0, 0, 0, waterY);
    g.addColorStop(0, S.skyTop); g.addColorStop(0.62, S.skyMid); g.addColorStop(1, S.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, waterY + 1);
    // glow + discs for sun and moon
    for (const body of ['sun', 'moon']) {
      const b = K[body]; if (!b.visible) continue;
      const [x, y] = this.bodyScreen(b);
      const R = Math.min(w, h) * (body === 'sun' ? 0.07 : 0.055);
      const col = body === 'sun' ? S.sunGlowHsl : [210, 60, 75];
      const glow = ctx.createRadialGradient(x, y, R * 0.3, x, y, R * (body === 'sun' ? 5 : 3.5));
      glow.addColorStop(0, hsl(col[0], col[1], col[2], body === 'sun' ? 0.55 : 0.35)); glow.addColorStop(1, hsl(col[0], col[1], col[2], 0));
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, waterY);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, waterY); ctx.clip();
      ctx.fillStyle = body === 'sun' ? S.sun : '#f1ecd8'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      if (body === 'moon') { ctx.globalAlpha = 0.35; ctx.fillStyle = '#c9d2e3'; ctx.beginPath(); ctx.arc(x - R * 0.3, y - R * 0.2, R * 0.22, 0, TAU); ctx.arc(x + R * 0.3, y + R * 0.3, R * 0.15, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
    }
    // water base
    ctx = this.layer('water');
    const wg = ctx.createLinearGradient(0, waterY, 0, h);
    wg.addColorStop(0, S.skyBot); wg.addColorStop(0.25, S.water); wg.addColorStop(1, S.deep);
    ctx.fillStyle = wg; ctx.fillRect(0, waterY, w, h - waterY);
    // vignette (static per size)
    if (!this.cache.vignette) {
      ctx = this.layer('vignette');
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.5, w / 2, h / 2, Math.max(w, h) * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    }
  }

  blit(name) { this.ctx.drawImage(this.cache[name], 0, 0, this.w, this.h); }

  /* ───────────── live sky ───────────── */
  drawStars(S, time) {
    if (S.stars <= 0.02) return;
    const { ctx, w } = this;
    const n = Math.min(this.stars.length, this.q.stars);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const s = this.stars[i];
      ctx.globalAlpha = S.stars * (0.6 + 0.4 * Math.sin(time * 1.7 + s.tw)) * 0.9;
      ctx.beginPath(); ctx.arc(s.x * w, s.y * this.waterY * 0.9, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  cloudScreen(c, time) {
    const w = this.w, drift = time * 6;
    const x = (((c.x * w + drift * c.s - this.camX * this.ppm * 0.05) % (w * 1.3)) + w * 1.3) % (w * 1.3) - w * 0.15;
    return [x, c.y * this.waterY, 16 * c.s * (this.w / 390)];
  }

  drawClouds(S, K, time) {
    const { ctx } = this;
    const [lx] = this.bodyScreen(K.light);
    const n = Math.min(this.clouds.length, this.q.clouds);
    for (let i = 0; i < n; i++) {
      const c = this.clouds[i];
      const [x, y, r] = this.cloudScreen(c, time);
      ctx.globalAlpha = 0.55 - S.night * 0.35;
      ctx.fillStyle = S.fog;
      ctx.beginPath();
      for (let p = 0; p < c.puffs; p++) { const ox = (p - (c.puffs - 1) / 2) * r * 1.1, rr = r * (0.7 + 0.3 * Math.abs(Math.sin(c.seed + p))); ctx.moveTo(x + ox + rr, y); ctx.arc(x + ox, y, rr, 0, TAU); }
      ctx.fill();
      // lit edge faces the light: a bright sliver offset toward the sun
      const toward = Math.sign(lx - x) || 1;
      ctx.globalAlpha = (0.45 - S.night * 0.4) * K.light.strength;
      ctx.fillStyle = S.sun;
      ctx.beginPath(); ctx.ellipse(x + toward * r * 0.3, y + r * 0.45, r * c.puffs * 0.5, r * 0.2, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Birds: an occasional flock crossing the sky while there is daylight. */
  drawBirds(S, time, dt) {
    if (!this.q.birds) return;
    if (!this.birds) {
      this.nextBirds -= dt;
      if (this.nextBirds <= 0 && S.night < 0.6) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.birds = { x: dir > 0 ? -0.1 : 1.1, y: 0.12 + Math.random() * 0.25, dir, n: 5 + Math.floor(Math.random() * 3), speed: 0.045 + Math.random() * 0.02, seed: Math.random() * 10 };
      }
      return;
    }
    const b = this.birds;
    b.x += b.dir * b.speed * dt;
    if (b.x < -0.2 || b.x > 1.2) { this.birds = null; this.nextBirds = 14 + Math.random() * 16; return; }
    const { ctx } = this;
    ctx.strokeStyle = `rgba(20,24,40,${(0.7 - S.night * 0.5).toFixed(2)})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    const s = 7 * (this.w / 390);
    for (let i = 0; i < b.n; i++) {
      const k = i - (b.n - 1) / 2;
      const x = b.x * this.w - b.dir * Math.abs(k) * s * 1.6, y = b.y * this.waterY + Math.abs(k) * s * 0.9 + Math.sin(time * 2 + i) * 2;
      const flap = Math.sin(time * 9 + b.seed + i * 0.7) * s * 0.45;
      ctx.beginPath(); ctx.moveTo(x - s, y + flap); ctx.quadraticCurveTo(x, y - s * 0.2, x, y); ctx.quadraticCurveTo(x, y - s * 0.2, x + s, y + flap); ctx.stroke();
    }
  }

  /* ───────────── land ───────────── */
  mountainPath(noise, parallax, amp, base, freq) {
    const pts = [], step = 8;
    for (let px = -step; px <= this.w + step; px += step) {
      const wx = (px / this.ppm + this.camX * parallax) * freq;
      const n = noise(wx) * 0.65 + noise(wx * 2.3 + 7) * 0.25 + noise(wx * 5.1 + 19) * 0.1;
      pts.push([px, this.waterY - base - n * amp]);
    }
    return pts;
  }

  drawMountains(S, K, mirror = false) {
    const { ctx } = this;
    const [lx] = this.bodyScreen(K.light);
    const layers = [
      { noise: this.noiseFar, par: 0.08, amp: this.waterY * 0.34, base: this.waterY * 0.02, freq: 0.07, col: S.mountFar, hsl: S.mountFarHsl },
      { noise: this.noiseNear, par: 0.18, amp: this.waterY * 0.2, base: 0, freq: 0.12, col: S.mountNear, hsl: S.mountNearHsl },
    ];
    for (const L of layers) {
      const pts = this.mountainPath(L.noise, L.par, L.amp, L.base, L.freq);
      if (!mirror) {
        // warm the slopes that face the light
        const g = ctx.createLinearGradient(lx, 0, lx > this.w / 2 ? 0 : this.w, 0);
        g.addColorStop(0, hsl(L.hsl[0] - 20 * K.light.strength, L.hsl[1] + 10, L.hsl[2] + 10 * K.light.strength));
        g.addColorStop(1, L.col);
        ctx.fillStyle = g;
      } else ctx.fillStyle = L.col;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], this.waterY + 2);
      for (const [x, y] of pts) ctx.lineTo(x, mirror ? this.waterY + (this.waterY - y) * 0.55 : y);
      ctx.lineTo(pts[pts.length - 1][0], this.waterY + 2);
      ctx.closePath(); ctx.fill();
    }
    if (!mirror) {
      const pts = this.mountainPath(this.noiseTrees, 0.32, this.waterY * 0.06, 0, 0.6);
      ctx.fillStyle = S.deep; ctx.beginPath(); ctx.moveTo(pts[0][0], this.waterY + 2);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(pts[pts.length - 1][0], this.waterY + 2); ctx.closePath(); ctx.fill();
    }
  }

  /* ───────────── water ───────────── */
  drawWater(S, K, time) {
    const { ctx, w, h, waterY } = this;
    this.blit('water');
    // mirrored mountains, compressed and darkened
    ctx.save(); ctx.beginPath(); ctx.rect(0, waterY, w, h - waterY); ctx.clip();
    ctx.globalAlpha = 0.28; this.drawMountains(S, K, true);
    ctx.globalAlpha = 0.35; ctx.fillStyle = S.deep; ctx.fillRect(0, waterY, w, h - waterY);
    ctx.restore();
    // ripple lines (density scales with quality)
    const step = 5 / this.q.waterLines;
    ctx.fillStyle = '#ffffff';
    for (let y = waterY + 3; y < h; y += step + (y - waterY) * 0.06) {
      const k = (y - waterY) / (h - waterY);
      const len = w * (0.08 + 0.25 * k);
      const x0 = ((Math.sin(y * 0.31 + time * 0.7) * 0.5 + 0.5) * (w - len));
      ctx.globalAlpha = 0.08 * (1 - k) + 0.02;
      ctx.fillRect(x0, y, len, 1.2);
    }
    // light path: shimmer under the sun or moon, following it across the lake
    const [lx] = this.bodyScreen(K.light);
    const pathW = Math.min(w, h) * 0.15;
    ctx.fillStyle = S.shimmer;
    for (let y = waterY + 4; y < h; y += 7) {
      const k = (y - waterY) / (h - waterY);
      const wig = Math.sin(time * 2.1 + y * 0.21) * 0.5 + 0.5;
      const segW = pathW * (0.4 + k * 1.6) * (0.5 + 0.5 * wig);
      ctx.globalAlpha = (0.32 - k * 0.3) * (0.6 + 0.4 * wig) * K.light.strength;
      ctx.fillRect(lx - segW / 2 + Math.sin(y * 0.37 + time) * 6, y, segW, 3);
    }
    // cloud shadows drift across the water, cast from the light
    const [lxx, ly] = this.bodyScreen(K.light);
    const n = Math.min(this.clouds.length, this.q.clouds);
    for (let i = 0; i < n; i++) {
      const c = this.clouds[i];
      const [cx, cy, r] = this.cloudScreen(c, time);
      const shx = shadowX(lxx, ly, cx, cy, waterY);
      if (shx === null) continue;
      ctx.globalAlpha = 0.07 * K.light.strength * (1 - S.night * 0.5);
      ctx.fillStyle = S.deep;
      ctx.beginPath(); ctx.ellipse(shx, waterY + 14 + c.y * 40, r * c.puffs * 0.75, 5 + c.y * 6, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, waterY, w, 1.5);
  }

  /** Soft cast shadow on the water for something at screen (px, py). */
  castShadow(K, px, py, radius, alpha) {
    const [lx, ly] = this.bodyScreen(K.light);
    const shx = shadowX(lx, ly, px, py, this.waterY);
    if (shx === null) return;
    const height = (this.waterY - py) / this.waterY;              // 0 on the water, 1 at the top of the sky
    const stretch = 1 + Math.abs(shx - px) / Math.max(1, radius * 6);
    const { ctx } = this;
    ctx.globalAlpha = alpha * K.light.strength * Math.max(0.15, 1 - height * 1.4);
    ctx.fillStyle = '#0a1020';
    ctx.beginPath(); ctx.ellipse(shx, this.waterY + 3, radius * stretch, radius * 0.32, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ───────────── things on the lake ───────────── */
  drawMotes(game, time) {
    const { ctx } = this;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of game.motes) {
      if (m.taken) continue;
      const x = this.sx(m.x); if (x < -40 || x > this.w + 40) continue;
      const pulse = 0.75 + 0.25 * Math.sin(time * 3 + m.seed * 10);
      const r = 5 * pulse * (this.ppm / 40);
      ctx.fillStyle = MOTE.glow; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, this.waterY, r * 4, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = MOTE.core; ctx.beginPath(); ctx.arc(x, this.waterY - r * 0.6, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(x, this.waterY + r * 1.4, r * 1.6, r * 0.5, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawPads(game, K, time) {
    const { ctx } = this;
    for (const p of game.pads) {
      const x = this.sx(p.x); if (x < -80 || x > this.w + 80) continue;
      const rw = p.w / 2 * this.ppm, rh = rw * 0.32;
      const y = this.waterY + 2 + Math.sin(time * 1.3 + p.seed * 9) * 1.5;
      this.castShadow(K, x, this.waterY - 6, rw * 0.9, 0.25);
      ctx.fillStyle = PAD.dark; ctx.beginPath(); ctx.ellipse(x, y + 2, rw, rh, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = PAD.fill; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = PAD.dark; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rw * 0.9, y - rh * 0.5); ctx.lineTo(x + rw, y - rh * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PAD.light; ctx.beginPath(); ctx.ellipse(x - rw * 0.3, y - rh * 0.25, rw * 0.35, rh * 0.3, 0, 0, TAU); ctx.fill();
      if (p.flower) {
        ctx.fillStyle = PAD.flower;
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.ellipse(x - rw * 0.2 + Math.cos(a) * 5, y - rh * 0.9 + Math.sin(a) * 3, 4.5, 2.6, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = PAD.flowerCore; ctx.beginPath(); ctx.arc(x - rw * 0.2, y - rh * 0.9, 2.5, 0, TAU); ctx.fill();
      }
    }
  }

  drawStone(game, K, trail) {
    const { ctx } = this;
    const s = game.stone;
    const x = this.sx(s.x), y = this.sy(Math.max(0, s.y));
    const R = 7 * (this.ppm / 40);
    if (trail && trail.length > 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = `rgba(255,236,190,${(a * 0.35).toFixed(3)})`; ctx.lineWidth = R * 0.9 * a;
        ctx.beginPath(); ctx.moveTo(this.sx(trail[i - 1][0]), this.sy(trail[i - 1][1])); ctx.lineTo(this.sx(trail[i][0]), this.sy(trail[i][1])); ctx.stroke();
      }
      ctx.restore();
    }
    // cast shadow (follows the light) and mirror reflection (the timing cue)
    this.castShadow(K, x, y, R * 1.2, 0.45);
    if (s.y >= 0) {
      const ry = this.waterY + (this.waterY - y) * 0.85 + 2;
      ctx.save(); ctx.globalAlpha = 0.45; ctx.translate(x, ry); ctx.rotate(-s.spin * 0.5); ctx.scale(1, 0.6);
      ctx.fillStyle = STONE.dark; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.2, R * 0.75, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(s.spin * 0.5);
    ctx.fillStyle = STONE.dark; ctx.beginPath(); ctx.ellipse(1.5, 2, R * 1.25, R * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = STONE.mid; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.25, R * 0.8, 0, 0, TAU); ctx.fill();
    // highlight on the side that faces the light
    const [lx] = this.bodyScreen(K.light);
    const side = Math.sign(lx - x) || 1;
    ctx.fillStyle = STONE.light; ctx.beginPath(); ctx.ellipse(side * R * 0.25, -R * 0.2, R * 0.75, R * 0.4, -0.3 * side, 0, TAU); ctx.fill();
    ctx.strokeStyle = STONE.rim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.25, R * 0.8, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  }

  drawLandingHint(game) {
    if (game.phase !== 'flight') return;
    const ttc = game.timeToContact(); if (!isFinite(ttc)) return;
    const { ctx } = this;
    const lx = this.sx(game.predictedLandingX());
    ctx.globalAlpha = Math.min(1, ttc / 0.8) * 0.5;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.ellipse(lx, this.waterY, 12 * (this.ppm / 40), 4 * (this.ppm / 40), 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  drawCharge(game) {
    if (game.phase !== 'ready') return;
    const { ctx } = this;
    const x = this.sx(game.stone.x), y = this.waterY + 40, w = 120 * (this.ppm / 40), h = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(x - w / 2 - 3, y - 3, w + 6, h + 6, 8); ctx.fill();
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#9fe3ff'); g.addColorStop(1, '#ffb36b');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - w / 2, y, w * Math.max(0.02, game.charge), h, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `800 ${Math.round(12 * (this.ppm / 40))}px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(game.holding ? 'RELEASE TO THROW' : 'HOLD TO WIND UP', x, y + 16);
  }

  drawFireflies(S, time) {
    if (S.night < 0.1) return;
    const { ctx, w } = this;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.q.fireflies; i++) {
      const x = ((i * 97 + time * (8 + (i % 4) * 3) - this.camX * this.ppm * 0.3) % (w + 60) + (w + 60)) % (w + 60) - 30;
      const y = this.waterY - 20 - (i * 37 % 90) + Math.sin(time * 1.5 + i) * 8;
      const a = S.night * (0.3 + 0.7 * Math.max(0, Math.sin(time * 2.2 + i * 1.3)));
      ctx.fillStyle = `rgba(220,255,160,${(a * 0.9).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(220,255,160,${(a * 0.25).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Full frame.
   * @param {object} opts { showCharge, dt, phaseOverride } — phaseOverride lets the title drift the sun with time.
   */
  draw(game, time, fx, trail, opts = {}) {
    const phase = opts.phaseOverride ?? game.dayPhase();
    const S = scene(phase), K = sky(phase);
    this.ensureLayers(S, K, phase);
    this.blit('sky');
    this.drawStars(S, time);
    this.drawClouds(S, K, time);
    this.drawBirds(S, time, opts.dt || 0);
    this.drawMountains(S, K);
    this.drawWater(S, K, time);
    fx.drawRipples(this);
    this.drawPads(game, K, time);
    this.drawMotes(game, time);
    this.drawLandingHint(game);
    this.drawStone(game, K, trail);
    fx.drawParticles(this);
    this.drawFireflies(S, time);
    if (opts.showCharge) this.drawCharge(game);
    this.blit('vignette');
    fx.drawScreen(this);
    return S;
  }
}

export { hsl, lerp };
