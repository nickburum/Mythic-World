/**
 * Sky Temple — procedural sound effects (WebAudio, no sample files).
 * Every sound is synthesised, so the game ships with zero audio assets.
 * (Port note: in Unity/Swift swap this for short baked clips or keep it
 * procedural with AudioSource/AVAudioEngine; the "notes" table transfers as-is.)
 */

/** Major pentatonic steps for the perfect-combo melody. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];

export class Sfx {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.5;
  }

  /** Create/resume the context. Must be called from a user gesture on iOS. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  get ready() {
    return !!this.ctx && !this.muted;
  }

  /** One enveloped oscillator. */
  tone({ freq, to = freq, type = 'sine', dur = 0.2, vol = 0.4, attack = 0.005, delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst (impacts). */
  noise({ dur = 0.12, vol = 0.3, cutoff = 1200, delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  /* ───────────── game sounds ───────────── */

  /** Stone lands, slightly off. */
  place() {
    this.noise({ dur: 0.1, vol: 0.35, cutoff: 900 });
    this.tone({ freq: 160, to: 90, type: 'triangle', dur: 0.14, vol: 0.35 });
  }

  /** Perfect drop: a rising pentatonic note, higher with each combo. */
  perfect(combo) {
    const step = PENTATONIC[Math.min(combo - 1, PENTATONIC.length - 1)];
    const f = 440 * Math.pow(2, step / 12);
    this.noise({ dur: 0.05, vol: 0.15, cutoff: 3000 });
    this.tone({ freq: f, type: 'sine', dur: 0.35, vol: 0.35 });
    this.tone({ freq: f * 2, type: 'sine', dur: 0.25, vol: 0.12, delay: 0.02 });
    if (combo >= 3) this.tone({ freq: f * 1.5, type: 'triangle', dur: 0.3, vol: 0.1, delay: 0.05 });
  }

  /** Stone grew back. */
  grow() {
    this.tone({ freq: 660, to: 990, type: 'sine', dur: 0.25, vol: 0.2, delay: 0.08 });
  }

  /** Missed the tower. */
  miss() {
    this.tone({ freq: 220, to: 55, type: 'sawtooth', dur: 0.6, vol: 0.25 });
    this.noise({ dur: 0.35, vol: 0.4, cutoff: 500, delay: 0.25 });
  }

  /** Zone reached. */
  milestone() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.18, delay: i * 0.08 }));
  }

  /** UI click. */
  tap() {
    this.tone({ freq: 880, to: 660, type: 'sine', dur: 0.08, vol: 0.15 });
  }
}
