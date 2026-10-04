/**
 * Game switcher — a slide-in drawer on the right edge shared by every game
 * in this repo. Tap the handle or swipe in from the right edge to open it.
 *
 * Include on any game page as a plain script with `data-game` set to the
 * game's id. Paths resolve relative to this script, so it works from the
 * root and from sub-folders alike.
 */
(function () {
  const script = document.currentScript;
  const current = (script && script.dataset.game) || '';
  const base = new URL('.', script ? script.src : location.href).href;

  // Inside the Game Box the hub owns navigation: mark the page and stay out of the way.
  if (window.parent !== window) { document.documentElement.classList.add('in-box'); return; }

  const GAMES = [
    { id: 'melt', name: 'MELT', tag: 'Hold to heat, release to cool', href: base + 'melt/', icon: base + 'melt/art/icon-192.png', hue: '#3aa7ff' },
    { id: 'skip', name: 'SKIP', tag: 'Skip a stone across a sunset lake', href: base + 'skip/', icon: base + 'skip/art/icon-192.png', hue: '#ffb36b' },
    { id: 'pop', name: 'POP', tag: 'Pop the bubbles that match', href: base + 'pop/', icon: base + 'pop/art/icon-192.png', hue: '#ff7ab6' },
    { id: 'orbit', name: 'ORBIT', tag: 'Tap to reverse, dodge, collect', href: base + 'orbit/', icon: base + 'orbit/art/icon-192.png', hue: '#7df0ff' },
    { id: 'sky-temple', name: 'Sky Temple', tag: 'Tap to stack to the gods', href: base + 'sky-temple/', icon: base + 'sky-temple/art/icon-192.png', hue: '#ff9a5b' },
    { id: 'box', name: 'Game Box', tag: 'Back to all games', href: base, icon: base + 'art/icon-192.png', hue: '#ffffff' },
  ];

  const css = `
    .gsw-handle{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:60;width:34px;height:96px;border:0;border-radius:14px 0 0 14px;
      background:rgba(10,16,32,.55);color:#fff;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:-4px 0 18px rgba(0,0,0,.25);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;
      transition:transform .35s cubic-bezier(.2,.9,.2,1.1),opacity .3s}
    .gsw-handle img{width:22px;height:22px;border-radius:6px;display:block}
    .gsw-handle span{font:800 10px/1 ui-rounded,-apple-system,"SF Pro Rounded","Segoe UI",Roboto,Arial,sans-serif;letter-spacing:.14em;writing-mode:vertical-rl;transform:rotate(180deg);opacity:.85}
    .gsw-handle::before{content:"";position:absolute;left:5px;top:50%;width:3px;height:28px;margin-top:-14px;border-radius:2px;background:rgba(255,255,255,.35)}
    .gsw-open .gsw-handle{transform:translate(-280px,-50%)}
    .gsw-edge{position:fixed;top:0;right:0;bottom:0;width:22px;z-index:57;touch-action:none;background:transparent}
    .gsw-back{position:fixed;inset:0;z-index:58;background:rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .3s}
    .gsw-open .gsw-back{opacity:1;pointer-events:auto}
    .gsw-drawer{position:fixed;top:0;right:0;bottom:0;z-index:59;width:280px;max-width:88vw;padding:calc(env(safe-area-inset-top,0px) + 22px) 18px calc(env(safe-area-inset-bottom,0px) + 22px);
      background:rgba(14,22,42,.86);backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3);box-shadow:-10px 0 40px rgba(0,0,0,.35);
      transform:translateX(100%);transition:transform .35s cubic-bezier(.2,.9,.2,1.1);display:flex;flex-direction:column;gap:12px;color:#fff;
      font-family:ui-rounded,-apple-system,"SF Pro Rounded","Segoe UI",Roboto,Arial,sans-serif;touch-action:pan-y}
    .gsw-open .gsw-drawer{transform:none}
    .gsw-title{font-size:12px;letter-spacing:.26em;color:rgba(255,255,255,.65);margin:0 0 6px 4px}
    .gsw-card{display:flex;align-items:center;gap:14px;padding:12px;border-radius:18px;text-decoration:none;color:#fff;background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.14);transition:transform .08s,background .2s}
    .gsw-card:active{transform:scale(.98)}
    .gsw-card.gsw-current{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.4)}
    .gsw-card img{width:54px;height:54px;border-radius:14px;display:block;box-shadow:0 4px 0 rgba(0,0,0,.25)}
    .gsw-card b{display:block;font-size:17px;letter-spacing:.04em}
    .gsw-card small{display:block;font-size:12px;color:rgba(255,255,255,.7);margin-top:2px}
    .gsw-badge{margin-left:auto;font-size:10px;font-weight:900;letter-spacing:.14em;padding:5px 8px;border-radius:999px;background:#fff;color:#1b2a44}
    .gsw-hint{margin-top:auto;font-size:11px;color:rgba(255,255,255,.5);text-align:center;letter-spacing:.06em}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const cur = GAMES.find(g => g.id === current) || GAMES[0];

  const handle = document.createElement('button');
  handle.className = 'gsw-handle';
  handle.type = 'button';
  handle.setAttribute('data-ui', '');
  handle.setAttribute('aria-label', 'Switch game');
  handle.innerHTML = `<img alt="" src="${cur.icon}"><span>GAMES</span>`;

  // Invisible strip along the right edge: swipes that start here belong to the
  // switcher, and games skip anything marked data-ui, so a swipe never becomes a tap.
  const edge = document.createElement('div');
  edge.className = 'gsw-edge';
  edge.setAttribute('data-ui', '');
  edge.setAttribute('aria-hidden', 'true');

  const back = document.createElement('div');
  back.className = 'gsw-back';
  back.setAttribute('data-ui', '');

  const drawer = document.createElement('nav');
  drawer.className = 'gsw-drawer';
  drawer.setAttribute('data-ui', '');
  drawer.setAttribute('aria-label', 'Games');
  drawer.innerHTML = `<p class="gsw-title">SWITCH GAME</p>` + GAMES.map(g => `
    <a class="gsw-card${g.id === cur.id ? ' gsw-current' : ''}" href="${g.href}" ${g.id === cur.id ? 'aria-current="page"' : ''}>
      <img alt="" src="${g.icon}">
      <div><b>${g.name}</b><small>${g.tag}</small></div>
      ${g.id === cur.id ? '<span class="gsw-badge">PLAYING</span>' : ''}
    </a>`).join('') + `<div class="gsw-hint">swipe in from the right edge any time</div>`;

  document.body.append(edge, back, drawer, handle);

  const open = () => document.body.classList.add('gsw-open');
  const close = () => document.body.classList.remove('gsw-open');
  const toggle = () => document.body.classList.toggle('gsw-open');

  handle.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  back.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Swipe: start on the edge strip and drag left to open; drag right anywhere while open to close.
  let startX = null, startY = null, fromEdge = false;
  window.addEventListener('pointerdown', (e) => {
    startX = e.clientX; startY = e.clientY;
    fromEdge = e.target === edge || e.target === handle;
  }, { capture: true, passive: true });
  edge.addEventListener('click', open);
  window.addEventListener('pointermove', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX, dy = Math.abs(e.clientY - startY);
    if (fromEdge && dx < -30 && dy < 60) { open(); startX = null; }
    else if (document.body.classList.contains('gsw-open') && dx > 50 && dy < 80) { close(); startX = null; }
  }, { capture: true, passive: true });
  window.addEventListener('pointerup', () => { startX = null; }, { capture: true, passive: true });

  // Expose for tooling/tests.
  window.__gameSwitcher = { open, close, toggle, games: GAMES, current: cur.id };
})();
