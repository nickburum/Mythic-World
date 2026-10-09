/** Sky Temple — its song and first-play tutorial. */
export const song = {
  bpm: 100, root: 55, scale: 'lydian', seed: 7, swing: 0.05,
  progression: [[0, 2, 4], [1, 3, 5], [3, 5, 0], [4, 6, 1]],
  bass: { type: 'sine', vol: 0.15, pattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0] },
  pad: { type: 'triangle', vol: 0.045, detune: 6 },
  lead: { type: 'sine', vol: 0.1, density: 0.45, octave: 2, decay: 0.5 },
  drums: { kick: false, hat: true, vol: 0.3 }, space: 0.45,
};
export const steps = [
  { title: 'Tap to drop the stone', text: 'A stone slides over the tower. Tap to drop it. Anything hanging over the edge is cut away.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="56" y="70" width="48" height="24"/><rect x="72" y="36" width="48" height="24"/><path d="M104 36v24" stroke-dasharray="2 4" stroke-opacity=".5"/></svg>` },
  { title: 'Perfect drops grow it back', text: 'Line it up exactly and the stone snaps into place. Three perfects in a row and it starts to regrow.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="56" y="70" width="48" height="24"/><rect x="56" y="40" width="48" height="24"/><path d="M50 34h60" stroke-opacity=".5"/><path d="M118 52l6-6 6 6" /></svg>` },
];
