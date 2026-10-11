/**
 * MELT — procedural sound (WebAudio, no sample files).
 * A continuous "heat" bed hisses while the finger is down, and each phase
 * change has its own signature: ice cracks, water bloops, steam whooshes.
 */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.7;
    this.onSound = null;      // the box hooks this to duck the music under a cue
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.03); }
  get ready() { return !!this.ctx && !this.muted; }

  tone({ freq, to = freq, type = 'sine', dur = 0.2, vol = 0.4, attack = 0.005, delay = 0 }) {
    if (!this.ready) return;
    if (this.onSound && vol >= 0.1) this.onSound();
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.12, vol = 0.3, cutoff = 1200, type = 'lowpass', delay = 0 }) {
    if (!this.ready) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  /* ───────────── game sounds ───────────── */

  /** Phase change signatures. */
  phase(to, from) {
    if (to === 'ice') { this.noise({ dur: 0.08, vol: 0.35, cutoff: 4000, type: 'highpass' }); this.tone({ freq: 1200, to: 1800, type: 'square', dur: 0.06, vol: 0.08 }); }
    else if (to === 'steam') { this.noise({ dur: 0.35, vol: 0.3, cutoff: 1800, type: 'bandpass' }); this.tone({ freq: 300, to: 900, type: 'sine', dur: 0.3, vol: 0.12 }); }
    else if (from === 'ice') { this.tone({ freq: 220, to: 440, type: 'sine', dur: 0.18, vol: 0.25 }); }        // melt
    else { this.tone({ freq: 600, to: 330, type: 'sine', dur: 0.2, vol: 0.22 }); }                            // condense
  }

  pass() { this.tone({ freq: 880, to: 1100, type: 'sine', dur: 0.07, vol: 0.12 }); }
  closeCall() { this.tone({ freq: 1200, to: 1900, type: 'triangle', dur: 0.14, vol: 0.2 }); this.tone({ freq: 1800, type: 'sine', dur: 0.2, vol: 0.1, delay: 0.06 }); }
  hazard(kind) {
    if (kind === 'geyser') this.noise({ dur: 0.3, vol: 0.35, cutoff: 900 });
    else this.noise({ dur: 0.3, vol: 0.25, cutoff: 5000, type: 'highpass' });
  }
  die(phase) {
    if (phase === 'ice') { this.noise({ dur: 0.3, vol: 0.5, cutoff: 6000, type: 'highpass' }); this.tone({ freq: 800, to: 200, type: 'square', dur: 0.25, vol: 0.12 }); }
    else if (phase === 'water') { this.noise({ dur: 0.25, vol: 0.45, cutoff: 700 }); this.tone({ freq: 400, to: 90, type: 'sine', dur: 0.35, vol: 0.3 }); }
    else { this.noise({ dur: 0.6, vol: 0.4, cutoff: 1500, type: 'bandpass' }); this.tone({ freq: 500, to: 120, type: 'sine', dur: 0.5, vol: 0.2 }); }
  }
  newBest() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.16, delay: i * 0.09 })); }
  milestone() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.45, vol: 0.16, delay: i * 0.08 })); }
  tap() { this.tone({ freq: 880, to: 660, type: 'sine', dur: 0.08, vol: 0.15 }); }
}
