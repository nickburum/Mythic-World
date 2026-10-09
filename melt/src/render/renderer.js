/**
 * MELT — canvas renderer. Side view on a fixed 390 × 700 world, scaled to
 * fit the screen; the backdrop and rock strips extend to the screen edges.
 * All art is procedural shapes. No game rules live here.
 */
import { CONFIG } from '../core/config.js';
import { OBSTACLES, PHASE } from '../core/melt.js';
import { PHASE_COLORS, OBSTACLE_COLORS, ROCK, skyForTemp, lerp } from '../core/palette.js';

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.scale = 1; this.ox = 0; this.oy = 0;
    this.motes = this.makeMotes();
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.scale = Math.min(this.w / CONFIG.WORLD_W, this.h / CONFIG.WORLD_H);
    this.ox = 0;                                            // world x = 0 at the left screen edge
    this.oy = (this.h - CONFIG.WORLD_H * this.scale) / 2;   // vertically centred
  }

  /** Visible world width (world px). */
  viewWorldW() { return this.w / this.scale; }
  /** World y of the top / bottom screen edges. */
  worldTop() { return -this.oy / this.scale; }
  worldBottom() { return (this.h - this.oy) / this.scale; }

  /** Screen position of a world point (for HUD-space effects). */
  toScreen(x, y) { return [this.ox + x * this.scale, this.oy + y * this.scale]; }

  /** Enter world space (call once per frame around world drawing). */
  begin(shakeX = 0, shakeY = 0) {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.translate(this.ox + shakeX, this.oy + shakeY);
    ctx.scale(this.scale, this.scale);
  }
  end() { this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); }

  /* ───────────── backdrop ───────────── */

  makeMotes() {
    const rnd = mulberry32(5);
    const m = [];
    for (let i = 0; i < 60; i++) m.push({ x: rnd(), y: rnd(), r: 1 + rnd() * 3, depth: 0.15 + rnd() * 0.6, ph: rnd() * TAU });
    return m;
  }

  drawSky(temp) {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sky = skyForTemp(temp);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // soft glow behind the play lane
    const rg = ctx.createRadialGradient(w * 0.35, h * 0.5, 10, w * 0.35, h * 0.5, Math.max(w, h) * 0.6);
    rg.addColorStop(0, sky.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  }

  drawMotes(distance, time, temp) {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const hot = temp / 100;
    for (const m of this.motes) {
      const x = ((m.x * w - distance * m.depth * this.scale) % w + w) % w;
      // motes rise when hot, sink when cold
      const y = (((m.y * h + Math.sin(time * 0.8 + m.ph) * 6 + (0.5 - hot) * time * 18 * m.depth) % h) + h) % h;
      ctx.globalAlpha = 0.08 + m.depth * 0.18;
      ctx.fillStyle = hot > 0.6 ? '#ffd9a0' : '#cfefff';
      ctx.beginPath(); ctx.arc(x, y, m.r * (0.6 + m.depth), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Rock strips (ceiling + floor) with scrolling seams. Call inside begin(). */
  drawRock(distance) {
    const { ctx } = this;
    const left = -20, right = this.viewWorldW() + 20;
    const top = this.worldTop() - 20, bottom = this.worldBottom() + 20;
    ctx.fillStyle = ROCK.fill;
    ctx.fillRect(left, top, right - left, CONFIG.CEILING_Y - top);
    ctx.fillRect(left, CONFIG.FLOOR_Y, right - left, bottom - CONFIG.FLOOR_Y);
    // edge highlights
    ctx.fillStyle = ROCK.edge;
    ctx.fillRect(left, CONFIG.CEILING_Y - 6, right - left, 6);
    ctx.fillRect(left, CONFIG.FLOOR_Y, right - left, 6);
    // scrolling tile seams
    const tile = 64;
    const off = -(distance % tile);
    ctx.strokeStyle = ROCK.seam; ctx.lineWidth = 2;
    for (let x = left + off; x < right; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, CONFIG.FLOOR_Y + 6); ctx.lineTo(x, CONFIG.FLOOR_Y + 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + tile / 2, CONFIG.CEILING_Y - 6); ctx.lineTo(x + tile / 2, CONFIG.CEILING_Y - 36); ctx.stroke();
    }
    // stalactite bumps
    ctx.fillStyle = ROCK.fill;
    for (let x = left + off; x < right; x += tile) {
      ctx.beginPath(); ctx.moveTo(x + 10, CONFIG.CEILING_Y); ctx.lineTo(x + 22, CONFIG.CEILING_Y + 14); ctx.lineTo(x + 34, CONFIG.CEILING_Y); ctx.closePath(); ctx.fill();
    }
  }

  /* ───────────── obstacles ───────────── */

  drawObstacle(o, time) {
    const { ctx } = this;
    const c = OBSTACLE_COLORS[o.type];
    const top = CONFIG.CEILING_Y, floor = CONFIG.FLOOR_Y;
    switch (o.type) {
      case 'spikes': {
        const n = 3, bw = o.w / n, hgt = 64;
        for (let i = 0; i < n; i++) {
          const x0 = o.x + i * bw;
          ctx.fillStyle = c.dark;
          ctx.beginPath(); ctx.moveTo(x0, floor); ctx.lineTo(x0 + bw / 2, floor - hgt); ctx.lineTo(x0 + bw, floor); ctx.closePath(); ctx.fill();
          ctx.fillStyle = c.fill;
          ctx.beginPath(); ctx.moveTo(x0 + 3, floor); ctx.lineTo(x0 + bw / 2, floor - hgt + 6); ctx.lineTo(x0 + bw / 2 + 2, floor); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'beam': {
        const hgt = 150;
        ctx.fillStyle = c.dark; ctx.fillRect(o.x, top - 2, o.w, hgt + 2);
        ctx.fillStyle = c.fill; ctx.fillRect(o.x + 4, top - 2, o.w - 12, hgt - 6);
        ctx.fillStyle = c.dark;
        for (let y = top + 18; y < top + hgt - 10; y += 30) { ctx.beginPath(); ctx.arc(o.x + o.w / 2, y, 3.5, 0, TAU); ctx.fill(); }
        // warning stripe at the bottom
        ctx.fillStyle = '#ffd36b'; ctx.fillRect(o.x, top + hgt - 8, o.w, 8);
        ctx.fillStyle = '#222';
        for (let x = o.x; x < o.x + o.w; x += 12) ctx.fillRect(x, top + hgt - 8, 6, 8);
        break;
      }
      case 'glass': {
        ctx.fillStyle = c.frame; ctx.fillRect(o.x, top, o.w, 10); ctx.fillRect(o.x, floor - 10, o.w, 10);
        ctx.fillStyle = c.fill; ctx.fillRect(o.x + 6, top + 10, o.w - 12, floor - top - 20);
        ctx.strokeStyle = c.edge; ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 6, top + 10, o.w - 12, floor - top - 20);
        // glints
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(o.x + 12, top + 40); ctx.lineTo(o.x + 12, top + 120); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(o.x + 18, top + 140); ctx.lineTo(o.x + 18, top + 170); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'pipe': {
        ctx.fillStyle = c.fill; ctx.fillRect(o.x, top, o.w, floor - top);
        ctx.fillStyle = c.dark; ctx.fillRect(o.x + 6, top + 8, o.w - 12, floor - top - 70);
        // round opening at floor level
        const cx = o.x + o.w / 2, cy = floor - 30, r = 28;
        ctx.fillStyle = c.ring; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0d1424'; ctx.beginPath(); ctx.arc(cx, cy, r - 7, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(58,167,255,0.35)'; ctx.beginPath(); ctx.arc(cx, cy + 6, r - 12, 0, Math.PI); ctx.fill();
        break;
      }
      case 'geyser': {
        ctx.fillStyle = '#222b44'; ctx.fillRect(o.x, floor - 6, o.w, 10);
        ctx.fillStyle = '#0d1424';
        for (let x = o.x + 6; x < o.x + o.w - 6; x += 10) ctx.fillRect(x, floor - 4, 5, 6);
        // flames
        for (let i = 0; i < 5; i++) {
          const fx = o.x + 8 + i * (o.w - 16) / 4;
          const fh = 50 + Math.sin(time * 14 + i * 1.7) * 14;
          ctx.fillStyle = c.fill; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.moveTo(fx - 7, floor - 4); ctx.quadraticCurveTo(fx, floor - fh * 0.6, fx, floor - fh); ctx.quadraticCurveTo(fx, floor - fh * 0.6, fx + 7, floor - 4); ctx.closePath(); ctx.fill();
          ctx.fillStyle = c.dark; ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.moveTo(fx - 3, floor - 4); ctx.quadraticCurveTo(fx, floor - fh * 0.4, fx, floor - fh * 0.55); ctx.quadraticCurveTo(fx, floor - fh * 0.4, fx + 3, floor - 4); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'vent': {
        // icicles
        for (let i = 0; i < 5; i++) {
          const ix = o.x + 6 + i * (o.w - 12) / 4;
          const ih = 26 + (i % 2) * 16;
          ctx.fillStyle = c.dark;
          ctx.beginPath(); ctx.moveTo(ix - 6, top); ctx.lineTo(ix, top + ih); ctx.lineTo(ix + 6, top); ctx.closePath(); ctx.fill();
        }
        // falling flakes
        ctx.fillStyle = c.fill;
        for (let i = 0; i < 7; i++) {
          const fy = top + 20 + ((time * 90 + i * 61) % (CONFIG.FLOOR_Y - top - 30));
          const fx = o.x + 6 + ((i * 37) % (o.w - 12)) + Math.sin(time * 3 + i) * 4;
          ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
    }
    if (o.hint && !o.passed) this.drawHint(o);
  }

  /** Teaching label above a new obstacle type. */
  drawHint(o) {
    const { ctx } = this;
    const def = OBSTACLES[o.type];
    const col = OBSTACLE_COLORS[o.type].hint;
    const cx = o.x + o.w / 2;
    const y = o.type === 'beam' ? CONFIG.CEILING_Y + 190 : o.type === 'spikes' || o.type === 'geyser' ? CONFIG.FLOOR_Y - 100 : CONFIG.CEILING_Y + 60;
    ctx.save();
    ctx.font = '900 13px ui-rounded, -apple-system, "SF Pro Rounded", "Segoe UI", Roboto, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(def.label).width + 18;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.roundRect(cx - tw / 2, y - 12, tw, 24, 12); ctx.fill();
    ctx.fillStyle = col; ctx.fillText(def.label, cx, y + 0.5);
    // phase icon under the label (which state gets through)
    if (def.needs.length === 1) this.drawPhaseIcon(def.needs[0], cx, y + 24, 7);
    else if (def.needs.length === 2) { this.drawPhaseIcon(def.needs[0], cx - 10, y + 24, 6); this.drawPhaseIcon(def.needs[1], cx + 10, y + 24, 6); }
    ctx.restore();
  }

  drawPhaseIcon(phase, x, y, r) {
    const { ctx } = this;
    const c = PHASE_COLORS[phase];
    ctx.fillStyle = c.fill;
    if (phase === PHASE.ICE) { this.roundRect(x - r, y - r, r * 2, r * 2, r * 0.3); ctx.fill(); }
    else if (phase === PHASE.WATER) { this.dropPath(x, y, r); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(x - r * 0.5, y + r * 0.1, r * 0.7, 0, TAU); ctx.arc(x + r * 0.5, y + r * 0.1, r * 0.7, 0, TAU); ctx.arc(x, y - r * 0.3, r * 0.8, 0, TAU); ctx.fill(); }
  }

  roundRect(x, y, w, h, r) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  dropPath(x, y, r) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.45);
    ctx.bezierCurveTo(x + r * 0.2, y - r * 0.9, x + r, y - r * 0.5, x + r, y + r * 0.15);
    ctx.arc(x, y + r * 0.15, r, 0, Math.PI, false);
    ctx.bezierCurveTo(x - r, y - r * 0.5, x - r * 0.2, y - r * 0.9, x, y - r * 1.45);
    ctx.closePath();
  }

  /* ───────────── droplet ───────────── */

  /** World y of the droplet centre for an altitude 0..1. */
  playerY(altitude) {
    return lerp(CONFIG.FLOOR_Y - CONFIG.PLAYER_R, CONFIG.CEILING_Y + CONFIG.PLAYER_R + 10, altitude);
  }

  /**
   * @param {object} p { phase, altitude, time, morph (0..1 since last change) }
   */
  drawPlayer(p) {
    const { ctx } = this;
    const R = CONFIG.PLAYER_R;
    const x = CONFIG.PLAYER_X, y = this.playerY(p.altitude);
    const punch = p.morph < 1 ? 1 + Math.sin(p.morph * Math.PI) * 0.22 : 1;
    ctx.save();
    ctx.translate(x, y);
    const c = PHASE_COLORS[p.phase];

    if (p.phase === PHASE.ICE) {
      const jit = (Math.random() - 0.5) * 1.2;
      ctx.translate(jit, 0);
      ctx.scale(punch, punch);
      ctx.fillStyle = c.edge; this.roundRect(-R, -R, R * 2, R * 2, 6); ctx.fill();
      ctx.fillStyle = c.fill; this.roundRect(-R + 3, -R + 3, R * 2 - 6, R * 2 - 6, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; this.roundRect(-R + 6, -R + 6, 9, 9, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(80,150,190,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(R - 6, -R + 8); ctx.lineTo(R - 12, 2); ctx.lineTo(R - 6, 10); ctx.stroke();
      this.drawFace(0, 0, R, 'ice', p.time);
    } else if (p.phase === PHASE.WATER) {
      const wob = 1 + Math.sin(p.time * 9) * 0.05;
      ctx.scale(punch * wob, punch / wob);
      ctx.fillStyle = c.edge; this.dropPath(0, 0, R); ctx.fill();
      ctx.fillStyle = c.fill; this.dropPath(0, 0, R - 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-R * 0.4, -R * 0.1, 4, 7, -0.4, 0, TAU); ctx.fill();
      this.drawFace(0, 3, R, 'water', p.time);
    } else {
      const bob = Math.sin(p.time * 3) * 2;
      ctx.translate(0, bob);
      ctx.scale(punch, punch);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = c.edge;
      ctx.beginPath(); ctx.arc(-R * 0.55, R * 0.15, R * 0.75, 0, TAU); ctx.arc(R * 0.55, R * 0.15, R * 0.75, 0, TAU); ctx.arc(0, -R * 0.25, R * 0.85, 0, TAU); ctx.fill();
      ctx.fillStyle = c.fill;
      ctx.beginPath(); ctx.arc(-R * 0.55, R * 0.1, R * 0.65, 0, TAU); ctx.arc(R * 0.55, R * 0.1, R * 0.65, 0, TAU); ctx.arc(0, -R * 0.3, R * 0.75, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      this.drawFace(0, 0, R, 'steam', p.time);
    }
    ctx.restore();
  }

  drawFace(x, y, R, phase, time) {
    const { ctx } = this;
    const blink = (Math.sin(time * 1.3) > 0.985);
    ctx.fillStyle = '#fff';
    const ex = x + R * 0.28, ey = y - R * 0.15, er = R * 0.22;
    if (phase === 'steam') {
      // sleepy half-closed eyes
      ctx.strokeStyle = '#3b4663'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex - R * 0.45, ey, er, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex + R * 0.35, ey, er, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ctx.fillStyle = '#3b4663'; ctx.beginPath(); ctx.arc(x + R * 0.25, y + R * 0.35, 3, 0, TAU); ctx.fill();
      return;
    }
    for (const dx of [-R * 0.45, R * 0.35]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex + dx, ey, er, blink ? er * 0.15 : er, 0, 0, TAU); ctx.fill();
      if (!blink) { ctx.fillStyle = '#1b2a44'; ctx.beginPath(); ctx.arc(ex + dx + er * 0.35, ey, er * 0.5, 0, TAU); ctx.fill(); }
    }
    ctx.strokeStyle = '#1b2a44'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    if (phase === 'ice') ctx.arc(x + R * 0.25, y + R * 0.45, R * 0.18, Math.PI * 1.15, Math.PI * 1.85); // worried
    else ctx.arc(x + R * 0.25, y + R * 0.3, R * 0.22, Math.PI * 0.1, Math.PI * 0.9);                   // smile
    ctx.stroke();
  }

  /* ───────────── gauge ───────────── */

  /** Horizontal thermometer in the floor strip, out of the obstacle lane. */
  /** Three centred state marks in the floor strip: the active one is filled. */
  drawGauge(phase, time) {
    const { ctx } = this;
    const cx = Math.min(this.viewWorldW(), CONFIG.WORLD_W) / 2, y = CONFIG.FLOOR_Y + 56, gap = 64;
    const phases = ['ice', 'water', 'steam'];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - gap, y); ctx.lineTo(cx + gap, y); ctx.stroke();
    phases.forEach((p, i) => {
      const x = cx + (i - 1) * gap, active = p === phase;
      const r = active ? 11 + Math.sin(time * 6) * 0.8 : 7;
      ctx.fillStyle = active ? PHASE_COLORS[p].fill : '#0f172a';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = active ? PHASE_COLORS[p].fill : 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      this.drawPhaseIcon(p, x, y + 26, 6);
    });
    ctx.restore();
  }

  drawVignette() {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
}
