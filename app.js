/* ── ROUTER ── */
function getHash() {
  const h = location.hash.replace('#', '');
  if (!h) return { view: 'home' };
  const m = h.match(/^game\/(\d+)$/);
  if (m) return { view: 'game', id: parseInt(m[1], 10) };
  return { view: 'home' };
}

/* ── DOM REFS ── */
const homeView    = document.getElementById('home-view');
const gameView    = document.getElementById('game-view');
const container   = document.getElementById('games-container');
const searchEl    = document.getElementById('search');
const searchWrap  = document.getElementById('search-wrap');
const filterBar   = document.getElementById('filter-bar');
const detailEl    = document.getElementById('game-detail-content');
const backBtn     = document.getElementById('back-btn');

/* ── SORTED GAMES ── */
const sortedGames = [...GAMES].sort((a, b) => a.title.localeCompare(b.title));

/* ── FILTER STATE ── */
const activeFilters = { energy: null, skills: new Set() };

function applyFilters(games) {
  return games.filter(g => {
    if (activeFilters.energy && g.energy !== activeFilters.energy) return false;
    if (activeFilters.skills.size > 0) {
      const gSkills = g.skills || [];
      for (const s of activeFilters.skills) {
        if (!gSkills.includes(s)) return false;
      }
    }
    return true;
  });
}

function hasActiveFilters() {
  return activeFilters.energy || activeFilters.skills.size > 0;
}

function syncFilterUI() {
  document.querySelectorAll('.flt').forEach(btn => {
    const f = btn.dataset.filter;
    const v = btn.dataset.val;
    let on = false;
    if (f === 'energy') on = activeFilters.energy === v;
    if (f === 'skill')  on = activeFilters.skills.has(v);
    btn.classList.toggle('active', on);
  });
  const clearBtn = document.getElementById('filter-clear-all');
  if (clearBtn) clearBtn.style.display = hasActiveFilters() ? 'inline-block' : 'none';
}

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

  let pool = q
    ? sortedGames.filter(g => g.title.toLowerCase().includes(q) || (g.purpose && g.purpose.toLowerCase().includes(q)))
    : sortedGames;

  pool = applyFilters(pool);

  if (!pool.length) {
    container.innerHTML = `<div class="no-results"><h2>No games found</h2><p>Try adjusting your search or filters.</p></div>`;
    return;
  }

  let html = '';

  if (!q && !hasActiveFilters() && favIds.size > 0) {
    const favGames = sortedGames.filter(g => favIds.has(g.id));
    if (favGames.length) {
      html += `<div class="fav-section fade-in">
        <div class="fav-heading">&#9733; Favourites</div>
        <div class="games-grid">${favGames.map(gameCard).join('')}</div>
      </div>`;
    }
  }

  if (q || hasActiveFilters()) {
    html += `<div class="games-grid fade-in">${pool.map(gameCard).join('')}</div>`;
  } else {
    const byLetter = {};
    for (const g of pool) {
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
  const fav    = getFavs().has(g.id);
  const energy = g.energy || '';
  const metaHtml = energy ? `
    <div class="card-meta">
      <span class="energy-pip ${energy}" title="Energy: ${energy}"></span>
    </div>` : '';

  return `
    <a class="game-card" href="#game/${g.id}" aria-label="${escHtml(g.title)}">
      <div class="card-inner">
        <div class="card-num">Game #${g.id}</div>
        <div class="card-title">${escHtml(g.title)}</div>
        ${metaHtml}
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
  const promptsHtml = buildPrompts(g.prompts, g.id);
  const variationsHtml = g.variations && g.variations.length ? `
    <div class="game-section">
      <div class="section-label">Variations</div>
      <ul class="variation-list">
        ${g.variations.map(v => `<li>${escHtml(v)}</li>`).join('')}
      </ul>
    </div>` : '';

  const energy = g.energy || '';
  const skills = g.skills || [];
  const metaTagsHtml = (energy || skills.length) ? `
    <div class="detail-meta">
      ${energy ? `<span class="detail-energy-badge ${energy}">&#9889; ${energy} energy</span>` : ''}
      ${skills.map(s => `<span class="skill-tag">${escHtml(s)}</span>`).join('')}
    </div>` : '';

  detailEl.innerHTML = `
    <div class="game-detail fade-in">
      <div class="game-detail-header">
        <div class="game-detail-header-content">
          <div class="game-detail-num">Game #${g.id} of 100</div>
          <h2 class="game-detail-title">${escHtml(g.title)}</h2>
          ${g.players ? `<span class="game-detail-players">&#128101; ${escHtml(g.players)}</span>` : ''}
          ${metaTagsHtml}
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center;">
            <button class="fav-detail-btn${fav ? ' is-fav' : ''}" data-id="${g.id}">${fav ? '&#9733; Favourited' : '&#9734; Add to Favourites'}</button>
            <button class="proj-launch-btn" id="proj-launch-btn" data-id="${g.id}">&#128250; Projector Mode</button>
          </div>
        </div>
      </div>
      <div class="game-detail-body">
        ${g.setup ? `
        <div class="game-section">
          <div class="section-label">Set-up</div>
          <p class="section-text">${escHtml(g.setup)}${hasPrompts(g.prompts) ? ' Or use the prompts suggested below.' : ''}</p>
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
        ${promptsHtml ? `
        <div class="game-section">
          <div class="section-label">Prompts</div>
          ${promptsHtml}
        </div>` : ''}
        ${variationsHtml}
      </div>
    </div>`;

  document.title = `${g.title} — 100 Awesome Drama Games`;
}

function buildPrompts(prompts, gameId) {
  if (!prompts) return '';

  /* Tiered format (object with beginner/intermediate/advanced arrays) */
  if (!Array.isArray(prompts) && prompts.beginner) {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const labels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
    const descHtml = prompts.desc ? `<p class="prompts-intro">${escHtml(prompts.desc)}</p>` : '';
    const tabsHtml = levels.map((lvl, i) => `
      <button class="prompt-tab${i === 0 ? ' active' : ''}" data-level="${lvl}" data-game="${gameId}">${labels[lvl]}</button>
    `).join('');
    const panelsHtml = levels.map((lvl, i) => `
      <div class="prompt-panel${i === 0 ? ' active' : ''}" data-panel="${lvl}" data-game="${gameId}">
        <ul class="prompt-list">${(prompts[lvl] || []).map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>
      </div>
    `).join('');
    return `${descHtml}<div class="prompt-tabs">${tabsHtml}</div>${panelsHtml}`;
  }

  /* Legacy flat array format (games 11–100) */
  if (!prompts.length) return '';
  const [first, ...rest] = prompts;
  const isDesc = first.startsWith('(');
  const items = isDesc ? rest : prompts;
  return `
    ${isDesc ? `<p class="prompts-intro">${escHtml(first)}</p>` : ''}
    ${items.length ? `<ul class="prompt-list">${items.map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>` : ''}
  `;
}

/* ── PROJECTOR MODE ── */
const projOverlay  = document.getElementById('proj-overlay');
const projGamenum  = document.getElementById('proj-gamenum');
const projTitle    = document.getElementById('proj-gametitle');
const projSetup    = document.getElementById('proj-setup');
const projHowto    = document.getElementById('proj-howto');
const projCloseBtn = document.getElementById('proj-close-btn');

function openProjector(id) {
  const g = GAMES.find(x => x.id === id);
  if (!g) return;
  projGamenum.textContent = `Game #${g.id} of 100`;
  projTitle.textContent   = g.title;
  projSetup.textContent   = g.setup || '';
  projHowto.textContent   = g.howToPlay || '';
  projOverlay.classList.add('active');
  timerReset();
  document.body.style.overflow = 'hidden';
  if (projOverlay.requestFullscreen) projOverlay.requestFullscreen().catch(() => {});
}

function closeProjector() {
  projOverlay.classList.remove('active');
  timerStop();
  document.body.style.overflow = '';
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

projCloseBtn.addEventListener('click', closeProjector);
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && projOverlay.classList.contains('active')) {
    closeProjector();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && projOverlay.classList.contains('active')) closeProjector();
});

/* ── IN-CLASS TIMER ── */
const tDisplay  = document.getElementById('t-display');
const tStartBtn = document.getElementById('t-start');
const tResetBtn = document.getElementById('t-reset');
const tExtend   = document.getElementById('t-extend');

let timerSecs    = 0;
let timerTotal   = 0;
let timerRunning = false;
let timerInterval = null;
let audioCtx     = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep(freq = 880, duration = 0.18, gain = 0.4) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.connect(gn);
    gn.connect(ctx.destination);
    osc.frequency.value = freq;
    gn.gain.setValueAtTime(gain, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function doneBeep() {
  beep(660, 0.15, 0.5);
  setTimeout(() => beep(880, 0.15, 0.5), 180);
  setTimeout(() => beep(1100, 0.35, 0.6), 360);
}

function timerFormat(s) {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function timerUpdateDisplay() {
  if (!tDisplay) return;
  tDisplay.textContent = timerSecs > 0 || timerTotal > 0 ? timerFormat(timerSecs) : '–:––';
  tDisplay.classList.remove('warn', 'danger', 'done');
  if (timerSecs <= 0 && timerTotal > 0) {
    tDisplay.classList.add('done');
  } else if (timerSecs <= 30 && timerTotal > 0) {
    tDisplay.classList.add('danger');
  } else if (timerSecs <= 60 && timerTotal > 60) {
    tDisplay.classList.add('warn');
  }
}

function timerStop() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  if (tStartBtn) { tStartBtn.textContent = 'Start'; tStartBtn.classList.add('t-primary'); }
}

function timerReset() {
  timerStop();
  timerSecs = timerTotal;
  timerUpdateDisplay();
}

function timerStart() {
  if (timerTotal === 0) return;
  if (timerSecs <= 0) timerSecs = timerTotal;
  timerRunning = true;
  if (tStartBtn) { tStartBtn.textContent = 'Pause'; tStartBtn.classList.remove('t-primary'); }
  timerInterval = setInterval(() => {
    timerSecs--;
    timerUpdateDisplay();
    if (timerSecs <= 0) {
      timerStop();
      doneBeep();
    }
  }, 1000);
}

if (tStartBtn) {
  tStartBtn.addEventListener('click', () => {
    if (timerTotal === 0) return;
    if (timerRunning) { timerStop(); } else { timerStart(); }
  });
}
if (tResetBtn) tResetBtn.addEventListener('click', timerReset);
if (tExtend) tExtend.addEventListener('click', () => {
  timerSecs += 60;
  timerTotal += 60;
  timerUpdateDisplay();
});

document.querySelectorAll('.t-pre').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.t-pre').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mins = parseInt(btn.dataset.mins, 10);
    timerTotal = mins * 60;
    timerReset();
  });
});

/* ── TEACHER MODAL ── */
const teacherModal    = document.getElementById('teacher-modal');
const teacherCloseBtn = document.getElementById('teacher-close-btn');
const teacherInfoBtn  = document.getElementById('teacher-info-btn');

if (teacherInfoBtn)  teacherInfoBtn.addEventListener('click',  () => teacherModal.classList.add('active'));
if (teacherCloseBtn) teacherCloseBtn.addEventListener('click', () => teacherModal.classList.remove('active'));
if (teacherModal) {
  teacherModal.addEventListener('click', e => {
    if (e.target === teacherModal) teacherModal.classList.remove('active');
  });
}

/* ── ROUTING ── */
function route() {
  const { view, id } = getHash();
  if (view === 'game') {
    homeView.style.display   = 'none';
    gameView.style.display   = 'block';
    searchWrap.style.display = 'none';
    filterBar.style.display  = 'none';
    renderGame(id);
    window.scrollTo(0, 0);
  } else {
    homeView.style.display   = 'block';
    gameView.style.display   = 'none';
    searchWrap.style.display = 'block';
    filterBar.style.display  = 'block';
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

/* ── FILTER BUTTONS ── */
filterBar.addEventListener('click', e => {
  const btn = e.target.closest('.flt');
  if (!btn) return;
  const f = btn.dataset.filter;
  const v = btn.dataset.val;
  if (f === 'energy') {
    activeFilters.energy = activeFilters.energy === v ? null : v;
  } else if (f === 'skill') {
    if (activeFilters.skills.has(v)) activeFilters.skills.delete(v);
    else activeFilters.skills.add(v);
  }
  syncFilterUI();
  renderHome(searchEl.value);
});

const clearAllBtn = document.getElementById('filter-clear-all');
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', () => {
    activeFilters.energy = null;
    activeFilters.skills.clear();
    syncFilterUI();
    renderHome(searchEl.value);
  });
}

/* ── FAV BUTTONS: cards (event delegation) ── */
container.addEventListener('click', e => {
  const btn = e.target.closest('.fav-card-btn');
  if (!btn) return;
  e.preventDefault();
  const id = parseInt(btn.dataset.id, 10);
  toggleFav(id);
  renderHome(searchEl.value);
});

/* ── FAV BUTTON + PROJECTOR BUTTON + PROMPT TABS: detail view (event delegation) ── */
detailEl.addEventListener('click', e => {
  const favBtn = e.target.closest('.fav-detail-btn');
  if (favBtn) {
    const id = parseInt(favBtn.dataset.id, 10);
    toggleFav(id);
    const newFav = getFavs().has(id);
    favBtn.classList.toggle('is-fav', newFav);
    favBtn.innerHTML = newFav ? '&#9733; Favourited' : '&#9734; Add to Favourites';
    return;
  }
  const projBtn = e.target.closest('.proj-launch-btn');
  if (projBtn) {
    const id = parseInt(projBtn.dataset.id, 10);
    openProjector(id);
    return;
  }
  const tab = e.target.closest('.prompt-tab');
  if (tab) {
    const level   = tab.dataset.level;
    const gameId  = tab.dataset.game;
    detailEl.querySelectorAll(`.prompt-tab[data-game="${gameId}"]`).forEach(t => t.classList.toggle('active', t === tab));
    detailEl.querySelectorAll(`.prompt-panel[data-game="${gameId}"]`).forEach(p => p.classList.toggle('active', p.dataset.panel === level));
  }
});

/* ── BACK BUTTON ── */
backBtn.addEventListener('click', () => { location.hash = ''; });

/* ── INIT ── */
window.addEventListener('hashchange', route);
syncFilterUI();
route();

/* ── PWA INSTALL ── */
let deferredInstall;
const banner     = document.getElementById('install-banner');
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
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const toast = document.getElementById('update-toast');
            if (toast) toast.style.display = 'block';
          }
        });
      });
    }).catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      setTimeout(() => window.location.reload(), 1200);
    });
  });
}

/* ── UTIL ── */
function hasPrompts(p) {
  if (!p) return false;
  if (Array.isArray(p)) return p.length > 0;
  return !!(p.beginner && p.beginner.length);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
