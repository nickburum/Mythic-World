/**
 * Game Box — generative music. No audio files: each game ships a small
 * "song" description (key, scale, tempo, chord progression, instrument
 * voices) and this engine performs it live on WebAudio, forever, without
 * repeating exactly. Modes thin or fill the arrangement: 'title' (pad +
 * sparse bass), 'play' (everything), 'over' (pad only).
 *
 * Usage: const m = new Music(song); m.attach(audioContext); m.start(); m.setMode('play');
 */
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  pentMajor: [0, 2, 4, 7, 9], pentMinor: [0, 3, 5, 7, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
};
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** Deterministic hash → 0..1 so the "improvisation" is the same every run of a song. */
const h01 = (seed, n) => { let x = (seed * 374761393 + n * 668265263) | 0; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

export class Music {
  constructor(song) {
    this.song = { bpm: 110, root: 57, scale: 'minor', progression: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], seed: 1, swing: 0,
      bass: { type: 'triangle', vol: 0.18, pattern: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1] },
      pad: { type: 'sine', vol: 0.06, detune: 6 },
      lead: { type: 'triangle', vol: 0.09, density: 0.55, octave: 2, decay: 0.35 },
      drums: { kick: true, hat: true, vol: 0.5 },
      space: 0.35, ...song };
    this.ctx = null; this.playing = false; this.muted = false; this.mode = 'title'; this.volume = 0.55;
  }
  attach(ctx) {
    if (this.ctx || !ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volume;
    // a short feedback delay stands in for a room
    this.delay = ctx.createDelay(1.0); this.delay.delayTime.value = 60 / this.song.bpm * 0.75;
    this.fb = ctx.createGain(); this.fb.gain.value = this.song.space; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.delay.connect(lp).connect(this.fb).connect(this.delay);
    this.wet = ctx.createGain(); this.wet.gain.value = 0.35;
    this.out.connect(this.master); this.out.connect(this.delay); this.delay.connect(this.wet).connect(this.master);
    this.master.connect(ctx.destination);
    this.busses = {};
    for (const k of ['bass', 'pad', 'lead', 'drums']) { const g = ctx.createGain(); g.gain.value = 1; g.connect(this.out); this.busses[k] = g; }
    this.setMode(this.mode, true);
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05); }
  /** Arrangement by mode; levels crossfade. */
  setMode(mode, now = false) {
    this.mode = mode;
    if (!this.ctx) return;
    const L = { title: { bass: 0.6, pad: 1, lead: 0.35, drums: 0 }, play: { bass: 1, pad: 0.9, lead: 1, drums: 1 }, over: { bass: 0, pad: 1, lead: 0, drums: 0 } }[mode] || { bass: 1, pad: 1, lead: 1, drums: 1 };
    for (const k in L) this.busses[k].gain.setTargetAtTime(L[k], this.ctx.currentTime, now ? 0.001 : 0.6);
  }
  start() {
    if (!this.ctx || this.playing) return;
    this.playing = true; this.step = 0; this.nextTime = this.ctx.currentTime + 0.05;
    this.out.gain.setTargetAtTime(1, this.ctx.currentTime, 0.8);
    this.timer = setInterval(() => this.schedule(), 25);
    document.addEventListener('visibilitychange', this.onVis = () => { if (!this.ctx) return; this.out.gain.setTargetAtTime(document.hidden ? 0 : 1, this.ctx.currentTime, 0.1); });
  }
  stop() { if (!this.playing) return; this.playing = false; clearInterval(this.timer); this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5); document.removeEventListener('visibilitychange', this.onVis); }

  schedule() {
    const stepLen = 60 / this.song.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const swing = (this.step % 2 === 1) ? stepLen * this.song.swing : 0;
      this.playStep(this.step, this.nextTime + swing, stepLen);
      this.step++; this.nextTime += stepLen;
    }
  }

  /** Pure: which notes sound on a step. Exposed for tests. */
  notesFor(step) {
    const s = this.song, scale = SCALES[s.scale] || SCALES.minor;
    const bar = Math.floor(step / 16), pos = step % 16, chord = s.progression[bar % s.progression.length];
    const deg = (d, oct = 0) => s.root + 12 * (oct + Math.floor(d / scale.length)) + scale[((d % scale.length) + scale.length) % scale.length];
    const out = { bass: null, pad: null, lead: null, kick: false, hat: false };
    if (s.bass.pattern[pos]) out.bass = deg(chord[0], -1);
    if (pos === 0) out.pad = chord.map(d => deg(d, 0));
    const r = h01(s.seed, step);
    if (r < s.lead.density && (pos % 2 === 0 || r < s.lead.density * 0.4)) {
      const pick = h01(s.seed + 7, step);
      const tone = pick < 0.65 ? chord[Math.floor(h01(s.seed + 3, step) * chord.length)] : chord[0] + Math.floor(h01(s.seed + 5, step) * 5) - 2;
      out.lead = deg(tone, s.lead.octave - 1);
    }
    if (s.drums.kick && (pos === 0 || pos === 8 || (pos === 10 && h01(s.seed + 9, bar) < 0.4))) out.kick = true;
    if (s.drums.hat && pos % 2 === 0) out.hat = true;
    return out;
  }

  playStep(step, t, stepLen) {
    const n = this.notesFor(step), s = this.song;
    if (n.bass !== null) this.voice(midiHz(n.bass), t, stepLen * 1.8, s.bass.type, s.bass.vol, 'bass', 0.004, 900);
    if (n.pad) { const dur = stepLen * 16; for (const m of n.pad) { this.voice(midiHz(m), t, dur, s.pad.type, s.pad.vol, 'pad', 0.6, 1800, s.pad.detune); this.voice(midiHz(m), t, dur, s.pad.type, s.pad.vol * 0.8, 'pad', 0.9, 1800, -s.pad.detune); } }
    if (n.lead !== null) this.voice(midiHz(n.lead), t, s.lead.decay, s.lead.type, s.lead.vol, 'lead', 0.003, 5000);
    if (n.kick) this.kick(t); if (n.hat) this.hat(t, step % 4 === 2 ? 0.5 : 0.3);
  }

  voice(freq, t, dur, type, vol, bus, attack, cutoff, detune = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = type; o.frequency.value = freq; o.detune.value = detune; f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(f).connect(g).connect(this.busses[bus]); o.start(t); o.stop(t + dur + 0.05);
  }
  kick(t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(this.song.drums.vol * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g).connect(this.busses.drums); o.start(t); o.stop(t + 0.3); }
  hat(t, vol) { const c = this.ctx, len = Math.floor(c.sampleRate * 0.04), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = c.createGain(); g.gain.value = this.song.drums.vol * vol * 0.25; src.connect(f).connect(g).connect(this.busses.drums); src.start(t); }
}
