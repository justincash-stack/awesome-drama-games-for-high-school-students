/* ── ROUTER ── */
function getHash() {
  const h = location.hash.replace('#', '');
  if (!h) return { view: 'home' };
  const m = h.match(/^game\/(\d+)$/);
  if (m) return { view: 'game', id: parseInt(m[1], 10) };
  return { view: 'home' };
}

/* ── DOM REFS ── */
const homeView   = document.getElementById('home-view');
const gameView   = document.getElementById('game-view');
const container  = document.getElementById('games-container');
const searchEl   = document.getElementById('search');
const searchWrap = document.getElementById('search-wrap');
const detailEl   = document.getElementById('game-detail-content');
const backBtn    = document.getElementById('back-btn');

/* ── SORTED GAMES ── */
const sortedGames = [...GAMES].sort((a, b) => a.title.localeCompare(b.title));

/* ── FAVOURITES ── */
const FAVS_KEY = 'drama-favs';
function getFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveFavs(s) { localStorage.setItem(FAVS_KEY, JSON.stringify([...s])); }
function toggleFav(id) {
  const s = getFavs();
  if (s.has(id)) s.delete(id); else s.add(id);
  saveFavs(s);
}

/* ── RENDER HOME ── */
function renderHome(query = '') {
  const q = query.trim().toLowerCase();
  const favIds = getFavs();
  const filtered = q
    ? sortedGames.filter(g => g.title.toLowerCase().includes(q))
    : sortedGames;

  if (!filtered.length) {
    container.innerHTML = `<div class="no-results"><h2>No games found</h2><p>Try a different search term.</p></div>`;
    return;
  }

  let html = '';

  if (!q && favIds.size > 0) {
    const favGames = sortedGames.filter(g => favIds.has(g.id));
    if (favGames.length) {
      html += `<div class="fav-section fade-in">
        <div class="fav-heading">&#9733; Favourites</div>
        <div class="games-grid">${favGames.map(gameCard).join('')}</div>
      </div>`;
    }
  }

  if (q) {
    html += `<div class="games-grid fade-in">${filtered.map(gameCard).join('')}</div>`;
  } else {
    const byLetter = {};
    for (const g of filtered) {
      const letter = g.title[0].toUpperCase();
      if (!byLetter[letter]) byLetter[letter] = [];
      byLetter[letter].push(g);
    }
    const letters = Object.keys(byLetter).sort();
    html += letters.map(letter => `
      <div class="alpha-section fade-in">
        <div class="alpha-heading">${letter}</div>
        <div class="games-grid">${byLetter[letter].map(gameCard).join('')}</div>
      </div>
    `).join('');
  }

  container.innerHTML = html;
}

function gameCard(g) {
  const fav = getFavs().has(g.id);
  return `
    <a class="game-card" href="#game/${g.id}" aria-label="${escHtml(g.title)}">
      <div class="card-inner">
        <div class="card-num">Game #${g.id}</div>
        <div class="card-title">${escHtml(g.title)}</div>
        ${g.players ? `<div class="card-players">Players: ${escHtml(g.players)}</div>` : ''}
      </div>
      <button class="fav-card-btn${fav ? ' is-fav' : ''}" data-id="${g.id}" aria-label="${fav ? 'Remove from favourites' : 'Add to favourites'}">${fav ? '&#9733;' : '&#9734;'}</button>
    </a>`;
}

/* ── RENDER GAME DETAIL ── */
function renderGame(id) {
  const g = GAMES.find(x => x.id === id);
  if (!g) { location.hash = ''; return; }

  const fav = getFavs().has(g.id);
  const promptsHtml = buildPrompts(g.prompts);
  const variationsHtml = g.variations.length ? `
    <div class="game-section">
      <div class="section-label">Variations</div>
      <ul class="variation-list">
        ${g.variations.map(v => `<li>${escHtml(v)}</li>`).join('')}
      </ul>
    </div>` : '';

  detailEl.innerHTML = `
    <div class="game-detail fade-in">
      <div class="game-detail-header">
        <div class="game-detail-header-content">
          <div class="game-detail-num">Game #${g.id} of 100</div>
          <h2 class="game-detail-title">${escHtml(g.title)}</h2>
          ${g.players ? `<span class="game-detail-players">&#128101; ${escHtml(g.players)}</span>` : ''}
          <button class="fav-detail-btn${fav ? ' is-fav' : ''}" data-id="${g.id}">${fav ? '&#9733; Favourited' : '&#9734; Add to Favourites'}</button>
        </div>
      </div>
      <div class="game-detail-body">
        ${g.setup ? `
        <div class="game-section">
          <div class="section-label">Set-up</div>
          <p class="section-text">${escHtml(g.setup)}${g.prompts.length ? ' Or use the prompts suggested below.' : ''}</p>
        </div>` : ''}
        ${g.howToPlay ? `
        <div class="game-section">
          <div class="section-label">How to Play</div>
          <p class="section-text">${escHtml(g.howToPlay)}</p>
        </div>` : ''}
        ${g.purpose ? `
        <div class="game-section">
          <div class="section-label">Purpose</div>
          <div class="purpose-box">${escHtml(g.purpose)}</div>
        </div>` : ''}
        ${g.prompts.length ? `
        <div class="game-section">
          <div class="section-label">Prompts</div>
          ${promptsHtml}
        </div>` : ''}
        ${variationsHtml}
      </div>
    </div>`;

  document.title = `${g.title} — 100 Awesome Drama Games`;
}

function buildPrompts(prompts) {
  if (!prompts.length) return '';
  const [first, ...rest] = prompts;
  const isDesc = first.startsWith('(');
  const items = isDesc ? rest : prompts;
  return `
    ${isDesc ? `<p class="prompts-intro">${escHtml(first)}</p>` : ''}
    ${items.length ? `<ul class="prompt-list">${items.map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>` : ''}
  `;
}

/* ── ROUTING ── */
function route() {
  const { view, id } = getHash();
  if (view === 'game') {
    homeView.style.display  = 'none';
    gameView.style.display  = 'block';
    searchWrap.style.display = 'none';
    renderGame(id);
    window.scrollTo(0, 0);
  } else {
    homeView.style.display  = 'block';
    gameView.style.display  = 'none';
    searchWrap.style.display = 'block';
    document.title = '100 Awesome Drama Games for High School Students';
    renderHome(searchEl.value);
    window.scrollTo(0, 0);
  }
}

/* ── SEARCH ── */
let searchTimer;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderHome(searchEl.value), 120);
});

/* ── FAV BUTTONS: cards (event delegation) ── */
container.addEventListener('click', e => {
  const btn = e.target.closest('.fav-card-btn');
  if (!btn) return;
  e.preventDefault();
  const id = parseInt(btn.dataset.id, 10);
  toggleFav(id);
  renderHome(searchEl.value);
});

/* ── FAV BUTTON: detail view (event delegation) ── */
detailEl.addEventListener('click', e => {
  const btn = e.target.closest('.fav-detail-btn');
  if (!btn) return;
  const id = parseInt(btn.dataset.id, 10);
  toggleFav(id);
  const newFav = getFavs().has(id);
  btn.classList.toggle('is-fav', newFav);
  btn.innerHTML = newFav ? '&#9733; Favourited' : '&#9734; Add to Favourites';
});

/* ── BACK BUTTON ── */
backBtn.addEventListener('click', () => { location.hash = ''; });

/* ── INIT ── */
window.addEventListener('hashchange', route);
route();

/* ── PWA INSTALL ── */
let deferredInstall;
const banner    = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const dismissBtn = document.getElementById('install-dismiss');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  banner.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstall) return;
  banner.style.display = 'none';
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
});

dismissBtn.addEventListener('click', () => { banner.style.display = 'none'; });

/* ── SERVICE WORKER ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ── UTIL ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
