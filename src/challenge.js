/**
 * SKIP — friend challenges without a server.
 *
 * A challenge is a seed (so both players get the same motes and lily pads),
 * the challenger's distance and their 3-letter tag, packed into a short URL
 * fragment: `#c=SEED.SCORE10.TAG`. Opening the link plays the same lake and
 * the result card compares the two runs. The reply link carries both scores.
 */
const TAG_RE = /^[A-Z0-9]{1,3}$/;

/** Deterministic PRNG (mulberry32). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function newSeed() { return Math.floor(Math.random() * 0xFFFFFFFF) >>> 0; }

/** Normalise a player tag: up to 3 uppercase letters/digits, default 'YOU'. */
export function cleanTag(tag) {
  const t = String(tag || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  return TAG_RE.test(t) ? t : 'YOU';
}

/**
 * @param {{ seed:number, score:number, tag:string, reply?: {score:number, tag:string} }} c  score in metres
 * @returns {string} fragment value
 */
export function encodeChallenge(c) {
  const parts = [c.seed >>> 0, Math.round(c.score * 10), cleanTag(c.tag)];
  if (c.reply) parts.push(Math.round(c.reply.score * 10), cleanTag(c.reply.tag));
  return parts.join('.');
}

/** @returns {{ seed:number, score:number, tag:string, reply?: {score:number, tag:string} }|null} */
export function decodeChallenge(str) {
  if (!str) return null;
  const p = String(str).split('.');
  if (p.length !== 3 && p.length !== 5) return null;
  const seed = Number(p[0]), score10 = Number(p[1]);
  if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(score10) || score10 < 0) return null;
  const out = { seed: seed >>> 0, score: score10 / 10, tag: cleanTag(p[2]) };
  if (p.length === 5) {
    const r10 = Number(p[3]);
    if (!Number.isInteger(r10) || r10 < 0) return null;
    out.reply = { score: r10 / 10, tag: cleanTag(p[4]) };
  }
  return out;
}

/** Build a full URL for a challenge from the current page URL. */
export function challengeUrl(baseHref, c) {
  const u = new URL(baseHref);
  u.hash = 'c=' + encodeChallenge(c);
  return u.toString();
}

/** Read a challenge from a URL (hash first, then query). */
export function challengeFromUrl(href) {
  try {
    const u = new URL(href);
    const h = new URLSearchParams(u.hash.replace(/^#/, ''));
    return decodeChallenge(h.get('c') || u.searchParams.get('c'));
  } catch { return null; }
}

/**
 * The URL a challenge link should point at. Inside the Game Box the hub owns
 * the address (`…/#play=<game>&c=…`) so the link opens the box straight into
 * the right game; standalone, the game's own page.
 */
export function challengeBase(gameId) {
  const inBox = typeof window !== 'undefined' && window.parent !== window;
  if (inBox) { try { const u = new URL(window.parent.location.href); u.hash = ''; return { href: u.toString(), prefix: `play=${gameId}&` }; } catch { /* cross-origin: fall through */ } }
  const u = new URL(window.location.href); u.hash = ''; u.searchParams.delete('box');
  return { href: u.toString(), prefix: '' };
}

/** Full challenge URL for a game (hub-aware). */
export function challengeLink(gameId, c) {
  const { href, prefix } = challengeBase(gameId);
  const u = new URL(href);
  u.hash = prefix + 'c=' + encodeChallenge(c);
  return u.toString();
}
