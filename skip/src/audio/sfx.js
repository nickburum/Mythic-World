/**
 * SKIP — procedural sound. Water lapping bed, splash per skip (pitched by
 * quality), pentatonic chime for motes, a soft plop for sinking, evening
 * crickets as night falls. No audio files anywhere.
 */
const PENT = [0, 2, 4, 7, 9, 12, 14, 16, 19];
export class Sfx {
  constructor() { this.ctx = null; this.master = null; this.muted = false; this.volume = 0.55; this.bed = null; this.crickets = null; }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volume; this.master.connect(this.ctx.destination);
      this.startBeds();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.volume; }
  get ready() { return !!this.ctx && !this.muted; }

  noiseBuffer(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  startBeds() {
    const c = this.ctx;
    // lapping water: slow-LFO'd low-pass noise
    const src = c.createBufferSource(); src.buffer = this.noiseBuffer(3); src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.4;
    const g = c.createGain(); g.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.18; const lg = c.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg).connect(g.gain); lfo.start();
    src.connect(f).connect(g).connect(this.master); src.start();
    this.bed = g;
    // crickets: faint high chirps, volume set by night level
    const cs = c.createBufferSource(); cs.buffer = this.noiseBuffer(2); cs.loop = true;
    const cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 4200; cf.Q.value = 14;
    const cg = c.createGain(); cg.gain.value = 0;
    const clfo = c.createOscillator(); clfo.type = 'square'; clfo.frequency.value = 9; const clg = c.createGain(); clg.gain.value = 0.012;
    clfo.connect(clg).connect(cg.gain); clfo.start();
    cs.connect(cf).connect(cg).connect(this.master); cs.start();
    this.crickets = cg;
  }
  /** 0..1 how dark it is. */
  setNight(n) { if (this.crickets) this.crickets.gain.setTargetAtTime(n * 0.014, this.ctx.currentTime, 0.5); }

  tone({ freq, to = freq, type = 'sine', dur = 0.2, vol = 0.4, attack = 0.005, delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  noise({ dur = 0.12, vol = 0.3, cutoff = 1200, type = 'lowpass', delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay, src = c.createBufferSource(); src.buffer = this.noiseBuffer(dur);
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = cutoff;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master); src.start(t0);
  }

  /* ───────────── game ───────────── */
  charge(level) { if (!this.ready) return; this.tone({ freq: 180 + level * 220, type: 'sine', dur: 0.06, vol: 0.05 }); }
  throw_() { this.noise({ dur: 0.25, vol: 0.25, cutoff: 2500, type: 'bandpass' }); this.tone({ freq: 300, to: 900, type: 'sine', dur: 0.18, vol: 0.12 }); }
  skip(kind, streak = 0) {
    this.noise({ dur: 0.14, vol: 0.32, cutoff: kind === 'perfect' ? 2200 : 1200 });
    this.tone({ freq: kind === 'perfect' ? 520 : 380, to: kind === 'perfect' ? 780 : 300, type: 'sine', dur: 0.12, vol: 0.18 });
    if (kind === 'perfect') { const f = 660 * Math.pow(2, PENT[Math.min(streak, PENT.length - 1)] / 12); this.tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.14, delay: 0.03 }); }
  }
  mote() { [0, 4, 7].forEach((s, i) => this.tone({ freq: 880 * Math.pow(2, s / 12), type: 'sine', dur: 0.35, vol: 0.12, delay: i * 0.05 })); }
  sink() { this.tone({ freq: 320, to: 110, type: 'sine', dur: 0.4, vol: 0.3 }); this.noise({ dur: 0.3, vol: 0.25, cutoff: 600, delay: 0.05 }); }
  pad() { this.noise({ dur: 0.12, vol: 0.2, cutoff: 900 }); this.tone({ freq: 200, to: 150, type: 'triangle', dur: 0.2, vol: 0.15 }); }
  milestone() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.45, vol: 0.14, delay: i * 0.08 })); }
  tap() { this.tone({ freq: 880, to: 660, type: 'sine', dur: 0.08, vol: 0.12 }); }
}
