/** POP — its song and first-play tutorial. */
export const song = {
  bpm: 128, root: 60, scale: 'major', seed: 21, swing: 0.12,
  progression: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [5, 0, 2]],
  bass: { type: 'square', vol: 0.09, pattern: [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1] },
  pad: { type: 'triangle', vol: 0.04, detune: 8 },
  lead: { type: 'square', vol: 0.05, density: 0.7, octave: 2, decay: 0.16 },
  drums: { kick: true, hat: true, vol: 0.5 }, space: 0.25,
};
export const steps = [
  { title: 'Pop the matching colour', text: 'Bubbles rise. Tap only the ones matching the colour shown at the top.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="70" r="18"/><circle cx="110" cy="60" r="16" stroke-opacity=".4"/><circle cx="80" cy="22" r="10"/><path d="M80 36v10" stroke-opacity=".5"/></svg>` },
  { title: 'Three lives', text: 'A wrong colour costs a life. So does letting a matching bubble float away.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="56" cy="60" r="8"/><circle cx="80" cy="60" r="8"/><circle cx="104" cy="60" r="8" stroke-opacity=".35"/></svg>` },
  { title: 'The colour changes', text: 'Every ten pops the target switches. Keep an eye on the top of the screen.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="60" cy="60" r="16"/><path d="M84 60h24M100 52l8 8-8 8"/><circle cx="128" cy="60" r="10"/></svg>` },
];
