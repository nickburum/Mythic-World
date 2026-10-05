/** SKIP — its song and first-play tutorial. */
export const song = {
  bpm: 72, root: 62, scale: 'major', seed: 3, swing: 0,
  progression: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]],
  bass: { type: 'sine', vol: 0.14, pattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
  pad: { type: 'sine', vol: 0.07, detune: 7 },
  lead: { type: 'sine', vol: 0.08, density: 0.3, octave: 2, decay: 0.9 },
  drums: { kick: false, hat: false, vol: 0 }, space: 0.5,
};
export const steps = [
  { title: 'Hold to wind up', text: 'Release to throw. A longer hold throws harder.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M30 80c20-30 60-50 100-40" stroke-dasharray="3 6"/><ellipse cx="34" cy="80" rx="9" ry="6"/><path d="M110 92h30" stroke-opacity=".5"/></svg>` },
  { title: 'Tap when it kisses the water', text: 'The stone\'s reflection rises to meet it. Tap at the touch for a perfect skip that keeps your speed.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 70h140" stroke-opacity=".5"/><ellipse cx="80" cy="60" rx="10" ry="6"/><ellipse cx="80" cy="80" rx="10" ry="6" stroke-opacity=".4"/><path d="M30 56c15-24 35-30 50-4M80 52c15-20 30-24 44-2" stroke-dasharray="3 5"/></svg>` },
  { title: 'Motes and lily pads', text: 'Land near glowing motes for speed. Tap early to dip the stone short of a lily pad.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 70h140" stroke-opacity=".5"/><circle cx="50" cy="66" r="5"/><ellipse cx="118" cy="70" rx="18" ry="6"/><path d="M118 70l14-5" /><path d="M70 40c10-16 22-16 30-2" stroke-dasharray="3 5"/></svg>` },
];
