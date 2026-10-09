/** MELT — its song and first-play tutorial. */
export const song = {
  bpm: 112, root: 57, scale: 'pentMinor', seed: 11, swing: 0.08,
  progression: [[0, 2, 4], [3, 0, 2], [1, 3, 0], [4, 1, 3]],
  bass: { type: 'triangle', vol: 0.16, pattern: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0] },
  pad: { type: 'sine', vol: 0.05, detune: 5 },
  lead: { type: 'triangle', vol: 0.1, density: 0.6, octave: 2, decay: 0.28 },
  drums: { kick: true, hat: true, vol: 0.45 }, space: 0.3,
};
export const steps = [
  { title: 'Tap to change state', text: 'Every tap moves your drop one step: ice, water, steam, then back to ice.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="48" width="28" height="28" rx="7"/><path d="M80 44c-9 12-13 18-13 25a13 13 0 0 0 26 0c0-7-4-13-13-25z"/><path d="M118 70a9 9 0 0 1 2-18 11 11 0 0 1 21 3 8 8 0 0 1-2 15z"/><path d="M52 62h10M98 62h10" stroke-opacity=".5"/></svg>` },
  { title: 'Each wall lets one state through', text: 'Spikes: float over as steam. Beams: stay low. Glass: only ice breaks it. Pipes: only water flows.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 90l10-26 10 26 10-26 10 26" /><rect x="76" y="20" width="14" height="46"/><path d="M116 20v70M130 20v70" /><circle cx="123" cy="78" r="9"/></svg>` },
  { title: 'Read ahead and count', text: 'Some changes take one tap, some take two. Hot geysers and cold vents push you a step when you least expect it.', art: `<svg viewBox="0 0 160 120" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="60" r="18"/><path d="M68 60h24M86 52l8 8-8 8"/><circle cx="120" cy="60" r="18"/><path d="M40 52v16M32 60h16" /><path d="M112 60h16" /></svg>` },
];
