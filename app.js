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
const teacherToolsBar = document.getElementById('teacher-tools-bar');
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
      ${energy ? `<button type="button" class="detail-energy-badge ${energy}" data-filter="energy" data-val="${energy}">&#9889; ${energy} energy</button>` : ''}
      ${skills.map(s => `<button type="button" class="skill-tag" data-filter="skill" data-val="${escHtml(s)}">${escHtml(s)}</button>`).join('')}
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
          <p class="section-text">${escHtml(g.setup)}${hasPrompts(g.prompts) ? ' Or use the prompts suggested below, differentiated by difficulty level.' : ''}</p>
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
const projOverlay   = document.getElementById('proj-overlay');
const projGamenum   = document.getElementById('proj-gamenum');
const projTitle     = document.getElementById('proj-gametitle');
const projSetup     = document.getElementById('proj-setup');
const projHowto     = document.getElementById('proj-howto');
const projPurpose   = document.getElementById('proj-purpose');
const projCloseBtn  = document.getElementById('proj-close-btn');
const projTogglePromptsBtn = document.getElementById('proj-toggle-prompts');
const projTimerPanel  = document.getElementById('proj-timer-panel');
const projPromptsPanel = document.getElementById('proj-prompts-panel');

function showProjectorTimer() {
  projTimerPanel.classList.remove('proj-hidden');
  projPromptsPanel.classList.remove('active');
  projTogglePromptsBtn.innerHTML = '&#128203; Display Prompts';
}

function showProjectorPrompts() {
  projTimerPanel.classList.add('proj-hidden');
  projPromptsPanel.classList.add('active');
  projTogglePromptsBtn.innerHTML = '&#9201; Show Timer';
}

projTogglePromptsBtn.addEventListener('click', () => {
  if (projPromptsPanel.classList.contains('active')) showProjectorTimer();
  else showProjectorPrompts();
});

projPromptsPanel.addEventListener('click', e => {
  const tab = e.target.closest('.prompt-tab');
  if (!tab) return;
  const level  = tab.dataset.level;
  const gameId = tab.dataset.game;
  projPromptsPanel.querySelectorAll(`.prompt-tab[data-game="${gameId}"]`).forEach(t => t.classList.toggle('active', t === tab));
  projPromptsPanel.querySelectorAll(`.prompt-panel[data-game="${gameId}"]`).forEach(p => p.classList.toggle('active', p.dataset.panel === level));
});

function openProjector(id) {
  const g = GAMES.find(x => x.id === id);
  if (!g) return;
  projGamenum.textContent = `Game #${g.id} of 100`;
  projTitle.textContent   = g.title;
  projSetup.textContent   = g.setup || '';
  projHowto.textContent   = g.howToPlay || '';
  projPurpose.textContent = g.purpose || '';
  projPromptsPanel.innerHTML = buildPrompts(g.prompts, g.id);
  showProjectorTimer();
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
  /* Some browsers exit fullscreen automatically when a text input gains
     focus (e.g. certain mobile keyboards). Don't treat that as "the
     teacher wants to exit Projector Mode" while they're mid-edit in the
     Scoreboard — only auto-close on a genuine, deliberate fullscreen exit
     with no scoreboard in the way. */
  const scoreboardOverlayEl = document.getElementById('scoreboard-overlay');
  const scoreboardOpen = scoreboardOverlayEl && scoreboardOverlayEl.classList.contains('active');
  if (!document.fullscreenElement && projOverlay.classList.contains('active') && !scoreboardOpen) {
    closeProjector();
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const scoreboardOverlayEl = document.getElementById('scoreboard-overlay');
  if (scoreboardOverlayEl && scoreboardOverlayEl.classList.contains('active')) {
    closeScoreboardOverlay();
    return;
  }
  if (projOverlay.classList.contains('active')) closeProjector();
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
  tDisplay.textContent = timerSecs > 0 || timerTotal > 0 ? timerFormat(timerSecs) : '0:00';
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
    timerTotal = parseInt(btn.dataset.secs, 10);
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
    if (teacherToolsBar) teacherToolsBar.style.display = 'none';
    renderGame(id);
    window.scrollTo(0, 0);
  } else {
    homeView.style.display   = 'block';
    gameView.style.display   = 'none';
    searchWrap.style.display = 'block';
    filterBar.style.display  = 'block';
    if (teacherToolsBar) teacherToolsBar.style.display = 'block';
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
    return;
  }
  const tagBtn = e.target.closest('[data-filter]');
  if (tagBtn) {
    goToFilteredHome(tagBtn.dataset.filter, tagBtn.dataset.val);
  }
});

/* ── TAG → FILTERED HOME ── */
function goToFilteredHome(filterType, value) {
  if (filterType === 'energy') {
    activeFilters.energy = value;
    activeFilters.skills.clear();
  } else if (filterType === 'skill') {
    activeFilters.skills = new Set([value]);
    activeFilters.energy = null;
  }
  syncFilterUI();
  location.hash = '';
}

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
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
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

      const checkForUpdate = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      window.addEventListener('focus', checkForUpdate);
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

/* ── SCOREBOARD: DATA LAYER (localStorage, no backend) ── */
const SB_STORAGE_KEY = 'drama-scoreboards-v1';

function sbUid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function sbCreateDefaultBoard(name) {
  return {
    id: sbUid('b'),
    className: name || '',
    criteria: [
      { id: sbUid('c'), name: 'Storyline', max: 5 },
      { id: sbUid('c'), name: 'Technique', max: 5 },
      { id: sbUid('c'), name: 'Entertainment', max: 5 }
    ],
    teams: [],
    rows: []
  };
}

function sbLoadStore() {
  try {
    const raw = localStorage.getItem(SB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.boards && Object.keys(parsed.boards).length) return parsed;
    }
  } catch {}
  const board = sbCreateDefaultBoard('My Class');
  return { activeId: board.id, boards: { [board.id]: board } };
}

let scoreboardStore = sbLoadStore();

function sbSave() {
  try { localStorage.setItem(SB_STORAGE_KEY, JSON.stringify(scoreboardStore)); } catch {}
}

function sbGetActiveBoard() {
  let board = scoreboardStore.boards[scoreboardStore.activeId];
  if (!board) {
    const ids = Object.keys(scoreboardStore.boards);
    if (ids.length) {
      scoreboardStore.activeId = ids[0];
      board = scoreboardStore.boards[ids[0]];
    } else {
      board = sbCreateDefaultBoard('My Class');
      scoreboardStore.boards[board.id] = board;
      scoreboardStore.activeId = board.id;
    }
  }
  if (!board.criteria) board.criteria = [];
  if (!board.teams) board.teams = [];
  if (!board.rows) board.rows = [];
  return board;
}

function sbCellTotal(board, row, teamId) {
  const scores = (row.scores && row.scores[teamId]) || {};
  const crits = board.criteria.length ? board.criteria : [{ id: '_score' }];
  let sum = 0;
  crits.forEach(c => {
    const v = Number(scores[c.id]);
    if (!isNaN(v)) sum += v;
  });
  return sum;
}

/* ── SCOREBOARD: RENDERING ── */
function sbCriteriaListHtml(board) {
  if (!board.criteria.length) {
    return '<span class="sb-empty-msg" style="margin:0;">No criteria — enter a single score per cell.</span>';
  }
  return board.criteria.map(c => `
    <div class="sb-criterion-chip">
      <input type="text" data-action="crit-name" data-crit-id="${c.id}" value="${escHtml(c.name)}">
      <span>/</span>
      <input type="number" min="1" max="100" data-action="crit-max" data-crit-id="${c.id}" value="${c.max}">
      <button class="sb-remove-btn" data-action="remove-criterion" data-crit-id="${c.id}" title="Remove criterion">&times;</button>
    </div>
  `).join('');
}

function sbTableHeadHtml(board) {
  return `<tr>
    <th class="sb-th-game">Game</th>
    ${board.teams.map(t => `
      <th class="sb-th-team">
        <div class="sb-team-head">
          <input type="text" class="sb-team-name-input" data-team-id="${t.id}" value="${escHtml(t.name)}" placeholder="Team name">
          <button class="sb-remove-btn" data-action="remove-team" data-team-id="${t.id}" title="Remove team">&times;</button>
        </div>
      </th>`).join('')}
    <th class="sb-th-actions"></th>
  </tr>`;
}

function sbScoreCellHtml(board, row, team) {
  const scores = (row.scores && row.scores[team.id]) || {};
  if (board.criteria.length) {
    const rowsHtml = board.criteria.map(c => {
      const v = scores[c.id];
      return `
        <label class="sb-crit-input-row">
          <span class="sb-crit-mini-label" data-crit-label="${c.id}">${escHtml(c.name || '')}</span>
          <input type="number" class="sb-score-input" inputmode="numeric" data-row="${row.id}" data-team="${team.id}" data-crit="${c.id}" min="0" max="${c.max || ''}" value="${v === undefined || v === null ? '' : v}">
          <span class="sb-crit-max" data-crit-max="${c.id}">/${c.max || ''}</span>
        </label>`;
    }).join('');
    return `
      <div class="sb-cell-criteria">
        ${rowsHtml}
        <div class="sb-subtotal" data-subtotal-row="${row.id}" data-subtotal-team="${team.id}">${sbCellTotal(board, row, team.id)}</div>
      </div>`;
  }
  const v = scores['_score'];
  return `<input type="number" class="sb-score-input sb-score-input-single" data-row="${row.id}" data-team="${team.id}" data-crit="_score" min="0" value="${v === undefined || v === null ? '' : v}">`;
}

function sbTableBodyHtml(board) {
  if (!board.rows.length) {
    return `<tr><td class="sb-empty-row" colspan="${board.teams.length + 2}">No games added yet — click "+ Add Game Row" below.</td></tr>`;
  }
  return board.rows.map(row => `
    <tr data-row-id="${row.id}">
      <td class="sb-td-game">
        <select class="sb-game-select" data-row-id="${row.id}">
          <option value="">— Select a game —</option>
          ${sortedGames.map(g => `<option value="${g.id}" ${String(row.gameId) === String(g.id) ? 'selected' : ''}>${escHtml(g.title)}</option>`).join('')}
        </select>
      </td>
      ${board.teams.map(t => `<td class="sb-td-score">${sbScoreCellHtml(board, row, t)}</td>`).join('')}
      <td class="sb-td-actions">
        <button class="sb-remove-btn" data-action="remove-row" data-row-id="${row.id}" title="Remove row">&times;</button>
      </td>
    </tr>
  `).join('');
}

function sbUpdateTotals(board) {
  const foot = document.getElementById('sb-table-foot');
  if (!foot) return;
  const totals = board.teams.map(t => board.rows.reduce((sum, row) => sum + sbCellTotal(board, row, t.id), 0));
  foot.innerHTML = `
    <tr class="sb-totals-row active">
      <td>TOTAL</td>
      ${totals.map(v => `<td>${v}</td>`).join('')}
      <td></td>
    </tr>`;
}

function renderScoreboard() {
  const board = sbGetActiveBoard();
  const boardSelect = document.getElementById('sb-board-select');
  const ids = Object.keys(scoreboardStore.boards);
  boardSelect.innerHTML = ids.map(id => {
    const b = scoreboardStore.boards[id];
    const label = b.className && b.className.trim() ? b.className : 'Untitled Class';
    return `<option value="${id}" ${id === board.id ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');

  document.getElementById('sb-classname-input').value = board.className || '';
  document.getElementById('sb-criteria-list').innerHTML = sbCriteriaListHtml(board);
  document.getElementById('sb-table-head').innerHTML = sbTableHeadHtml(board);
  document.getElementById('sb-table-body').innerHTML = sbTableBodyHtml(board);
  document.getElementById('sb-table-foot').innerHTML = '';
}

/* ── SCOREBOARD: OPEN / CLOSE ──
   #scoreboard-overlay is a sibling of #proj-overlay, not a descendant.
   The Fullscreen API only renders the fullscreen element's own subtree —
   a sibling stays invisible no matter its z-index — so when Projector
   Mode is fullscreen we must switch the fullscreen target to the
   scoreboard while it's open, then switch it back on close. */
const scoreboardOverlay = document.getElementById('scoreboard-overlay');

function openScoreboard() {
  renderScoreboard();
  scoreboardOverlay.classList.add('active');
  const sbCloseBtnEl = document.getElementById('sb-close-btn');
  if (sbCloseBtnEl) {
    sbCloseBtnEl.innerHTML = projOverlay.classList.contains('active')
      ? '&#x2715; Back to Projector'
      : '&#x2715; Close Scoreboard';
  }
  if (document.fullscreenElement === projOverlay && scoreboardOverlay.requestFullscreen) {
    scoreboardOverlay.requestFullscreen().catch(() => {});
  }
}
function closeScoreboardOverlay() {
  scoreboardOverlay.classList.remove('active');
  if (document.fullscreenElement === scoreboardOverlay && projOverlay.classList.contains('active') && projOverlay.requestFullscreen) {
    projOverlay.requestFullscreen().catch(() => {});
  }
}

const projScoreboardBtn = document.getElementById('proj-scoreboard-btn');
if (projScoreboardBtn) projScoreboardBtn.addEventListener('click', openScoreboard);

const homeScoreboardBtn = document.getElementById('home-scoreboard-btn');
if (homeScoreboardBtn) homeScoreboardBtn.addEventListener('click', openScoreboard);

const sbCloseBtn = document.getElementById('sb-close-btn');
if (sbCloseBtn) sbCloseBtn.addEventListener('click', closeScoreboardOverlay);

/* ── SCOREBOARD: BOARD-LEVEL CONTROLS ── */
const sbBoardSelect = document.getElementById('sb-board-select');
if (sbBoardSelect) sbBoardSelect.addEventListener('change', e => {
  scoreboardStore.activeId = e.target.value;
  sbSave();
  renderScoreboard();
});

const sbNewBoardBtn = document.getElementById('sb-new-board-btn');
if (sbNewBoardBtn) sbNewBoardBtn.addEventListener('click', () => {
  const board = sbCreateDefaultBoard('New Class');
  scoreboardStore.boards[board.id] = board;
  scoreboardStore.activeId = board.id;
  sbSave();
  renderScoreboard();
  const input = document.getElementById('sb-classname-input');
  if (input) { input.focus(); input.select(); }
});

const sbDeleteBoardBtn = document.getElementById('sb-delete-board-btn');
if (sbDeleteBoardBtn) sbDeleteBoardBtn.addEventListener('click', () => {
  const board = sbGetActiveBoard();
  const label = board.className && board.className.trim() ? board.className : 'this class';
  if (!confirm(`Delete the scoreboard for "${label}"? This cannot be undone.`)) return;
  delete scoreboardStore.boards[board.id];
  const remaining = Object.keys(scoreboardStore.boards);
  if (remaining.length) {
    scoreboardStore.activeId = remaining[0];
  } else {
    const nb = sbCreateDefaultBoard('My Class');
    scoreboardStore.boards[nb.id] = nb;
    scoreboardStore.activeId = nb.id;
  }
  sbSave();
  renderScoreboard();
});

const sbAddCriterionBtn = document.getElementById('sb-add-criterion-btn');
if (sbAddCriterionBtn) sbAddCriterionBtn.addEventListener('click', () => {
  const board = sbGetActiveBoard();
  board.criteria.push({ id: sbUid('c'), name: 'Criterion', max: 5 });
  sbSave();
  renderScoreboard();
});

const sbAddTeamBtn = document.getElementById('sb-add-team-btn');
if (sbAddTeamBtn) sbAddTeamBtn.addEventListener('click', () => {
  const board = sbGetActiveBoard();
  board.teams.push({ id: sbUid('t'), name: `Team ${board.teams.length + 1}` });
  sbSave();
  renderScoreboard();
});

const sbAddRowBtn = document.getElementById('sb-add-row-btn');
if (sbAddRowBtn) sbAddRowBtn.addEventListener('click', () => {
  const board = sbGetActiveBoard();
  board.rows.push({ id: sbUid('r'), gameId: null, scores: {} });
  sbSave();
  renderScoreboard();
});

const sbTotalBtn = document.getElementById('sb-total-btn');
if (sbTotalBtn) sbTotalBtn.addEventListener('click', () => {
  sbUpdateTotals(sbGetActiveBoard());
});

const sbClearScoresBtn = document.getElementById('sb-clear-scores-btn');
if (sbClearScoresBtn) sbClearScoresBtn.addEventListener('click', () => {
  const board = sbGetActiveBoard();
  const label = board.className && board.className.trim() ? board.className : 'this class';
  if (!confirm(`Clear all scores for "${label}"? Team names, games, and criteria will be kept.`)) return;
  board.rows.forEach(row => { row.scores = {}; });
  sbSave();
  renderScoreboard();
});

/* ── SCOREBOARD: TABLE/CRITERIA DELEGATION (click, input, change) ── */
const sbBody = document.querySelector('.sb-body');

if (sbBody) sbBody.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action !== 'remove-team' && action !== 'remove-row' && action !== 'remove-criterion') return;
  const board = sbGetActiveBoard();
  if (action === 'remove-team') {
    board.teams = board.teams.filter(t => t.id !== btn.dataset.teamId);
  } else if (action === 'remove-row') {
    board.rows = board.rows.filter(r => r.id !== btn.dataset.rowId);
  } else if (action === 'remove-criterion') {
    board.criteria = board.criteria.filter(c => c.id !== btn.dataset.critId);
  }
  sbSave();
  renderScoreboard();
});

if (sbBody) sbBody.addEventListener('input', e => {
  const board = sbGetActiveBoard();
  const t = e.target;

  if (t.id === 'sb-classname-input') {
    board.className = t.value;
    sbSave();
    const opt = document.querySelector(`#sb-board-select option[value="${board.id}"]`);
    if (opt) opt.textContent = t.value.trim() ? t.value : 'Untitled Class';
    return;
  }

  if (t.classList.contains('sb-team-name-input')) {
    const team = board.teams.find(x => x.id === t.dataset.teamId);
    if (team) { team.name = t.value; sbSave(); }
    return;
  }

  if (t.dataset.action === 'crit-name') {
    const c = board.criteria.find(x => x.id === t.dataset.critId);
    if (c) {
      c.name = t.value;
      sbSave();
      document.querySelectorAll(`[data-crit-label="${c.id}"]`).forEach(el => { el.textContent = c.name; });
    }
    return;
  }

  if (t.dataset.action === 'crit-max') {
    const c = board.criteria.find(x => x.id === t.dataset.critId);
    if (c) {
      c.max = parseInt(t.value, 10) || 0;
      sbSave();
      document.querySelectorAll(`[data-crit-max="${c.id}"]`).forEach(el => { el.textContent = `/${c.max}`; });
      document.querySelectorAll(`input.sb-score-input[data-crit="${c.id}"]`).forEach(el => { el.max = c.max; });
    }
    return;
  }

  if (t.classList.contains('sb-score-input')) {
    const rowId = t.dataset.row, teamId = t.dataset.team, critId = t.dataset.crit;
    const row = board.rows.find(r => r.id === rowId);
    if (!row) return;
    if (!row.scores[teamId]) row.scores[teamId] = {};
    const val = t.value === '' ? null : Number(t.value);
    if (val === null || isNaN(val)) delete row.scores[teamId][critId];
    else row.scores[teamId][critId] = val;
    sbSave();
    const subtotalEl = document.querySelector(`[data-subtotal-row="${rowId}"][data-subtotal-team="${teamId}"]`);
    if (subtotalEl) subtotalEl.textContent = sbCellTotal(board, row, teamId);
    if (document.querySelector('.sb-totals-row')) sbUpdateTotals(board);
    return;
  }
});

if (sbBody) sbBody.addEventListener('change', e => {
  const t = e.target;
  if (t.classList.contains('sb-game-select')) {
    const board = sbGetActiveBoard();
    const row = board.rows.find(r => r.id === t.dataset.rowId);
    if (row) { row.gameId = t.value ? parseInt(t.value, 10) : null; sbSave(); }
  }
});
