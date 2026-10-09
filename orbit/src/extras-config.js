/** ORBIT — its song and first-play tutorial. */
export const song = {
  bpm: 118, root: 52, scale: 'minor', seed: 42, swing: 0,
  progression: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [6, 1, 3]],
  bass: { type: 'sawtooth', vol: 0.12, pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
  pad: { type: 'sawtooth', vol: 0.025, detune: 10 },
  lead: { type: 'triangle', vol: 0.07, density: 0.5, octave: 2, decay: 0.4 },
  drums: { kick: true, hat: true, vol: 0.55 }, space: 0.4,
};
export const steps = [
  { title: 'Tap to reverse', text: 'Your comet circles the ring. Every tap flips its direction.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="80" cy="60" r="40"/><circle cx="80" cy="20" r="6" fill="#fff"/><path d="M50 36c6-8 14-12 22-14M110 36c-6-8-14-12-22-14" stroke-opacity=".5"/></svg>` },
  { title: 'Dodge the red arcs', text: 'Arcs flash before they turn solid. Reverse away before they do.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="80" cy="60" r="40"/><path d="M108 32a40 40 0 0 1 10 40" stroke-width="8"/><circle cx="48" cy="86" r="6" fill="#fff"/></svg>` },
  { title: 'Collect the gems', text: 'Sweep through gems to score. The ring speeds up as you go.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="80" cy="60" r="40"/><path d="M40 60l8-10 8 10-8 10z"/><path d="M120 60l8-10 8 10-8 10z"/><circle cx="80" cy="20" r="6" fill="#fff"/></svg>` },
];
