/**
 * SKIP — the lake. A side-view canvas renderer with layered parallax,
 * mirrored reflections, a shimmering sun path and a stone that casts the
 * reflection you time your taps against. Everything is procedural.
 */
import { CONFIG } from '../core/config.js';
import { scene, lerp, STONE, MOTE, PAD, hsl } from '../core/palette.js';

const TAU = Math.PI * 2;
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Smooth 1D value noise for silhouettes. */
function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const vals = Array.from({ length: 512 }, () => rnd());
  return (x) => {
    const i = Math.floor(x), f = x - i, a = vals[((i % 512) + 512) % 512], b = vals[(((i + 1) % 512) + 512) % 512];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.ppm = 40;              // px per metre (horizontal)
    this.vScale = 2.6;          // vertical exaggeration so hops read well
    this.camX = -3;             // world x at the left screen edge
    this.waterY = 0;            // screen y of the water line
    this.noiseFar = makeNoise(11); this.noiseNear = makeNoise(23); this.noiseTrees = makeNoise(37);
    this.stars = this.makeStars(); this.clouds = this.makeClouds();
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ppm = Math.max(26, Math.min(this.w / 10.5, this.h / 16));
    this.waterY = this.h * 0.58;
  }

  makeStars() { const r = mulberry32(3); return Array.from({ length: 160 }, () => ({ x: r(), y: r() * 0.9, r: 0.5 + r() * 1.3, tw: r() * TAU })); }
  makeClouds() { const r = mulberry32(9); return Array.from({ length: 6 }, (_, i) => ({ x: i / 6 + r() * 0.1, y: 0.1 + r() * 0.3, s: 0.45 + r() * 0.55, puffs: 3 + Math.floor(r() * 3), seed: r() * 100 })); }

  /* ───────────── camera ───────────── */
  /** Keep the stone around 36% of the width; ease toward it. */
  follow(stoneX, dt, snap = false) {
    const target = stoneX - (this.w * 0.36) / this.ppm;
    if (snap) { this.camX = target; return; }
    this.camX += (target - this.camX) * Math.min(1, dt * 7);
  }
  sx(x) { return (x - this.camX) * this.ppm; }
  sy(y) { return this.waterY - y * this.ppm * this.vScale; }

  /* ───────────── sky & land ───────────── */
  drawSky(S, time) {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, this.waterY);
    g.addColorStop(0, S.skyTop); g.addColorStop(0.62, S.skyMid); g.addColorStop(1, S.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, this.waterY + 1);
    // stars
    if (S.stars > 0.02) {
      for (const s of this.stars) {
        const tw = 0.6 + 0.4 * Math.sin(time * 1.7 + s.tw);
        ctx.globalAlpha = S.stars * tw * 0.9;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x * w, s.y * this.waterY * 0.9, s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  sunPos() { return [this.w * 0.68, this.waterY * 0.42]; }

  drawSun(S) {
    const { ctx } = this;
    const [x, y] = this.sunPos();
    const R = Math.min(this.w, this.h) * 0.07;
    const glow = ctx.createRadialGradient(x, y, R * 0.3, x, y, R * 5);
    glow.addColorStop(0, S.sunGlow.replace(')', ' / 0.55)').replace('hsl(', 'hsl(')); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, this.w, this.waterY);
    ctx.fillStyle = S.sun; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    if (S.night > 0.5) { // moon crater hint
      ctx.globalAlpha = (S.night - 0.5) * 0.5; ctx.fillStyle = '#c9d2e3';
      ctx.beginPath(); ctx.arc(x - R * 0.3, y - R * 0.2, R * 0.22, 0, TAU); ctx.arc(x + R * 0.3, y + R * 0.3, R * 0.15, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  drawClouds(S, time) {
    const { ctx, w } = this;
    const drift = time * 6;
    for (const c of this.clouds) {
      const x = (((c.x * w + drift * c.s - this.camX * this.ppm * 0.05) % (w * 1.3)) + w * 1.3) % (w * 1.3) - w * 0.15;
      const y = c.y * this.waterY, r = 16 * c.s * (this.w / 390);
      // lit from below at golden hour: body slightly dark, underside bright
      ctx.globalAlpha = 0.55 - S.night * 0.35;
      ctx.fillStyle = S.fog;
      ctx.beginPath();
      for (let p = 0; p < c.puffs; p++) { const ox = (p - (c.puffs - 1) / 2) * r * 1.1, rr = r * (0.7 + 0.3 * Math.abs(Math.sin(c.seed + p))); ctx.moveTo(x + ox + rr, y); ctx.arc(x + ox, y, rr, 0, TAU); }
      ctx.fill();
      ctx.globalAlpha = (0.45 - S.night * 0.4);
      ctx.fillStyle = S.sun;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.45, r * c.puffs * 0.55, r * 0.22, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** Silhouette polygon for a mountain layer; returns points so it can be mirrored. */
  mountainPath(noise, parallax, amp, base, freq) {
    const pts = [];
    const step = 8;
    for (let px = -step; px <= this.w + step; px += step) {
      const wx = (px / this.ppm + this.camX * parallax) * freq;
      const n = noise(wx) * 0.65 + noise(wx * 2.3 + 7) * 0.25 + noise(wx * 5.1 + 19) * 0.1;
      pts.push([px, this.waterY - base - n * amp]);
    }
    return pts;
  }

  drawMountains(S, mirror = false) {
    const { ctx } = this;
    const layers = [
      { noise: this.noiseFar, par: 0.08, amp: this.waterY * 0.34, base: this.waterY * 0.02, freq: 0.07, col: S.mountFar, alpha: 1 },
      { noise: this.noiseNear, par: 0.18, amp: this.waterY * 0.2, base: 0, freq: 0.12, col: S.mountNear, alpha: 1 },
    ];
    for (const L of layers) {
      const pts = this.mountainPath(L.noise, L.par, L.amp, L.base, L.freq);
      ctx.fillStyle = L.col;
      ctx.beginPath();
      if (!mirror) {
        ctx.moveTo(pts[0][0], this.waterY + 2);
        for (const [x, y] of pts) ctx.lineTo(x, y);
        ctx.lineTo(pts[pts.length - 1][0], this.waterY + 2);
      } else {
        ctx.moveTo(pts[0][0], this.waterY);
        for (const [x, y] of pts) ctx.lineTo(x, this.waterY + (this.waterY - y) * 0.9);
        ctx.lineTo(pts[pts.length - 1][0], this.waterY);
      }
      ctx.closePath(); ctx.fill();
    }
    if (!mirror) {
      // treeline: jagged dark strip just above the water
      const pts = this.mountainPath(this.noiseTrees, 0.32, this.waterY * 0.06, 0, 0.6);
      ctx.fillStyle = S.deep;
      ctx.beginPath(); ctx.moveTo(pts[0][0], this.waterY + 2);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(pts[pts.length - 1][0], this.waterY + 2); ctx.closePath(); ctx.fill();
    }
  }

  /* ───────────── water ───────────── */
  drawWater(S, time) {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, this.waterY, 0, h);
    g.addColorStop(0, S.skyBot); g.addColorStop(0.25, S.water); g.addColorStop(1, S.deep);
    ctx.fillStyle = g; ctx.fillRect(0, this.waterY, w, h - this.waterY);

    // mirrored mountains: compressed, darkened, sliced into thin wobbling strips
    ctx.save();
    ctx.beginPath(); ctx.rect(0, this.waterY, w, h - this.waterY); ctx.clip();
    ctx.globalAlpha = 0.28;
    this.drawMountains(S, true);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = S.deep;
    ctx.fillRect(0, this.waterY, w, h - this.waterY);     // darken the whole reflection
    ctx.restore();
    // gentle horizontal ripple lines, denser near the shore, fading with depth
    for (let y = this.waterY + 3; y < h; y += 5 + (y - this.waterY) * 0.06) {
      const k = (y - this.waterY) / (h - this.waterY);
      const len = w * (0.08 + 0.25 * k);
      const x0 = ((Math.sin(y * 0.31 + time * 0.7) * 0.5 + 0.5) * (w - len));
      ctx.globalAlpha = 0.08 * (1 - k) + 0.02;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0, y, len, 1.2);
    }
    ctx.globalAlpha = 1;

    // sun / moon path: shimmering segments under the sun
    const [sx] = this.sunPos();
    const pathW = Math.min(w, h) * 0.07 * 2.2;
    for (let y = this.waterY + 4; y < h; y += 7) {
      const k = (y - this.waterY) / (h - this.waterY);
      const wig = Math.sin(time * 2.1 + y * 0.21) * 0.5 + 0.5;
      const segW = pathW * (0.4 + k * 1.6) * (0.5 + 0.5 * wig);
      ctx.globalAlpha = (0.32 - k * 0.3) * (0.6 + 0.4 * wig) * (1 - S.night * 0.3);
      ctx.fillStyle = S.shimmer;
      ctx.fillRect(sx - segW / 2 + Math.sin(y * 0.37 + time) * 6, y, segW, 3);
    }
    ctx.globalAlpha = 1;

    // water line highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, this.waterY, w, 1.5);
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
      const g = ctx.createRadialGradient(x, this.waterY, 0, x, this.waterY, r * 6);
      g.addColorStop(0, MOTE.glow); g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, this.waterY, r * 6, 0, TAU); ctx.fill();
      ctx.fillStyle = MOTE.core; ctx.beginPath(); ctx.arc(x, this.waterY - r * 0.6, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(x, this.waterY + r * 1.4, r * 1.6, r * 0.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawPads(game, time) {
    const { ctx } = this;
    for (const p of game.pads) {
      const x = this.sx(p.x); if (x < -80 || x > this.w + 80) continue;
      const rw = p.w / 2 * this.ppm, rh = rw * 0.32;
      const bob = Math.sin(time * 1.3 + p.seed * 9) * 1.5;
      const y = this.waterY + 2 + bob;
      ctx.fillStyle = PAD.dark; ctx.beginPath(); ctx.ellipse(x, y + 2, rw, rh, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = PAD.fill; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, TAU); ctx.fill();
      // notch
      ctx.fillStyle = PAD.dark; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rw * 0.9, y - rh * 0.5); ctx.lineTo(x + rw, y - rh * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PAD.light; ctx.beginPath(); ctx.ellipse(x - rw * 0.3, y - rh * 0.25, rw * 0.35, rh * 0.3, 0, 0, TAU); ctx.fill();
      if (p.flower) {
        ctx.fillStyle = PAD.flower;
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.ellipse(x - rw * 0.2 + Math.cos(a) * 5, y - rh * 0.9 + Math.sin(a) * 3, 4.5, 2.6, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = PAD.flowerCore; ctx.beginPath(); ctx.arc(x - rw * 0.2, y - rh * 0.9, 2.5, 0, TAU); ctx.fill();
      }
      // reflection
      ctx.globalAlpha = 0.25; ctx.fillStyle = PAD.dark; ctx.beginPath(); ctx.ellipse(x, y + rh * 2.2, rw * 0.9, rh * 0.9, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  /* ───────────── stone ───────────── */
  drawStone(game, time, trail) {
    const { ctx } = this;
    const s = game.stone;
    const x = this.sx(s.x), y = this.sy(Math.max(0, s.y));
    const R = 7 * (this.ppm / 40);
    // trail (additive)
    if (trail && trail.length > 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = `rgba(255,236,190,${(a * 0.35).toFixed(3)})`; ctx.lineWidth = R * 0.9 * a;
        ctx.beginPath(); ctx.moveTo(this.sx(trail[i - 1][0]), this.sy(trail[i - 1][1])); ctx.lineTo(this.sx(trail[i][0]), this.sy(trail[i][1])); ctx.stroke();
      }
      ctx.restore();
    }
    // reflection: the timing cue
    if (s.y >= 0) {
      const ry = this.waterY + (this.waterY - y) * 0.85 + 2;
      ctx.save(); ctx.globalAlpha = 0.45; ctx.translate(x, ry); ctx.rotate(-s.spin * 0.5); ctx.scale(1, 0.6);
      ctx.fillStyle = STONE.dark; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.2, R * 0.75, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // stone
    ctx.save(); ctx.translate(x, y); ctx.rotate(s.spin * 0.5);
    ctx.fillStyle = STONE.dark; ctx.beginPath(); ctx.ellipse(1.5, 2, R * 1.25, R * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = STONE.mid; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.25, R * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = STONE.light; ctx.beginPath(); ctx.ellipse(-R * 0.25, -R * 0.2, R * 0.75, R * 0.4, -0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = STONE.rim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.25, R * 0.8, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  }

  /** Landing marker + flight guide while airborne (fades as the stone nears the water). */
  drawLandingHint(game) {
    if (game.phase !== 'flight') return;
    const { ctx } = this;
    const ttc = game.timeToContact();
    if (!isFinite(ttc)) return;
    const lx = this.sx(game.predictedLandingX());
    const a = Math.min(1, ttc / 0.8) * 0.5;
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.ellipse(lx, this.waterY, 12 * (this.ppm / 40), 4 * (this.ppm / 40), 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  /** Wind-up meter under the stone while ready. */
  drawCharge(game) {
    if (game.phase !== 'ready') return;
    const { ctx } = this;
    const x = this.sx(game.stone.x), y = this.waterY + 40;
    const w = 120 * (this.ppm / 40), h = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(x - w / 2 - 3, y - 3, w + 6, h + 6, 8); ctx.fill();
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#9fe3ff'); g.addColorStop(1, '#ffb36b');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - w / 2, y, w * Math.max(0.02, game.charge), h, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `800 ${Math.round(12 * (this.ppm / 40))}px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(game.holding ? 'RELEASE TO THROW' : 'HOLD TO WIND UP', x, y + 16);
  }

  /** Fireflies drifting over the water at night. */
  drawFireflies(S, time) {
    if (S.night < 0.1) return;
    const { ctx, w } = this;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97 + time * (8 + (i % 4) * 3) - this.camX * this.ppm * 0.3) % (w + 60) + (w + 60)) % (w + 60) - 30;
      const y = this.waterY - 20 - (i * 37 % 90) + Math.sin(time * 1.5 + i) * 8;
      const a = S.night * (0.3 + 0.7 * Math.max(0, Math.sin(time * 2.2 + i * 1.3)));
      ctx.fillStyle = `rgba(220,255,160,${(a * 0.9).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(220,255,160,${(a * 0.25).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawVignette() {
    const { ctx, w, h } = this;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.5, w / 2, h / 2, Math.max(w, h) * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  /** Full frame. `fx` draws its own layers at the right depths. */
  draw(game, time, fx, trail, showCharge = true) {
    const S = scene(game.dayPhase());
    this.drawSky(S, time);
    this.drawSun(S);
    this.drawClouds(S, time);
    this.drawMountains(S);
    this.drawWater(S, time);
    fx.drawRipples(this);
    this.drawPads(game, time);
    this.drawMotes(game, time);
    this.drawLandingHint(game);
    this.drawStone(game, time, trail);
    fx.drawParticles(this);
    this.drawFireflies(S, time);
    if (showCharge) this.drawCharge(game);
    this.drawVignette();
    fx.drawScreen(this);
    return S;
  }
}

export { hsl, lerp };
