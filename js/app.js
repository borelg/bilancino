/* Bilancino – diario alimentare. Tutti i dati restano nel browser (localStorage). */
'use strict';

/* ---------- utilità ---------- */
const KEY = 'bilancino.v1';
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => {
  if (v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const round = (n, d = 0) => { const k = 10 ** d; return Math.round((n || 0) * k) / k; };
const fmt = (n, d = 0) => (n == null || !Number.isFinite(n)) ? '–' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const fmtIn = (n) => (n == null || !Number.isFinite(n)) ? '' : String(round(n, 2)).replace('.', ',');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pad = (n) => String(n).padStart(2, '0');
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ds(new Date());
const toDate = (s) => new Date(s + 'T12:00:00');
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return ds(d); };
const weekday = (s) => (toDate(s).getDay() + 6) % 7; // 0 = lunedì
const WD = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const WD1 = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const longDate = (s) => toDate(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = (s) => toDate(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- icone ---------- */
const ICONS = {
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  basket: '<path d="M4 9h16l-1.5 10a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"/><path d="M9 9l3-5 3 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chart: '<path d="M4 19h16"/><path d="M5 15l4-5 4 3 6-7"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
};
const ic = (n, s = 22, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- stato ---------- */
function defaultState() {
  return {
    v: 1,
    settings: {
      meals: [
        { id: 'colazione', name: 'Colazione' },
        { id: 'pranzo', name: 'Pranzo' },
        { id: 'spuntino', name: 'Spuntino' },
        { id: 'cena', name: 'Cena' },
      ],
      nutrients: [
        { id: 'fiber', name: 'Fibre', unit: 'g', visible: true, builtin: true },
        { id: 'sugar', name: 'di cui zuccheri', unit: 'g', visible: false, builtin: true, parent: 'c' },
        { id: 'sat', name: 'di cui saturi', unit: 'g', visible: false, builtin: true, parent: 'f' },
        { id: 'salt', name: 'Sale', unit: 'g', visible: false, builtin: true },
      ],
      home: { ring: true, macros: true, nutrients: true, weight: true },
      showRemaining: true,
      theme: 'auto',
      measures: ['Vita'],
      aisles: ['Frutta e verdura', 'Carne e pesce', 'Latticini e uova', 'Cereali e legumi', 'Dispensa', 'Surgelati', 'Bevande'],
    },
    goals: {
      mode: 'fixed', // fixed | week
      fixed: 'std',
      week: ['std', 'std', 'std', 'std', 'std', 'std', 'std'],
      dayTypes: [{ id: 'std', name: 'Standard', kcal: 2000, p: 120, c: 230, f: 65, extra: { fiber: 30 } }],
      target: null,
      rate: -0.5,
    },
    dayOverride: {},
    products: {},
    recipes: {},
    diary: {},
    weights: [],
    measures: [],
    shopping: { checked: {}, extra: [] },
    welcomeDone: false,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    const d = defaultState();
    // completa eventuali campi mancanti (versioni future)
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    for (const k of Object.keys(d.settings)) if (s.settings[k] === undefined) s.settings[k] = d.settings[k];
    for (const k of Object.keys(d.goals)) if (s.goals[k] === undefined) s.goals[k] = d.goals[k];
    return s;
  } catch (e) {
    console.error(e);
    return defaultState();
  }
}
let state = load();
let saveTimer = null;
function save(now) {
  clearTimeout(saveTimer);
  const doSave = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Spazio pieno: esporta un backup dalle impostazioni'); }
  };
  if (now) doSave(); else saveTimer = setTimeout(doSave, 150);
}
window.addEventListener('pagehide', () => save(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });

/* stato dell'interfaccia (non salvato) */
const ui = {
  date: today(),
  meal: null,
  addTab: 'recenti',
  q: '',
  pantryFilter: 'all',
  range: 30,
  sheet: null,
  pDraft: null,
  rDraft: null,
};

/* ---------- calcoli nutrizionali ---------- */
const CORE = ['kcal', 'p', 'c', 'f'];
const MACROS = [
  { k: 'p', name: 'Proteine', short: 'P', color: 'var(--prot)', kcal: 4 },
  { k: 'c', name: 'Carboidrati', short: 'C', color: 'var(--carb)', kcal: 4 },
  { k: 'f', name: 'Grassi', short: 'G', color: 'var(--fat)', kcal: 9 },
];
const nutrient = (id) => state.settings.nutrients.find((n) => n.id === id);
function scaleN(o, f) { const r = {}; for (const k in o) if (o[k] != null && Number.isFinite(o[k])) r[k] = o[k] * f; return r; }
function addN(a, b) { for (const k in b) a[k] = (a[k] || 0) + (b[k] || 0); return a; }
const kcalFrom = (o) => 4 * (o.p || 0) + 4 * (o.c || 0) + 9 * (o.f || 0) + 2 * (o.fiber || 0);
function per100(p) { const o = { ...p.per100 }; if (p.autoKcal) o.kcal = kcalFrom(o); return o; }
const unitOf = (p) => (p.basis === 'ml' ? 'ml' : 'g');
function gramsOf(p, qty, unit) {
  if (unit === 'g') return qty;
  const s = (p.servings || []).find((x) => x.id === unit);
  return s ? qty * s.qty : qty;
}
function productN(p, qty, unit) { return scaleN(per100(p), gramsOf(p, qty, unit) / 100); }
function recipeInfo(r) {
  const tot = {}; let raw = 0;
  for (const it of r.items || []) {
    const p = state.products[it.pid];
    if (!p) continue;
    addN(tot, productN(p, it.qty, 'g'));
    raw += it.qty;
  }
  const weight = r.cooked || raw;
  return { tot, raw, weight, portionW: weight / (r.servings || 1) };
}
function recipeN(r, qty, unit) {
  const { tot, weight } = recipeInfo(r);
  const f = unit === 'portion' ? qty / (r.servings || 1) : (weight ? qty / weight : 0);
  return scaleN(tot, f);
}
function sourceOf(kind, id) { return kind === 'product' ? state.products[id] : kind === 'recipe' ? state.recipes[id] : null; }
function nutrOf(kind, src, qty, unit) { return kind === 'product' ? productN(src, qty, unit) : recipeN(src, qty, unit); }
function qtyLabel(kind, src, qty, unit) {
  if (kind === 'quick') return '';
  if (unit === 'portion') return `${fmt(qty, 2)} ${qty === 1 ? 'porzione' : 'porzioni'}`;
  if (unit === 'g') return `${fmt(qty, 1)} ${kind === 'product' && src ? unitOf(src) : 'g'}`;
  const s = src && (src.servings || []).find((x) => x.id === unit);
  return s ? `${fmt(qty, 2)} × ${s.name}` : fmt(qty, 2);
}

function dayType(d) {
  const g = state.goals;
  const id = state.dayOverride[d] || (g.mode === 'week' ? g.week[weekday(d)] : g.fixed);
  return g.dayTypes.find((t) => t.id === id) || g.dayTypes[0];
}
function dayTotals(d) { const t = {}; for (const e of state.diary[d] || []) addN(t, e.n); return t; }
function latestWeight() {
  const w = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  return w.length ? w[w.length - 1] : null;
}
function guessMeal() {
  const h = new Date().getHours();
  const m = state.settings.meals;
  if (!m.length) return null;
  const idx = h < 11 ? 0 : h < 15 ? 1 : h < 19 ? Math.min(2, m.length - 1) : m.length - 1;
  return m[Math.min(idx, m.length - 1)].id;
}

/* ---------- router ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const parts = (path || 'oggi').split('/');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { route: parts[0] || 'oggi', id: parts[1], params };
}
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

const SCREENS = {};
const NAV_ROUTES = ['oggi', 'dispensa', 'progressi', 'obiettivi'];

function render() {
  const { route, id, params } = parseHash();
  const scr = SCREENS[route] || SCREENS.oggi;
  if (route !== 'prodotto') ui.pDraft = null;
  if (route !== 'ricetta' && route !== 'prodotto') ui.rDraft = null;
  closeSheet(true);
  const app = $('#app');
  app.innerHTML = scr(id, params);
  const hasNav = NAV_ROUTES.includes(route) || !SCREENS[route];
  app.classList.toggle('no-nav', !hasNav);
  renderNav(hasNav ? (SCREENS[route] ? route : 'oggi') : null);
  if (scr.after) scr.after(id, params);
  document.documentElement.dataset.theme = state.settings.theme || 'auto';
}
function renderNav(active) {
  const nav = $('#nav');
  if (!active) { nav.hidden = true; return; }
  nav.hidden = false;
  const a = (r, icon, label) => `<a href="#/${r}" ${active === r ? 'aria-current="page"' : ''}>${ic(icon, 24)}${label}</a>`;
  nav.innerHTML = a('oggi', 'cal', 'Diario') + a('dispensa', 'basket', 'Dispensa') +
    `<a class="fab" href="#/aggiungi" aria-label="Aggiungi alimento">${ic('plus', 26, 2.4)}</a>` +
    a('progressi', 'chart', 'Progressi') + a('obiettivi', 'sliders', 'Obiettivi');
}
window.addEventListener('hashchange', render);

/* ---------- toast / sheet ---------- */
let toastTimer;
function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button data-act="toastAction">${esc(action.label)}</button>` : '');
  t.hidden = false;
  toast.action = action;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, action ? 5000 : 2200);
}
function openSheet(html, ctx) {
  ui.sheet = ctx || {};
  const s = $('#sheet');
  s.innerHTML = '<div class="grip"></div>' + html;
  s.hidden = false; $('#scrim').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSheet(silent) {
  ui.sheet = null;
  $('#sheet').hidden = true; $('#scrim').hidden = true;
  $('#sheet').innerHTML = '';
  document.body.style.overflow = '';
}
$('#scrim').addEventListener('click', () => closeSheet());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.sheet) closeSheet(); });

/* ================================================================
   SCHERMATA: DIARIO (OGGI)
   ================================================================ */
SCREENS.oggi = function () {
  const d = ui.date;
  const dt = dayType(d);
  const tot = dayTotals(d);
  const S = state.settings;
  const t = today();
  const title = d === t ? 'Oggi' : d === addDays(t, -1) ? 'Ieri' : d === addDays(t, 1) ? 'Domani' : cap(toDate(d).toLocaleDateString('it-IT', { weekday: 'long' }));
  let h = `
  <header class="header">
    <div class="stack" style="gap:2px">
      <span class="eyebrow">${esc(cap(longDate(d)))}</span>
      <div class="row" style="gap:2px">
        <button class="icon-btn" data-act="dayPrev" aria-label="Giorno precedente" style="margin-left:-12px">${ic('left')}</button>
        <h1 ${d !== t ? 'data-act="dayToday" role="button" tabindex="0" title="Torna a oggi"' : ''}>${esc(title)}</h1>
        <button class="icon-btn" data-act="dayNext" aria-label="Giorno successivo">${ic('right')}</button>
      </div>
    </div>
    <div class="row" style="gap:4px">
      ${state.goals.dayTypes.length > 1 ? `<button class="chip green" data-act="cycleDayType" aria-label="Tipo di giornata: ${esc(dt.name)}. Tocca per cambiare">${esc(dt.name)}${state.dayOverride[d] ? ' •' : ''}</button>` : ''}
      <a class="icon-btn" href="#/personalizza" aria-label="Personalizza">${ic('gear')}</a>
    </div>
  </header>`;

  if (!state.welcomeDone && !Object.keys(state.products).length) {
    h += `<section class="card stack">
      <h2>Benvenuto in Bilancino</h2>
      <p class="muted" style="margin:0">Un diario alimentare tutto tuo: inserisci i prodotti con i valori dell'etichetta, crea ricette, salva la spesa ricorrente. I dati restano su questo telefono.</p>
      <div class="grid2">
        <a class="btn soft sm" href="#/obiettivi">Imposta obiettivi</a>
        <a class="btn soft sm" href="#/prodotto/new?ret=${encodeURIComponent('#/oggi')}">Primo prodotto</a>
      </div>
      <div class="between"><button class="link" data-act="loadExamples">Carica alimenti di esempio</button><button class="link" data-act="welcomeDone" style="color:var(--muted)">Nascondi</button></div>
    </section>`;
  }

  const eaten = tot.kcal || 0;
  if (S.home.ring) {
    const goal = dt.kcal || 0;
    const C = 2 * Math.PI * 56;
    const pct = goal ? clamp(eaten / goal, 0, 1) : 0;
    const over = goal && eaten > goal;
    const rem = goal - eaten;
    h += `<section class="card ring-card" aria-label="Calorie">
      <div class="ring">
        <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="${fmt(eaten)} kcal su ${fmt(goal)}">
          <circle cx="66" cy="66" r="56" fill="none" stroke="var(--track)" stroke-width="12"/>
          ${pct > 0 ? '' : '<!--'}<circle cx="66" cy="66" r="56" fill="none" stroke="${over ? 'var(--warn)' : 'var(--accent)'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 66 66)"/>${pct > 0 ? '' : '-->'}
        </svg>
        <div class="c">${S.showRemaining
          ? `<span class="big ${over ? 'over' : ''}">${fmt(Math.abs(rem))}</span><span class="small muted">${over ? 'kcal in più' : 'kcal rimaste'}</span>`
          : `<span class="big">${fmt(eaten)}</span><span class="small muted">kcal</span>`}</div>
      </div>
      <div class="stack grow" style="gap:10px">
        <div class="kv"><span>Obiettivo</span><strong>${fmt(goal)}</strong></div>
        <div class="kv"><span>Mangiate</span><strong>${fmt(eaten)}</strong></div>
        <div class="kv"><span>Rimaste</span><strong class="${over ? 'over' : ''}">${fmt(rem)}</strong></div>
      </div>
    </section>`;
  }
  if (S.home.macros) {
    h += `<section class="card grid3" aria-label="Macronutrienti">` + MACROS.map((m) => {
      const v = tot[m.k] || 0, g = dt[m.k] || 0;
      const over = g && v > g * 1.05;
      const rem = g - v;
      return `<div class="macro">
        <span class="l">${m.name}</span>
        <span class="v">${fmt(v)}<small> / ${fmt(g)} g</small></span>
        <div class="bar"><i style="width:${g ? clamp(v / g * 100, 0, 100) : 0}%;background:${m.color}"></i></div>
        ${S.showRemaining && g ? `<span class="small ${over ? 'over' : 'muted'}">${rem >= 0 ? `mancano ${fmt(rem)} g` : `+${fmt(-rem)} g`}</span>` : ''}
      </div>`;
    }).join('') + `</section>`;
  }
  const visN = S.nutrients.filter((n) => n.visible);
  if (S.home.nutrients && visN.length) {
    h += `<section class="card" aria-label="Altri nutrienti"><div class="grid3">` + visN.map((n) => {
      const v = tot[n.id] || 0, g = dt.extra && dt.extra[n.id];
      return `<div class="macro"><span class="l ellipsis">${esc(n.name)}</span><span class="v">${fmt(v, n.unit === 'g' && v < 10 ? 1 : 0)}<small>${g ? ` / ${fmt(g)}` : ''} ${esc(n.unit)}</small></span>${g ? `<div class="bar"><i style="width:${clamp(v / g * 100, 0, 100)}%;background:var(--accent)"></i></div>` : ''}</div>`;
    }).join('') + `</div></section>`;
  }
  if (S.home.weight) {
    const w = state.weights.find((x) => x.date === d);
    h += `<section class="card between" aria-label="Peso del giorno">
      <span style="font-weight:600">Peso</span>
      ${w ? `<span class="row"><strong class="num" style="font-size:18px">${fmt(w.kg, 1)} kg</strong><a class="link" href="#/progressi">Grafico</a></span>`
        : `<span class="row"><label class="sr" for="qw">Peso in kg</label><input id="qw" class="input" inputmode="decimal" placeholder="kg" style="width:90px;height:40px"><button class="btn sm" data-act="quickWeight">Salva</button></span>`}
    </section>`;
  }

  // pasti
  const entries = state.diary[d] || [];
  const yest = state.diary[addDays(d, -1)] || [];
  for (const m of S.meals) {
    const list = entries.filter((e) => e.meal === m.id);
    const kc = list.reduce((s, e) => s + (e.n.kcal || 0), 0);
    const addHref = `#/aggiungi?meal=${encodeURIComponent(m.id)}`;
    if (!list.length) {
      const canCopy = yest.some((e) => e.meal === m.id);
      h += `<section class="card dashed between" style="padding:10px 10px 10px 16px">
        <h2>${esc(m.name)}</h2>
        <span class="row" style="gap:2px">
          ${canCopy ? `<button class="btn plain sm" data-act="copyMeal" data-meal="${esc(m.id)}">${ic('copy', 16)} Come ieri</button>` : ''}
          <a class="btn plain sm" href="${addHref}">+ Aggiungi</a>
        </span>
      </section>`;
      continue;
    }
    const mt = {}; list.forEach((e) => addN(mt, e.n));
    h += `<section class="card" style="padding:12px 16px 6px">
      <div class="meal-head">
        <div class="stack" style="gap:0"><h2>${esc(m.name)}</h2><span class="small muted">P ${fmt(mt.p || 0)} · C ${fmt(mt.c || 0)} · G ${fmt(mt.f || 0)}</span></div>
        <span class="row" style="gap:4px"><span class="small muted" style="font-weight:600">${fmt(kc)} kcal</span>
        <a class="icon-btn" href="${addHref}" aria-label="Aggiungi a ${esc(m.name)}" style="color:var(--accent);margin-right:-10px">${ic('plus', 22, 2.2)}</a></span>
      </div>
      ${list.map((e) => `<button class="entry" data-act="editEntry" data-id="${e.id}">
        <span class="grow"><span class="t">${esc(e.label)}</span>${e.kind === 'recipe' ? ' <span class="tag">RICETTA</span>' : ''}<br><span class="small muted">${esc(qtyLabel(e.kind, sourceOf(e.kind, e.ref), e.qty, e.unit))}</span></span>
        <span class="k">${fmt(e.n.kcal)} kcal</span></button>`).join('')}
    </section>`;
  }
  if (!S.meals.length) h += `<div class="empty"><strong>Nessun pasto</strong>Aggiungine uno in <a href="#/personalizza">Personalizza</a>.</div>`;
  return h;
};

/* ================================================================
   SCHERMATA: AGGIUNGI
   ================================================================ */
SCREENS.aggiungi = function (id, params) {
  if (params.meal) ui.meal = params.meal;
  if (!ui.meal || !state.settings.meals.some((m) => m.id === ui.meal)) ui.meal = guessMeal();
  if (params.tab) ui.addTab = params.tab;
  const tabs = [['recenti', 'Recenti'], ['prodotti', 'Prodotti'], ['ricette', 'Ricette'], ['dispensa', 'Dispensa']];
  return `
  <header class="topbar">
    <a class="icon-btn" href="#/oggi" aria-label="Indietro" style="margin-left:-12px">${ic('back', 24)}</a>
    <h1 class="grow">Aggiungi</h1>
    <label class="sr" for="mealSel">Pasto</label>
    <select id="mealSel" class="input" data-ch="meal" style="width:auto;height:40px;font-weight:700;color:var(--accent)">
      ${state.settings.meals.map((m) => `<option value="${esc(m.id)}" ${m.id === ui.meal ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
    </select>
  </header>
  <div class="small muted" style="margin-top:-8px">${esc(cap(longDate(ui.date)))}</div>
  <label class="search">${ic('search', 20)}<span class="sr">Cerca</span>
    <input type="search" id="q" data-in="search" placeholder="Cerca prodotti e ricette…" value="${esc(ui.q)}" autocomplete="off"></label>
  <div class="seg" role="group" aria-label="Elenco">
    ${tabs.map(([k, l]) => `<button data-act="addTab" data-tab="${k}" aria-pressed="${ui.addTab === k}">${l}</button>`).join('')}
  </div>
  <div class="grid3">
    <a class="btn soft sm" href="#/prodotto/new?ret=add">+ Prodotto</a>
    <a class="btn soft sm" href="#/ricetta/new">+ Ricetta</a>
    <button class="btn soft sm" data-act="quickKcal">${ic('bolt', 16)} Rapido</button>
  </div>
  <div id="addList">${renderAddList()}</div>`;
};
SCREENS.aggiungi.after = function (id, params) {
  if (params.open) {
    const [k, rid] = params.open.split(':');
    history.replaceState(null, '', '#/aggiungi');
    if (k === 'p' && state.products[rid]) openQtySheet('product', rid);
    if (k === 'r' && state.recipes[rid]) openQtySheet('recipe', rid);
  }
};

function allItems() {
  const ps = Object.values(state.products).map((p) => ({ kind: 'product', src: p }));
  const rs = Object.values(state.recipes).map((r) => ({ kind: 'recipe', src: r }));
  return ps.concat(rs);
}
function matches(src, q) {
  if (!q) return true;
  const hay = norm([src.name, src.brand, (src.tags || []).join(' ')].join(' '));
  return norm(q).split(/\s+/).every((w) => hay.includes(w));
}
function renderAddList() {
  const q = ui.q.trim();
  let items = allItems();
  const tab = ui.addTab;
  if (tab === 'prodotti') items = items.filter((i) => i.kind === 'product');
  if (tab === 'ricette') items = items.filter((i) => i.kind === 'recipe');
  if (tab === 'dispensa') items = items.filter((i) => i.kind === 'product' && i.src.pantry && i.src.pantry.on);
  if (tab === 'recenti' && !q) items = items.filter((i) => i.src.lastUsed).sort((a, b) => b.src.lastUsed - a.src.lastUsed).slice(0, 40);
  else items = items.filter((i) => matches(i.src, q)).sort((a, b) => (b.src.uses || 0) - (a.src.uses || 0) || a.src.name.localeCompare(b.src.name, 'it'));
  if (!items.length) {
    if (tab === 'recenti' && !q) return `<div class="empty"><strong>Nessun alimento recente</strong>Crea un prodotto o una ricetta: comparirà qui dopo il primo utilizzo.</div>`;
    return `<div class="empty"><strong>Nessun risultato</strong>${q ? `<a href="#/prodotto/new?ret=add&name=${encodeURIComponent(q)}">Crea “${esc(q)}”</a>` : 'Ancora vuoto.'}</div>`;
  }
  return `<ul class="list">` + items.map(({ kind, src }) => {
    let sub, n;
    if (kind === 'product') {
      n = per100(src);
      sub = `${src.brand ? esc(src.brand) + ' · ' : ''}100 ${unitOf(src)} · ${fmt(n.kcal)} kcal`;
    } else {
      const inf = recipeInfo(src);
      n = scaleN(inf.tot, 1 / (src.servings || 1));
      sub = `Ricetta · porzione ${fmt(inf.portionW)} g · ${fmt(n.kcal)} kcal`;
    }
    return `<li><div class="li">
      <button class="grow" data-act="openQty" data-kind="${kind}" data-id="${src.id}" style="background:none;border:0;text-align:left;padding:0;display:flex;flex-direction:column;gap:2px;min-width:0">
        <span class="t ellipsis">${esc(src.name)} ${kind === 'recipe' ? '<span class="tag">RICETTA</span>' : ''}</span>
        <span class="s ellipsis">${sub}</span>
        <span class="m">P ${fmt(n.p, 1)} · C ${fmt(n.c, 1)} · G ${fmt(n.f, 1)}</span>
      </button>
      <button class="icon-btn soft" data-act="openQty" data-kind="${kind}" data-id="${src.id}" aria-label="Aggiungi ${esc(src.name)}">${ic('plus', 20, 2.2)}</button>
    </div></li>`;
  }).join('') + `</ul>`;
}

/* ---------- sheet quantità ---------- */
function openQtySheet(kind, id, entry) {
  const src = sourceOf(kind, id);
  if (!src) return;
  let qty, unit;
  if (entry) { qty = entry.qty; unit = entry.unit; }
  else if (src.lastUnit && (src.lastUnit === 'g' || src.lastUnit === 'portion' || (src.servings || []).some((s) => s.id === src.lastUnit))) { qty = src.lastQty; unit = src.lastUnit; }
  else if (kind === 'recipe') { qty = 1; unit = 'portion'; }
  else { qty = 100; unit = 'g'; }
  const ctx = { type: 'qty', kind, id, qty, unit, entryId: entry ? entry.id : null, meal: entry ? entry.meal : ui.meal };
  openSheet(qtySheetHtml(ctx), ctx);
}
function unitsFor(kind, src) {
  if (kind === 'recipe') return [['portion', 'porzioni'], ['g', 'grammi']];
  return [['g', unitOf(src) === 'ml' ? 'ml' : 'grammi'], ...(src.servings || []).map((s) => [s.id, `${s.name} (${fmt(s.qty)} ${unitOf(src)})`])];
}
function qtySheetHtml(ctx) {
  const src = sourceOf(ctx.kind, ctx.id);
  const units = unitsFor(ctx.kind, src);
  const editHref = ctx.kind === 'product' ? `#/prodotto/${src.id}` : `#/ricetta/${src.id}`;
  return `
  <div class="between">
    <div class="stack grow" style="gap:2px">
      <h2 style="font-size:21px">${esc(src.name)}</h2>
      <span class="small muted">${ctx.kind === 'recipe' ? `Ricetta · ${fmt(src.servings)} porzioni` : esc(src.brand || (src.basis === 'ml' ? 'valori per 100 ml' : 'valori per 100 g'))}</span>
    </div>
    <a class="link" href="${editHref}">Modifica</a>
  </div>
  <div class="stepper">
    <button class="icon-btn" data-act="qtyStep" data-d="-1" aria-label="Diminuisci">−</button>
    <label class="qty"><span class="sr">Quantità</span><input id="qtyIn" inputmode="decimal" data-in="qty" value="${fmtIn(ctx.qty)}"><span class="muted" id="qtyU" style="font-weight:600">${esc(shortUnit(ctx))}</span></label>
    <button class="icon-btn" data-act="qtyStep" data-d="1" aria-label="Aumenta">+</button>
  </div>
  ${units.length > 1 ? `<div class="chips scroll" role="group" aria-label="Unità">${units.map(([k, l]) => `<button class="chip ${k === ctx.unit ? 'on' : ''}" data-act="qtyUnit" data-u="${esc(k)}">${esc(l)}</button>`).join('')}</div>` : ''}
  <div id="qprev">${qtyPreview(ctx)}</div>
  ${ctx.entryId ? `
    <label class="field"><span>Pasto</span><select class="input" data-ch="sheetMeal">${state.settings.meals.map((m) => `<option value="${esc(m.id)}" ${m.id === ctx.meal ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
    <div class="grid2"><button class="btn danger" data-act="entryDelete">Elimina</button><button class="btn" data-act="qtyConfirm">Salva</button></div>`
    : `<button class="btn block" data-act="qtyConfirm" style="height:54px;font-size:16px">Aggiungi a ${esc(mealName(ctx.meal))}</button>`}`;
}
const mealName = (id) => (state.settings.meals.find((m) => m.id === id) || {}).name || 'pasto';
function shortUnit(ctx) {
  if (ctx.unit === 'g') return ctx.kind === 'product' ? unitOf(sourceOf(ctx.kind, ctx.id)) : 'g';
  if (ctx.unit === 'portion') return 'porz.';
  const s = (sourceOf(ctx.kind, ctx.id).servings || []).find((x) => x.id === ctx.unit);
  return s ? s.name : '';
}
function qtyPreview(ctx) {
  const src = sourceOf(ctx.kind, ctx.id);
  const n = nutrOf(ctx.kind, src, ctx.qty || 0, ctx.unit);
  const dt = dayType(ui.date);
  const tot = dayTotals(ui.date);
  if (ctx.entryId) { const old = (state.diary[ui.date] || []).find((e) => e.id === ctx.entryId); if (old) addN(tot, scaleN(old.n, -1)); }
  const after = (k) => (dt[k] || 0) - (tot[k] || 0) - (n[k] || 0);
  const tile = (v, l, c, d = 0) => `<div class="tile" style="border-top-color:${c}"><strong>${fmt(v, d)}</strong><span>${l}</span></div>`;
  const grams = ctx.kind === 'product' ? gramsOf(src, ctx.qty || 0, ctx.unit) : null;
  return `<div class="grid4">
    ${tile(n.kcal, 'kcal', 'transparent')}
    ${tile(n.p, 'proteine', 'var(--prot)', 1)}
    ${tile(n.c, 'carboidrati', 'var(--carb)', 1)}
    ${tile(n.f, 'grassi', 'var(--fat)', 1)}
  </div>
  <div class="small muted" style="margin-top:10px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
    <span>${grams != null && ctx.unit !== 'g' ? `= ${fmt(grams)} ${unitOf(src)} · ` : ''}poi restano</span>
    <span style="color:var(--ink);font-weight:600">${fmt(after('kcal'))} kcal · P ${fmt(after('p'))} · C ${fmt(after('c'))} · G ${fmt(after('f'))}</span>
  </div>`;
}
function confirmQty() {
  const c = ui.sheet;
  const src = sourceOf(c.kind, c.id);
  if (!c.qty || c.qty <= 0) { toast('Inserisci una quantità'); return; }
  const n = nutrOf(c.kind, src, c.qty, c.unit);
  const day = (state.diary[ui.date] ||= []);
  if (c.entryId) {
    const e = day.find((x) => x.id === c.entryId);
    if (e) Object.assign(e, { qty: c.qty, unit: c.unit, n, meal: c.meal, label: src.name });
  } else {
    day.push({ id: uid(), meal: c.meal, kind: c.kind, ref: c.id, qty: c.qty, unit: c.unit, label: src.name, n });
    src.uses = (src.uses || 0) + 1;
  }
  src.lastUsed = Date.now(); src.lastQty = c.qty; src.lastUnit = c.unit;
  save();
  const wasEdit = !!c.entryId;
  closeSheet();
  if (wasEdit) render();
  else {
    toast(`Aggiunto a ${mealName(c.meal)}`, { label: 'Vai al diario', fn: () => go('#/oggi') });
    const l = $('#addList'); if (l) l.innerHTML = renderAddList();
  }
}

/* sheet per voci "rapide" o senza origine */
function quickSheetHtml(e) {
  const v = (k) => e && e.n[k] != null ? fmtIn(round(e.n[k], 1)) : '';
  return `<h2 style="font-size:21px">${e ? 'Modifica voce' : 'Aggiunta rapida'}</h2>
  <label class="field"><span>Descrizione</span><input class="input" id="qkName" value="${esc(e ? e.label : '')}" placeholder="Es. pizza al ristorante"></label>
  <div class="grid2">
    <label class="field"><span>Kcal</span><input class="input" id="qkK" inputmode="decimal" value="${v('kcal')}"></label>
    <label class="field"><span>Proteine (g)</span><input class="input" id="qkP" inputmode="decimal" value="${v('p')}"></label>
    <label class="field"><span>Carboidrati (g)</span><input class="input" id="qkC" inputmode="decimal" value="${v('c')}"></label>
    <label class="field"><span>Grassi (g)</span><input class="input" id="qkF" inputmode="decimal" value="${v('f')}"></label>
  </div>
  <label class="field"><span>Pasto</span><select class="input" id="qkMeal">${state.settings.meals.map((m) => `<option value="${esc(m.id)}" ${m.id === (e ? e.meal : ui.meal) ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
  ${e ? `<div class="grid2"><button class="btn danger" data-act="entryDelete">Elimina</button><button class="btn" data-act="quickSave">Salva</button></div>`
      : `<button class="btn block" data-act="quickSave">Aggiungi</button>`}`;
}
function saveQuick() {
  const c = ui.sheet;
  const n = { kcal: num($('#qkK').value), p: num($('#qkP').value), c: num($('#qkC').value), f: num($('#qkF').value) };
  for (const k in n) if (n[k] == null) delete n[k];
  if (n.kcal == null) n.kcal = kcalFrom(n);
  const label = $('#qkName').value.trim() || 'Aggiunta rapida';
  const meal = $('#qkMeal').value;
  const day = (state.diary[ui.date] ||= []);
  if (c.entryId) {
    const e = day.find((x) => x.id === c.entryId);
    if (e) Object.assign(e, { label, n, meal });
  } else day.push({ id: uid(), meal, kind: 'quick', ref: null, qty: 1, unit: 'quick', label, n });
  save(); closeSheet();
  if (parseHash().route === 'oggi') render(); else toast(`Aggiunto a ${mealName(meal)}`);
}

/* modifica voce del diario */
function editEntry(id) {
  const e = (state.diary[ui.date] || []).find((x) => x.id === id);
  if (!e) return;
  const src = sourceOf(e.kind, e.ref);
  if (e.kind === 'quick' || !src) { openSheet(quickSheetHtml(e), { type: 'quick', entryId: e.id }); return; }
  openQtySheet(e.kind, e.ref, e);
}

/* ================================================================
   SCHERMATA: PRODOTTO (crea/modifica)
   ================================================================ */
function newProduct(name) {
  return { id: null, name: name || '', brand: '', basis: 'g', per100: {}, autoKcal: true, servings: [], tags: [], notes: '',
    pantry: { on: false, freq: 'settimana', aisle: '', pack: '', inList: false } };
}
SCREENS.prodotto = function (id, params) {
  if (!ui.pDraft || ui.pDraft._for !== id) {
    const base = id && id !== 'new' && state.products[id] ? JSON.parse(JSON.stringify(state.products[id])) : newProduct(params.name);
    if (!base.id && params.pantry) base.pantry.on = true;
    base._for = id;
    ui.pDraft = base;
  }
  const p = ui.pDraft;
  const S = state.settings;
  const nrow = (k, label, unit, opts = {}) => `<label class="formrow ${opts.sub ? 'sub' : ''}">
      <span class="lbl">${opts.color ? `<span class="dot" style="background:${opts.color}"></span>` : ''}${esc(label)}${opts.custom ? ' <span class="small muted" style="font-weight:500">pers.</span>' : ''}</span>
      <span class="row" style="gap:6px">${opts.extra || ''}<input class="n" inputmode="decimal" data-in="pn" data-k="${k}" id="pn-${k}" value="${fmtIn(k === 'kcal' && p.autoKcal ? round(kcalFrom(p.per100), 0) : p.per100[k])}" ${opts.ro ? 'readonly aria-readonly="true" style="color:var(--muted)"' : ''} placeholder="0"><span class="u">${esc(unit)}</span></span></label>`;
  const sub = (parent) => S.nutrients.filter((n) => n.parent === parent).map((n) => nrow(n.id, n.name, n.unit, { sub: true })).join('');
  const others = S.nutrients.filter((n) => !n.parent).map((n) => nrow(n.id, n.name, n.unit, { custom: !n.builtin })).join('');
  const ret = params.ret || '';
  return `
  <header class="between">
    <button class="link" data-act="pCancel">Annulla</button>
    <h2>${p.id ? 'Modifica prodotto' : 'Nuovo prodotto'}</h2>
    <button class="link" data-act="pSave" data-ret="${esc(ret)}" style="font-weight:700">Salva</button>
  </header>
  <div class="card pad0">
    <label class="field" style="padding:10px 14px;border-bottom:1px solid var(--line-2)"><span>Nome</span>
      <input data-in="pf" data-k="name" value="${esc(p.name)}" placeholder="Es. Yogurt greco 0%" style="border:0;outline:none;padding:0;font-weight:600;font-size:16px;background:transparent"></label>
    <label class="field" style="padding:10px 14px"><span>Marca (facoltativa)</span>
      <input data-in="pf" data-k="brand" value="${esc(p.brand)}" style="border:0;outline:none;padding:0;font-size:16px;background:transparent"></label>
  </div>
  <div class="between">
    <h2>Valori nutrizionali</h2>
    <div class="seg" role="group" aria-label="Valori riferiti a" style="width:150px">
      <button data-act="pBasis" data-b="g" aria-pressed="${p.basis !== 'ml'}">100 g</button>
      <button data-act="pBasis" data-b="ml" aria-pressed="${p.basis === 'ml'}">100 ml</button>
    </div>
  </div>
  <div class="card pad0">
    ${nrow('kcal', 'Energia', 'kcal', { ro: p.autoKcal, extra: `<label class="row small" style="gap:4px;font-weight:600;color:var(--accent-ink)"><input type="checkbox" class="check" style="width:18px;height:18px" data-ch="pAuto" ${p.autoKcal ? 'checked' : ''}>auto</label>` })}
    ${nrow('p', 'Proteine', 'g', { color: 'var(--prot)' })}
    ${nrow('c', 'Carboidrati', 'g', { color: 'var(--carb)' })}
    ${sub('c')}
    ${nrow('f', 'Grassi', 'g', { color: 'var(--fat)' })}
    ${sub('f')}
    ${others}
    <div class="formrow"><button class="link" data-act="nutrNew">+ Aggiungi nutriente</button></div>
  </div>
  <p class="small muted" style="margin:-6px 4px 0">“auto” calcola le kcal dai macro (4·P + 4·C + 9·G + 2·fibre). Toglilo per copiare il valore dell'etichetta.</p>

  <h2>Porzioni</h2>
  <div class="chips">
    ${p.servings.map((s, i) => `<span class="chip">${esc(s.name)} = ${fmt(s.qty)} ${unitOf(p)}<button class="icon-btn" data-act="pServDel" data-i="${i}" aria-label="Rimuovi porzione ${esc(s.name)}" style="width:28px;height:28px;margin-right:-8px">${ic('x', 14)}</button></span>`).join('')}
  </div>
  <div class="row">
    <label class="field grow"><span>Nome porzione</span><input class="input" id="svName" placeholder="vasetto, fetta, cucchiaio…"></label>
    <label class="field" style="width:90px"><span>${unitOf(p)}</span><input class="input" id="svQty" inputmode="decimal" placeholder="150"></label>
    <button class="btn soft" data-act="pServAdd" style="align-self:flex-end">Aggiungi</button>
  </div>

  <h2>Dispensa e spesa</h2>
  <div class="card stack">
    <label class="row" style="font-weight:600"><input type="checkbox" class="check" data-ch="pPantry" ${p.pantry.on ? 'checked' : ''}>Lo compro regolarmente</label>
    ${p.pantry.on ? `<div class="grid2">
      <label class="field"><span>Ogni quanto</span><select class="input" data-ch="pPf" data-k="freq">
        ${FREQS.map(([k, l]) => `<option value="${k}" ${p.pantry.freq === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Confezione</span><input class="input" data-in="pPi" data-k="pack" value="${esc(p.pantry.pack)}" placeholder="es. 4 vasetti"></label>
    </div>
    <label class="field"><span>Reparto</span><input class="input" list="aisles" data-in="pPi" data-k="aisle" value="${esc(p.pantry.aisle)}" placeholder="es. Latticini e uova">
      <datalist id="aisles">${aisleList().map((a) => `<option value="${esc(a)}"></option>`).join('')}</datalist></label>` : ''}
  </div>

  <label class="field"><span>Etichette (separate da virgola)</span><input class="input" data-in="pf" data-k="tagsTxt" value="${esc(p.tagsTxt != null ? p.tagsTxt : (p.tags || []).join(', '))}" placeholder="senza glutine, colazione"></label>
  <label class="field"><span>Note</span><textarea class="input" data-in="pf" data-k="notes" rows="2">${esc(p.notes || '')}</textarea></label>
  ${p.id ? `<button class="btn danger" data-act="pDelete">Elimina prodotto</button>` : ''}
  <div class="footer-bar"><div><button class="btn block" data-act="pSave" data-ret="${esc(ret)}">Salva prodotto</button></div></div>`;
};
const FREQS = [['settimana', 'Ogni settimana'], ['2settimane', 'Ogni 2 settimane'], ['mese', 'Ogni mese'], ['occasionale', 'Ogni tanto']];
const freqLabel = (k) => (FREQS.find((f) => f[0] === k) || [0, ''])[1];
function aisleList() {
  const set = new Set(state.settings.aisles);
  Object.values(state.products).forEach((p) => p.pantry && p.pantry.aisle && set.add(p.pantry.aisle));
  return [...set];
}
function updateAutoKcal() {
  const p = ui.pDraft;
  if (!p || !p.autoKcal) return;
  const el = $('#pn-kcal');
  if (el) el.value = fmtIn(round(kcalFrom(p.per100), 0));
}
function saveProduct(ret) {
  const p = ui.pDraft;
  if (!p.name.trim()) { toast('Dai un nome al prodotto'); return; }
  if (p.autoKcal) p.per100.kcal = round(kcalFrom(p.per100), 1);
  if (p.tagsTxt != null) { p.tags = p.tagsTxt.split(',').map((t) => t.trim()).filter(Boolean); delete p.tagsTxt; }
  const isNew = !p.id;
  if (isNew) { p.id = uid(); p.created = Date.now(); }
  delete p._for;
  state.products[p.id] = p;
  ui.pDraft = null;
  save();
  toast(isNew ? 'Prodotto creato' : 'Prodotto salvato');
  if (ret === 'add') go(`#/aggiungi?open=p:${p.id}`);
  else if (ret === 'recipe' && ui.rDraft) { if (isNew) ui.rDraft.items.push({ pid: p.id, qty: 100 }); go(`#/ricetta/${ui.rDraft._for || 'new'}`); }
  else if (ret) go(ret);
  else history.length > 1 ? history.back() : go('#/aggiungi');
}

/* ================================================================
   SCHERMATA: RICETTA
   ================================================================ */
SCREENS.ricetta = function (id, params) {
  if (!ui.rDraft || ui.rDraft._for !== id) {
    ui.rDraft = id && id !== 'new' && state.recipes[id] ? JSON.parse(JSON.stringify(state.recipes[id])) : { id: null, name: '', items: [], servings: 4, cooked: null, notes: '' };
    ui.rDraft._for = id;
  }
  const r = ui.rDraft;
  return `
  <header class="topbar">
    <button class="icon-btn" data-act="rCancel" aria-label="Indietro" style="margin-left:-12px">${ic('back', 24)}</button>
    <span class="grow small muted" style="font-weight:600">${r.id ? 'Modifica ricetta' : 'Nuova ricetta'}</span>
    ${r.id ? `<button class="icon-btn" data-act="rDelete" aria-label="Elimina ricetta" style="margin-right:-10px;color:var(--warn)">${ic('trash')}</button>` : ''}
  </header>
  <label><span class="sr">Nome ricetta</span><input data-in="rf" data-k="name" value="${esc(r.name)}" placeholder="Nome della ricetta"
    style="width:100%;border:0;border-bottom:2px solid var(--line);outline:none;padding:4px 0 8px;font:700 26px 'Space Grotesk',sans-serif;background:transparent"></label>
  <div id="rsum">${recipeSummary(r)}</div>
  <div class="grid2">
    <div class="card stack" style="padding:10px 12px;gap:6px">
      <span class="small muted" style="font-weight:600">Porzioni</span>
      <div class="between"><button class="icon-btn outline" data-act="rServ" data-d="-1" aria-label="Meno porzioni">−</button>
      <strong class="num" style="font-size:22px" id="rServ">${fmt(r.servings, 1)}</strong>
      <button class="icon-btn outline" data-act="rServ" data-d="1" aria-label="Più porzioni">+</button></div>
    </div>
    <label class="card stack" style="padding:10px 12px;gap:6px">
      <span class="small muted" style="font-weight:600">Peso da cotto (facolt.)</span>
      <span class="row" style="gap:4px;height:44px"><input data-in="rf" data-k="cooked" inputmode="decimal" value="${fmtIn(r.cooked)}" placeholder="–"
        style="width:100%;border:0;outline:none;padding:0;font:700 22px 'Space Grotesk',sans-serif;background:transparent"><span class="muted">g</span></span>
    </label>
  </div>
  <p class="small muted" style="margin:-4px 4px 0">Se pesi la pentola a fine cottura, potrai registrare la ricetta anche in grammi.</p>
  <div class="between"><h2>Ingredienti <span class="muted" style="font-weight:500;font-size:14px">· ${r.items.length}</span></h2></div>
  <ul class="list">
    ${r.items.map((it, i) => {
      const p = state.products[it.pid];
      const n = p ? productN(p, it.qty, 'g') : {};
      return `<li><div class="li" style="padding-right:4px">
        <span class="grow" style="min-width:0"><span class="t ellipsis" style="display:block">${p ? esc(p.name) : '<em>prodotto eliminato</em>'}</span><span class="s" id="rk-${i}">${fmt(n.kcal)} kcal</span></span>
        <label class="row" style="gap:4px"><span class="sr">Quantità</span><input class="input" data-in="rqty" data-i="${i}" inputmode="decimal" value="${fmtIn(it.qty)}" style="width:76px;height:40px;text-align:right"><span class="muted small">${p ? unitOf(p) : 'g'}</span></label>
        <button class="icon-btn" data-act="rDel" data-i="${i}" aria-label="Rimuovi ingrediente">${ic('x', 18)}</button>
      </div></li>`;
    }).join('')}
    <li><button class="li" data-act="rAddIng" style="color:var(--accent);font-weight:600">+ Aggiungi ingrediente</button></li>
  </ul>
  <label class="field"><span>Procedimento / note</span><textarea class="input" data-in="rf" data-k="notes" rows="3">${esc(r.notes || '')}</textarea></label>
  <div class="footer-bar"><div>
    <button class="btn ghost grow" data-act="rSave">Salva</button>
    <button class="btn grow" data-act="rSave" data-log="1">Salva e registra</button>
  </div></div>`;
};
function recipeSummary(r) {
  const inf = recipeInfo(r);
  const n = scaleN(inf.tot, 1 / (r.servings || 1));
  const kc = (n.p || 0) * 4 + (n.c || 0) * 4 + (n.f || 0) * 9 || 1;
  return `<section class="card dark stack" aria-label="Valori per porzione">
    <div class="between" style="align-items:baseline"><span class="small muted" style="font-weight:600">Per porzione · ${fmt(inf.portionW)} g</span>
      <span class="num" style="font-size:26px;font-weight:700">${fmt(n.kcal)} <span class="small muted" style="font-weight:500">kcal</span></span></div>
    <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;gap:2px;background:rgba(127,127,127,.25)">
      ${MACROS.map((m) => `<i style="width:${((n[m.k] || 0) * m.kcal / kc * 100).toFixed(1)}%;background:${m.color}"></i>`).join('')}</div>
    <div class="between small"><span><strong>${fmt(n.p, 1)} g</strong> proteine</span><span><strong>${fmt(n.c, 1)} g</strong> carboidrati</span><span><strong>${fmt(n.f, 1)} g</strong> grassi</span></div>
    <span class="small muted">Totale ${fmt(inf.tot.kcal)} kcal · ${fmt(inf.raw)} g di ingredienti${r.cooked ? ` · ${fmt(r.cooked)} g da cotto` : ''}</span>
  </section>`;
}
function pickerSheetHtml() {
  return `<h2>Aggiungi ingrediente</h2>
  <label class="search">${ic('search', 20)}<span class="sr">Cerca</span><input type="search" data-in="pickSearch" placeholder="Cerca prodotto…" autocomplete="off"></label>
  <div id="pickList">${pickerList('')}</div>
  <button class="btn soft" data-act="pickNew">+ Crea nuovo prodotto</button>`;
}
function pickerList(q) {
  const ps = Object.values(state.products).filter((p) => matches(p, q)).sort((a, b) => (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name, 'it')).slice(0, 60);
  if (!ps.length) return `<div class="empty">Nessun prodotto trovato.</div>`;
  return `<ul class="list">${ps.map((p) => `<li><button class="li" data-act="rPick" data-id="${p.id}"><span class="grow"><span class="t">${esc(p.name)}</span><br><span class="s">${p.brand ? esc(p.brand) + ' · ' : ''}${fmt(per100(p).kcal)} kcal / 100 ${unitOf(p)}</span></span>${ic('plus', 20)}</button></li>`).join('')}</ul>`;
}
function saveRecipe(log) {
  const r = ui.rDraft;
  if (!r.name.trim()) { toast('Dai un nome alla ricetta'); return; }
  if (!r.items.length) { toast('Aggiungi almeno un ingrediente'); return; }
  const isNew = !r.id;
  if (isNew) { r.id = uid(); r.created = Date.now(); }
  delete r._for;
  r.items = r.items.filter((it) => state.products[it.pid] && it.qty > 0);
  state.recipes[r.id] = r;
  ui.rDraft = null;
  save();
  toast('Ricetta salvata');
  if (log) go(`#/aggiungi?open=r:${r.id}`);
  else go('#/aggiungi?tab=ricette');
}

/* ================================================================
   SCHERMATA: DISPENSA + LISTA SPESA
   ================================================================ */
SCREENS.dispensa = function () {
  const all = Object.values(state.products).filter((p) => p.pantry && p.pantry.on);
  const f = ui.pantryFilter;
  const items = f === 'all' ? all : all.filter((p) => p.pantry.freq === f);
  const inList = all.filter((p) => p.pantry.inList).length + state.shopping.extra.length;
  let h = `<header class="header">
    <div class="stack" style="gap:2px"><span class="eyebrow">${all.length} prodotti ricorrenti</span><h1>Dispensa</h1></div>
    <a class="icon-btn outline" href="#/prodotto/new?ret=${encodeURIComponent('#/dispensa')}&pantry=1" aria-label="Nuovo prodotto">${ic('plus')}</a>
  </header>
  <div class="chips scroll">
    <button class="chip ${f === 'all' ? 'on' : ''}" data-act="pFilter" data-f="all">Tutti</button>
    ${FREQS.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="pFilter" data-f="${k}">${l}</button>`).join('')}
  </div>`;
  if (!all.length) {
    h += `<div class="card empty"><strong>La dispensa è vuota</strong>Quando crei o modifichi un prodotto, spunta “Lo compro regolarmente”: comparirà qui, raggruppato per reparto, e potrai metterlo nella lista della spesa con un tocco.</div>`;
  } else {
    const groups = {};
    items.forEach((p) => { const a = p.pantry.aisle || 'Senza reparto'; (groups[a] ||= []).push(p); });
    const order = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'it'));
    if (f !== 'all' && items.length) h += `<button class="btn soft sm" data-act="addFreqToList" data-f="${f}">Metti tutti in lista spesa</button>`;
    for (const a of order) {
      h += `<h3 class="section-label">${esc(a)}</h3><ul class="list">` + groups[a].sort((x, y) => x.name.localeCompare(y.name, 'it')).map((p) => `<li><div class="li" style="padding:6px 8px 6px 14px">
        <input type="checkbox" class="check" data-ch="inList" data-id="${p.id}" ${p.pantry.inList ? 'checked' : ''} aria-label="${esc(p.name)} nella lista spesa">
        <a href="#/prodotto/${p.id}?ret=${encodeURIComponent('#/dispensa')}" class="grow" style="text-decoration:none;color:inherit;min-width:0"><span class="t ellipsis" style="display:block">${esc(p.name)}${p.brand ? ` · <span class="muted" style="font-weight:500">${esc(p.brand)}</span>` : ''}</span>
          <span class="s">${[p.pantry.pack, freqLabel(p.pantry.freq)].filter(Boolean).map(esc).join(' · ')}</span></a>
        <a class="icon-btn soft" href="#/aggiungi?open=p:${p.id}" aria-label="Registra ${esc(p.name)} nel diario">${ic('plus', 20, 2.2)}</a>
      </div></li>`).join('') + `</ul>`;
    }
    if (!items.length) h += `<div class="empty">Nessun prodotto con questa frequenza.</div>`;
  }
  h += `<div style="height:70px"></div><div class="floating"><a class="card dark between" href="#/spesa" style="text-decoration:none;padding:12px 12px 12px 16px;box-shadow:var(--shadow)">
    <span class="stack" style="gap:0"><strong>Lista della spesa · ${inList}</strong><span class="small muted">Spunta mentre compri</span></span>
    <span class="btn sm" style="background:var(--on-dark);color:var(--dark)">Apri</span></a></div>`;
  return h;
};
SCREENS.spesa = function () {
  const ps = Object.values(state.products).filter((p) => p.pantry && p.pantry.on && p.pantry.inList);
  const ch = state.shopping.checked;
  const groups = {};
  ps.forEach((p) => { const a = p.pantry.aisle || 'Senza reparto'; (groups[a] ||= []).push(p); });
  const nChecked = ps.filter((p) => ch[p.id]).length + state.shopping.extra.filter((e) => e.checked).length;
  let h = `<header class="topbar">
    <a class="icon-btn" href="#/dispensa" aria-label="Indietro" style="margin-left:-12px">${ic('back', 24)}</a>
    <h1 class="grow">Lista della spesa</h1>
  </header>
  <div class="row"><label class="sr" for="extraIn">Aggiungi voce libera</label><input id="extraIn" class="input grow" placeholder="Aggiungi voce libera (es. detersivo)"><button class="btn soft" data-act="extraAdd">Aggiungi</button></div>`;
  if (!ps.length && !state.shopping.extra.length) h += `<div class="card empty"><strong>Lista vuota</strong>Spunta i prodotti nella dispensa per aggiungerli qui.</div>`;
  for (const a of Object.keys(groups).sort((x, y) => x.localeCompare(y, 'it'))) {
    h += `<h3 class="section-label">${esc(a)}</h3><ul class="list">` + groups[a].map((p) => `<li><label class="li">
      <input type="checkbox" class="check" data-ch="shopCheck" data-id="${p.id}" ${ch[p.id] ? 'checked' : ''}>
      <span class="grow" style="${ch[p.id] ? 'text-decoration:line-through;color:var(--muted)' : ''}"><span class="t">${esc(p.name)}</span>${p.pantry.pack ? `<br><span class="s">${esc(p.pantry.pack)}</span>` : ''}</span></label></li>`).join('') + `</ul>`;
  }
  if (state.shopping.extra.length) {
    h += `<h3 class="section-label">Altro</h3><ul class="list">` + state.shopping.extra.map((e) => `<li><div class="li">
      <input type="checkbox" class="check" data-ch="extraCheck" data-id="${e.id}" ${e.checked ? 'checked' : ''} aria-label="${esc(e.name)}">
      <span class="grow t" style="${e.checked ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(e.name)}</span>
      <button class="icon-btn" data-act="extraDel" data-id="${e.id}" aria-label="Rimuovi">${ic('x', 18)}</button></div></li>`).join('') + `</ul>`;
  }
  h += `<div class="footer-bar"><div><button class="btn block" data-act="shopDone" ${nChecked ? '' : 'disabled'}>Fine spesa · togli ${nChecked} presi</button></div></div>`;
  return h;
};

/* ================================================================
   SCHERMATA: OBIETTIVI
   ================================================================ */
function estimateHtml() {
  const g = state.goals; const lw = latestWeight();
  if (!lw || !g.target) return '';
  const diff = g.target - lw.kg;
  let est;
  if (Math.abs(diff) <= 0.05) est = 'Obiettivo raggiunto!';
  else if (!g.rate) est = `Mancano ${fmt(Math.abs(diff), 1)} kg: scegli un ritmo per la stima.`;
  else if (Math.sign(diff) === Math.sign(g.rate)) {
    const weeks = Math.abs(diff / g.rate);
    const d = addDays(today(), Math.round(weeks * 7));
    est = `Arrivo stimato: <strong>${toDate(d).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</strong> (${fmt(weeks)} settimane) · ${g.rate < 0 ? 'deficit' : 'surplus'} medio circa ${fmt(Math.abs(g.rate) * 7700 / 7)} kcal/giorno`;
  } else est = 'Il ritmo va nella direzione opposta all’obiettivo.';
  return `<div class="small" style="background:var(--bg);border-radius:10px;padding:8px 10px">${est}</div>`;
}
SCREENS.obiettivi = function () {
  const g = state.goals;
  const lw = latestWeight();
  const t = today();
  const rates = [-1, -0.75, -0.5, -0.4, -0.25, 0, 0.25, 0.5];
  let h = `<header class="header"><h1>Obiettivi</h1><a class="btn plain sm" href="#/personalizza">${ic('gear', 18)} Personalizza</a></header>
  <section class="card stack" aria-label="Peso">
    <h2>Peso</h2>
    <div class="grid2">
      <div class="stack" style="gap:0"><span class="small muted">Attuale</span><strong class="num" style="font-size:24px">${lw ? fmt(lw.kg, 1) + ' kg' : '–'}</strong>
        <a class="small" href="#/progressi">${lw ? 'del ' + shortDate(lw.date) : 'Registra il peso'}</a></div>
      <label class="field"><span>Obiettivo (kg)</span><input class="input" inputmode="decimal" data-ch="gTarget" value="${fmtIn(g.target)}" placeholder="es. 74"></label>
    </div>
    <label class="field"><span>Ritmo</span><select class="input" data-ch="gRate">
      ${rates.map((r) => `<option value="${r}" ${g.rate === r ? 'selected' : ''}>${r === 0 ? 'Mantenimento' : `${r > 0 ? '+' : '−'}${fmt(Math.abs(r), 2)} kg a settimana`}</option>`).join('')}</select></label>
    <div id="gEst">${estimateHtml()}</div>
    <p class="small muted" style="margin:0">La stima usa circa 7.700 kcal per kg ed è solo indicativa: le calorie le decidi tu qui sotto.</p>
  </section>

  <section class="card stack" aria-label="Calorie e macro">
    <div class="between"><h2>Calorie e macro</h2>
      <div class="seg" role="group" aria-label="Modalità" style="width:190px">
        <button data-act="gMode" data-m="fixed" aria-pressed="${g.mode !== 'week'}">Sempre uguali</button>
        <button data-act="gMode" data-m="week" aria-pressed="${g.mode === 'week'}">Per giorno</button>
      </div></div>
    ${g.mode === 'week' ? `<span class="small muted">Tocca un giorno per cambiare tipo. Nel diario puoi anche cambiarlo solo per una data.</span>
      <div class="week">${WD1.map((l, i) => { const k = Math.max(0, g.dayTypes.findIndex((x) => x.id === g.week[i])); const dt = g.dayTypes[k]; const c = dtColor(k); return `<button data-act="weekCycle" data-i="${i}" class="${weekday(t) === i ? 'today' : ''}" aria-label="${WD[i]}: ${esc(dt.name)}" style="background:${c.bg};color:${c.fg};border-color:${c.bd}">${l}<span style="color:inherit;opacity:.85">${esc(dt.name.slice(0, 3))}</span></button>`; }).join('')}</div>
      <div class="chips">${g.dayTypes.map((d, k) => { const c = dtColor(k); return `<span class="chip" style="background:${c.bg};color:${c.fg};border-color:${c.bd};height:30px">${esc(d.name)}</span>`; }).join('')}</div>`
    : g.dayTypes.length > 1 ? `<label class="field"><span>Tipo di giornata usato</span><select class="input" data-ch="gFixed">${g.dayTypes.map((d) => `<option value="${d.id}" ${g.fixed === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>` : ''}
  </section>
  ${g.dayTypes.map((d) => dayTypeCard(d)).join('')}
  <button class="btn soft" data-act="dtAdd">+ Nuovo tipo di giornata</button>`;
  return h;
};
function dtColor(k) {
  const pal = [
    { bg: 'var(--card)', fg: 'var(--ink)', bd: 'var(--field)' },
    { bg: 'var(--accent)', fg: 'var(--on-accent)', bd: 'var(--accent)' },
    { bg: 'var(--prot)', fg: '#fff', bd: 'var(--prot)' },
    { bg: 'var(--fat)', fg: '#fff', bd: 'var(--fat)' },
    { bg: 'var(--carb)', fg: '#17201B', bd: 'var(--carb)' },
  ];
  return pal[k % pal.length];
}
function dayTypeInfo(d) {
  const mk = 4 * (d.p || 0) + 4 * (d.c || 0) + 9 * (d.f || 0);
  const lw = latestWeight();
  const pct = (k, m) => (mk ? Math.round((d[k] || 0) * m / mk * 100) : 0);
  const diff = Math.round(mk - (d.kcal || 0));
  return `<div class="small muted">Ripartizione: P ${pct('p', 4)}% · C ${pct('c', 4)}% · G ${pct('f', 9)}%${lw ? ` · proteine ${fmt((d.p || 0) / lw.kg, 1)} g/kg` : ''}</div>
    ${Math.abs(diff) > 20 ? `<div class="between small" style="background:var(--bg);border-radius:10px;padding:6px 6px 6px 10px;margin-top:8px">
      <span>Dai macro risultano <strong>${fmt(mk)} kcal</strong> (${diff > 0 ? '+' : ''}${fmt(diff)})</span>
      <button class="btn plain sm" data-act="dtKcalFromMacro" data-id="${d.id}">Usa questo</button></div>` : ''}`;
}
function dayTypeCard(d) {
  const visN = state.settings.nutrients.filter((n) => n.visible);
  return `<section class="card stack" aria-label="${esc(d.name)}">
    <div class="row"><label class="grow"><span class="sr">Nome</span><input class="input" data-ch="dtF" data-id="${d.id}" data-k="name" value="${esc(d.name)}" style="font-weight:700"></label>
      ${state.goals.dayTypes.length > 1 ? `<button class="icon-btn" data-act="dtDel" data-id="${d.id}" aria-label="Elimina ${esc(d.name)}" style="color:var(--warn)">${ic('trash')}</button>` : ''}</div>
    <label class="field"><span>Calorie (kcal)</span><input class="input" inputmode="decimal" data-ch="dtF" data-id="${d.id}" data-k="kcal" value="${fmtIn(d.kcal)}" style="font-weight:700;font-size:18px"></label>
    <div class="grid3">
      ${MACROS.map((m) => `<label class="field"><span style="display:flex;align-items:center;gap:5px"><i class="dot" style="background:${m.color}"></i>${m.name}</span>
        <input class="input" inputmode="decimal" data-ch="dtF" data-id="${d.id}" data-k="${m.k}" value="${fmtIn(d[m.k])}"></label>`).join('')}
    </div>
    <div id="dti-${d.id}">${dayTypeInfo(d)}</div>
    ${visN.length ? `<div class="grid3">${visN.map((n) => `<label class="field"><span class="ellipsis">${esc(n.name)} (${esc(n.unit)})</span><input class="input" inputmode="decimal" data-ch="dtX" data-id="${d.id}" data-k="${n.id}" value="${fmtIn(d.extra && d.extra[n.id])}" placeholder="–"></label>`).join('')}</div>` : ''}
  </section>`;
}

/* ================================================================
   SCHERMATA: PROGRESSI
   ================================================================ */
SCREENS.progressi = function () {
  const t = today();
  const from = addDays(t, -ui.range + 1);
  const ws = state.weights.filter((w) => w.date >= from && w.date <= t).sort((a, b) => a.date.localeCompare(b.date));
  // media mobile: media delle pesate negli ultimi 7 giorni (inclusi)
  const all = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const avgAt = (d) => { const lo = addDays(d, -6); const xs = all.filter((w) => w.date >= lo && w.date <= d); return xs.reduce((s, w) => s + w.kg, 0) / xs.length; };
  const trend = ws.map((w) => ({ date: w.date, kg: avgAt(w.date) }));
  // giorni tracciati
  let tracked = 0, kcalSum = 0, pHit = 0;
  const kcalDays = [];
  for (let d = from; d <= t; d = addDays(d, 1)) {
    const e = state.diary[d];
    const tot = e && e.length ? dayTotals(d) : null;
    kcalDays.push({ date: d, kcal: tot ? tot.kcal || 0 : null, goal: dayType(d).kcal });
    if (tot) { tracked++; kcalSum += tot.kcal || 0; if ((tot.p || 0) >= (dayType(d).p || 0) * 0.95) pHit++; }
  }
  const variation = trend.length > 1 ? trend[trend.length - 1].kg - trend[0].kg : null;
  const lw = latestWeight();
  const ranges = [[30, '1M'], [90, '3M'], [180, '6M'], [365, '1A']];
  let h = `<header class="header"><h1>Progressi</h1>
    <div class="seg" role="group" aria-label="Periodo">${ranges.map(([r, l]) => `<button data-act="range" data-r="${r}" aria-pressed="${ui.range === r}" style="width:40px">${l}</button>`).join('')}</div></header>
  <section class="card stack" aria-label="Andamento del peso" style="padding:14px 12px 10px">
    <div class="between" style="padding:0 4px">
      <div class="stack" style="gap:0"><span class="small muted" style="font-weight:600">Peso · media 7 giorni</span>
        <strong class="num" style="font-size:26px">${trend.length ? fmt(trend[trend.length - 1].kg, 1) + ' kg' : lw ? fmt(lw.kg, 1) + ' kg' : '–'}</strong></div>
      ${variation != null ? `<span class="tag" style="font-size:14px;padding:4px 8px;${variation > 0 ? 'background:var(--warn-soft);color:var(--warn)' : ''}">${variation > 0 ? '+' : '−'}${fmt(Math.abs(variation), 1)} kg</span>` : ''}
    </div>
    ${weightChart(ws, trend, from, t)}
  </section>
  <div class="grid3">
    <div class="card stack" style="gap:2px;padding:12px"><span class="small muted" style="font-weight:600">Media kcal</span><strong class="num" style="font-size:20px">${tracked ? fmt(kcalSum / tracked) : '–'}</strong></div>
    <div class="card stack" style="gap:2px;padding:12px"><span class="small muted" style="font-weight:600">Proteine ok</span><strong class="num" style="font-size:20px">${tracked ? `${pHit}/${tracked}` : '–'}</strong></div>
    <div class="card stack" style="gap:2px;padding:12px"><span class="small muted" style="font-weight:600">Giorni tracciati</span><strong class="num" style="font-size:20px">${tracked}</strong></div>
  </div>
  <section class="card stack" aria-label="Calorie per giorno" style="padding:14px 12px 10px">
    <h2 style="padding:0 4px">Calorie</h2>
    ${kcalChart(kcalDays)}
  </section>
  <section class="card stack" aria-label="Registra misure">
    <h2>Registra</h2>
    <div class="grid2">
      <label class="field"><span>Data</span><input class="input" type="date" id="wDate" value="${t}" max="${t}"></label>
      <label class="field"><span>Peso (kg)</span><input class="input" id="wKg" inputmode="decimal" placeholder="es. 78,2"></label>
      ${state.settings.measures.map((m, i) => `<label class="field"><span>${esc(m)} (cm)</span><input class="input" data-meas="${i}" inputmode="decimal" placeholder="–"></label>`).join('')}
    </div>
    <div class="between"><button class="link" data-act="measNew">+ Altra misura</button><button class="btn" data-act="wSave">Salva</button></div>
  </section>
  ${measuresSummary()}
  ${state.weights.length ? `<h3 class="section-label">Ultime pesate</h3><ul class="list">${[...state.weights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map((w) => `<li><div class="li" style="min-height:48px">
    <span class="grow">${esc(cap(longDate(w.date)))}</span><strong>${fmt(w.kg, 1)} kg</strong>
    <button class="icon-btn" data-act="wDel" data-date="${w.date}" aria-label="Elimina pesata del ${shortDate(w.date)}">${ic('x', 18)}</button></div></li>`).join('')}</ul>` : ''}`;
  return h;
};
function weightChart(ws, trend, from, to) {
  if (ws.length < 2) return `<div class="empty">Servono almeno due pesate in questo periodo per il grafico.</div>`;
  const W = 340, H = 180, L = 30, R = 8, T = 12, B = 22;
  const span = (toDate(to) - toDate(from)) || 1;
  const x = (d) => L + (toDate(d) - toDate(from)) / span * (W - L - R);
  let lo = Math.min(...ws.map((w) => w.kg)), hi = Math.max(...ws.map((w) => w.kg));
  const tg = state.goals.target;
  if (tg && tg >= lo - 2 && tg <= hi + 2) { lo = Math.min(lo, tg); hi = Math.max(hi, tg); }
  lo = Math.floor(lo - 0.3); hi = Math.ceil(hi + 0.3);
  if (hi - lo < 2) hi = lo + 2;
  const y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
  const step = Math.max(1, Math.round((hi - lo) / 4));
  let grid = '';
  for (let v = lo; v <= hi; v += step) grid += `<path d="M${L} ${y(v).toFixed(1)}H${W - R}" stroke="var(--line-2)"/><text x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${v}</text>`;
  const tline = trend.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.kg).toFixed(1)}`).join('');
  const dots = ws.map((w) => `<circle cx="${x(w.date).toFixed(1)}" cy="${y(w.kg).toFixed(1)}" r="2.8" fill="var(--card)" stroke="var(--accent)" stroke-opacity=".55" stroke-width="1.5"/>`).join('');
  const goal = tg && tg >= lo && tg <= hi ? `<path d="M${L} ${y(tg).toFixed(1)}H${W - R}" stroke="var(--accent)" stroke-dasharray="4 4" stroke-opacity=".6"/><text x="${W - R}" y="${(y(tg) - 4).toFixed(1)}" text-anchor="end">obiettivo</text>` : '';
  const last = trend[trend.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Peso da ${fmt(ws[0].kg, 1)} a ${fmt(ws[ws.length - 1].kg, 1)} kg">
    ${grid}${goal}
    <path d="${tline}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}<circle cx="${x(last.date).toFixed(1)}" cy="${y(last.kg).toFixed(1)}" r="5" fill="var(--accent)"/>
    <text x="${L}" y="${H - 6}">${shortDate(from)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${shortDate(to)}</text>
  </svg><span class="small muted" style="padding:0 4px">Pallini = pesate · linea = media degli ultimi 7 giorni</span>`;
}
function kcalChart(days) {
  let pts = days;
  let label = 'giorno';
  if (days.length > 45) { // medie settimanali
    pts = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const tr = chunk.filter((d) => d.kcal != null);
      pts.push({ date: chunk[0].date, kcal: tr.length ? tr.reduce((s, d) => s + d.kcal, 0) / tr.length : null, goal: chunk.reduce((s, d) => s + d.goal, 0) / chunk.length });
    }
    label = 'settimana (media)';
  }
  if (!pts.some((p) => p.kcal != null)) return `<div class="empty">Nessun giorno registrato nel periodo.</div>`;
  const W = 340, H = 150, L = 34, R = 8, T = 10, B = 20;
  const max = Math.max(...pts.map((p) => Math.max(p.kcal || 0, p.goal || 0))) * 1.08 || 1;
  const bw = (W - L - R) / pts.length;
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, Math.round(max / 2 / 100) * 100, Math.round(max * 0.9 / 100) * 100];
  let s = ticks.map((v) => `<path d="M${L} ${y(v).toFixed(1)}H${W - R}" stroke="var(--line-2)"/><text x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`).join('');
  pts.forEach((p, i) => {
    const x0 = L + i * bw + Math.min(2, bw * 0.15);
    const w = Math.max(1, bw - Math.min(4, bw * 0.3));
    if (p.kcal != null) {
      const over = p.goal && p.kcal > p.goal * 1.05;
      s += `<rect x="${x0.toFixed(1)}" y="${y(p.kcal).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - B - y(p.kcal)).toFixed(1)}" rx="${Math.min(3, w / 2).toFixed(1)}" fill="${over ? 'var(--warn)' : 'var(--accent)'}" fill-opacity=".85"/>`;
    }
    if (p.goal) s += `<path d="M${x0.toFixed(1)} ${y(p.goal).toFixed(1)}h${w.toFixed(1)}" stroke="var(--ink)" stroke-width="1.5" stroke-opacity=".6"/>`;
  });
  s += `<text x="${L}" y="${H - 5}">${shortDate(pts[0].date)}</text><text x="${W - R}" y="${H - 5}" text-anchor="end">${shortDate(days[days.length - 1].date)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Calorie per ${label}">${s}</svg>
  <span class="small muted" style="padding:0 4px">Barre = kcal per ${label} · trattino = obiettivo · arancione = oltre il 5%</span>`;
}
function measuresSummary() {
  if (!state.measures.length) return '';
  const names = [...new Set(state.measures.map((m) => m.name))];
  const rows = names.map((n) => {
    const xs = state.measures.filter((m) => m.name === n).sort((a, b) => a.date.localeCompare(b.date));
    const last = xs[xs.length - 1], first = xs[0];
    const d = last.value - first.value;
    return `<li><div class="li" style="min-height:48px"><span class="grow"><span class="t">${esc(n)}</span><br><span class="s">${xs.length} misure · ultima ${shortDate(last.date)}</span></span>
      <span style="text-align:right"><strong>${fmt(last.value, 1)} cm</strong>${xs.length > 1 ? `<br><span class="s">${d > 0 ? '+' : '−'}${fmt(Math.abs(d), 1)} dal ${shortDate(first.date)}</span>` : ''}</span></div></li>`;
  }).join('');
  return `<h3 class="section-label">Misure</h3><ul class="list">${rows}</ul>`;
}

/* ================================================================
   SCHERMATA: PERSONALIZZA
   ================================================================ */
SCREENS.personalizza = function () {
  const S = state.settings;
  const sw = (k, label, checked, dataset) => `<label class="formrow"><span class="lbl">${label}</span><input type="checkbox" role="switch" class="check" ${dataset} ${checked ? 'checked' : ''}></label>`;
  const nP = Object.keys(state.products).length, nR = Object.keys(state.recipes).length, nD = Object.keys(state.diary).filter((d) => state.diary[d].length).length;
  return `
  <header class="topbar">
    <a class="icon-btn" href="#/oggi" aria-label="Indietro" style="margin-left:-12px">${ic('back', 24)}</a>
    <h1 class="grow">Personalizza</h1>
  </header>

  <h3 class="section-label">Pasti</h3>
  <ul class="list">
    ${S.meals.map((m, i) => `<li><div class="li" style="padding:6px 6px 6px 10px;gap:4px">
      <label class="grow"><span class="sr">Nome pasto</span><input class="input" data-ch="mealName" data-i="${i}" value="${esc(m.name)}" style="border-color:transparent;font-weight:600"></label>
      <button class="icon-btn" data-act="mealMove" data-i="${i}" data-d="-1" aria-label="Sposta su" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${ic('up', 20)}</button>
      <button class="icon-btn" data-act="mealMove" data-i="${i}" data-d="1" aria-label="Sposta giù" ${i === S.meals.length - 1 ? 'disabled style="opacity:.3"' : ''}>${ic('down', 20)}</button>
      <button class="icon-btn" data-act="mealDel" data-i="${i}" aria-label="Elimina ${esc(m.name)}" style="color:var(--warn)">${ic('trash', 20)}</button>
    </div></li>`).join('')}
    <li><button class="li" data-act="mealAdd" style="color:var(--accent);font-weight:600;min-height:48px">+ Aggiungi pasto</button></li>
  </ul>

  <h3 class="section-label">Nutrienti da mostrare</h3>
  <div class="card">
    <div class="chips">
      ${S.nutrients.map((n) => `<span class="chip ${n.visible ? 'green' : ''}" style="padding-right:${n.builtin ? '14px' : '4px'}">
        <label class="row" style="gap:6px"><input type="checkbox" class="check" style="width:16px;height:16px" data-ch="nutrVis" data-id="${n.id}" ${n.visible ? 'checked' : ''}>${esc(n.name)} <span class="muted" style="font-weight:500">${esc(n.unit)}</span></label>
        ${n.builtin ? '' : `<button class="icon-btn" data-act="nutrDel" data-id="${n.id}" aria-label="Elimina nutriente ${esc(n.name)}" style="width:30px;height:30px">${ic('x', 14)}</button>`}</span>`).join('')}
      <button class="chip add" data-act="nutrNew">+ Crea nutriente</button>
    </div>
    <p class="small muted" style="margin:10px 0 0">Quelli spuntati compaiono nel diario e negli obiettivi. Nei prodotti puoi inserirli tutti.</p>
  </div>

  <h3 class="section-label">Schermata Diario</h3>
  <div class="card pad0">
    ${sw('ring', 'Anello delle calorie', S.home.ring, 'data-ch="home" data-k="ring"')}
    ${sw('macros', 'Barre dei macro', S.home.macros, 'data-ch="home" data-k="macros"')}
    ${sw('nutrients', 'Altri nutrienti', S.home.nutrients, 'data-ch="home" data-k="nutrients"')}
    ${sw('weight', 'Peso del giorno', S.home.weight, 'data-ch="home" data-k="weight"')}
    ${sw('rem', 'Mostra quanto manca (invece del consumato)', S.showRemaining, 'data-ch="showRem"')}
  </div>

  <h3 class="section-label">Aspetto</h3>
  <div class="seg" role="group" aria-label="Tema">
    ${[['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(([k, l]) => `<button data-act="theme" data-t="${k}" aria-pressed="${S.theme === k}">${l}</button>`).join('')}
  </div>

  <h3 class="section-label">I tuoi dati</h3>
  <div class="card stack">
    <span class="small muted">${nP} prodotti · ${nR} ricette · ${nD} giorni nel diario · ${state.weights.length} pesate</span>
    <div class="grid2">
      <button class="btn soft sm" data-act="exportJson">Esporta backup</button>
      <label class="btn soft sm" style="position:relative">Importa backup<input type="file" accept="application/json,.json" data-ch="importJson" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
      <button class="btn soft sm" data-act="exportCsv">Diario in CSV</button>
      <button class="btn soft sm" data-act="loadExamples">Alimenti di esempio</button>
    </div>
    <p class="small muted" style="margin:0">I dati sono salvati solo in questo browser, su questo telefono. Fai un backup ogni tanto: se cancelli i dati del browser o cambi telefono, lo reimporti da qui.</p>
    <button class="btn danger sm" data-act="resetAll">Cancella tutti i dati</button>
  </div>
  <p class="small muted" style="text-align:center">Bilancino · gratis, senza account e senza pubblicità</p>`;
};

/* ================================================================
   AZIONI (click)
   ================================================================ */
const ACT = {
  toastAction() { const a = toast.action; $('#toast').hidden = true; if (a && a.fn) a.fn(); },
  dayPrev() { ui.date = addDays(ui.date, -1); render(); },
  dayNext() { ui.date = addDays(ui.date, 1); render(); },
  dayToday() { ui.date = today(); render(); },
  welcomeDone() { state.welcomeDone = true; save(); render(); },
  cycleDayType() {
    const g = state.goals; const d = ui.date;
    const auto = g.mode === 'week' ? g.week[weekday(d)] : g.fixed;
    const cur = dayType(d).id;
    const i = g.dayTypes.findIndex((t) => t.id === cur);
    const next = g.dayTypes[(i + 1) % g.dayTypes.length].id;
    if (next === auto) delete state.dayOverride[d]; else state.dayOverride[d] = next;
    save(); render();
  },
  quickWeight() {
    const v = num($('#qw').value);
    if (!v || v < 20 || v > 400) { toast('Peso non valido'); return; }
    setWeight(ui.date, v); save(); render(); toast('Peso salvato');
  },
  copyMeal(el) {
    const m = el.dataset.meal;
    const src = (state.diary[addDays(ui.date, -1)] || []).filter((e) => e.meal === m);
    const day = (state.diary[ui.date] ||= []);
    src.forEach((e) => day.push({ ...JSON.parse(JSON.stringify(e)), id: uid() }));
    save(); render(); toast(`Copiato ${mealName(m)} di ieri`);
  },
  editEntry(el) { editEntry(el.dataset.id); },
  addTab(el) { ui.addTab = el.dataset.tab; document.querySelectorAll('[data-act="addTab"]').forEach((b) => b.setAttribute('aria-pressed', b === el)); $('#addList').innerHTML = renderAddList(); },
  openQty(el) { openQtySheet(el.dataset.kind, el.dataset.id); },
  qtyStep(el) {
    const c = ui.sheet; const d = +el.dataset.d;
    const step = c.unit === 'g' ? (c.qty >= 100 ? 10 : 5) : c.unit === 'portion' ? 0.5 : 1;
    c.qty = Math.max(0, round((c.qty || 0) + d * step, 2));
    $('#qtyIn').value = fmtIn(c.qty); $('#qprev').innerHTML = qtyPreview(c);
  },
  qtyUnit(el) {
    const c = ui.sheet; const src = sourceOf(c.kind, c.id); const u = el.dataset.u;
    if (u === c.unit) return;
    // converte la quantità mantenendo i grammi quando possibile
    // verso grammi: mantiene la quantità equivalente; verso una porzione: parte da 1
    if (c.kind === 'product') { const g = gramsOf(src, c.qty || 0, c.unit); c.unit = u; c.qty = u === 'g' ? round(g, 0) : 1; }
    else { const inf = recipeInfo(src); const g = c.unit === 'g' ? c.qty : c.qty * inf.portionW; c.unit = u; c.qty = u === 'g' ? round(g, 0) : 1; }
    $('#sheet').innerHTML = '<div class="grip"></div>' + qtySheetHtml(c);
  },
  qtyConfirm() { confirmQty(); },
  entryDelete() {
    const c = ui.sheet; const day = state.diary[ui.date] || [];
    const i = day.findIndex((e) => e.id === c.entryId);
    if (i < 0) return;
    const [removed] = day.splice(i, 1);
    save(); closeSheet(); render();
    toast('Voce eliminata', { label: 'Annulla', fn: () => { day.splice(i, 0, removed); save(); render(); } });
  },
  quickKcal() { openSheet(quickSheetHtml(null), { type: 'quick' }); setTimeout(() => $('#qkName') && $('#qkName').focus(), 50); },
  quickSave() { saveQuick(); },

  // prodotto
  pCancel() { ui.pDraft = null; history.length > 1 ? history.back() : go('#/aggiungi'); },
  pSave(el) { saveProduct(el.dataset.ret); },
  pBasis(el) { ui.pDraft.basis = el.dataset.b; render(); },
  pServAdd() {
    const n = $('#svName').value.trim(), q = num($('#svQty').value);
    if (!n || !q) { toast('Inserisci nome e quantità della porzione'); return; }
    ui.pDraft.servings.push({ id: uid(), name: n, qty: q }); render();
  },
  pServDel(el) { ui.pDraft.servings.splice(+el.dataset.i, 1); render(); },
  pDelete() {
    const p = ui.pDraft;
    const used = Object.values(state.recipes).filter((r) => r.items.some((i) => i.pid === p.id)).map((r) => r.name);
    if (!confirm(`Eliminare “${p.name}”?${used.length ? `\nÈ usato nelle ricette: ${used.join(', ')}.` : ''}\nLe voci già nel diario restano.`)) return;
    delete state.products[p.id]; ui.pDraft = null; save(); toast('Prodotto eliminato'); go('#/aggiungi?tab=prodotti');
  },
  nutrNew() {
    const name = (prompt('Nome del nutriente (es. Calcio, Caffeina, Omega-3)') || '').trim();
    if (!name) return;
    const unit = (prompt('Unità di misura (g, mg, µg, ml…)', 'mg') || 'g').trim();
    state.settings.nutrients.push({ id: 'n_' + uid(), name, unit, visible: true, builtin: false });
    save(); render(); toast(`Nutriente “${name}” creato`);
  },
  nutrDel(el) {
    const n = nutrient(el.dataset.id);
    if (!n || !confirm(`Eliminare il nutriente “${n.name}”? I valori inseriti nei prodotti non verranno più mostrati.`)) return;
    state.settings.nutrients = state.settings.nutrients.filter((x) => x.id !== n.id); save(); render();
  },

  // ricetta
  rCancel() { ui.rDraft = null; history.length > 1 ? history.back() : go('#/aggiungi?tab=ricette'); },
  rServ(el) { const r = ui.rDraft; r.servings = Math.max(1, (r.servings || 1) + +el.dataset.d); $('#rServ').textContent = fmt(r.servings, 1); $('#rsum').innerHTML = recipeSummary(r); },
  rDel(el) { ui.rDraft.items.splice(+el.dataset.i, 1); render2(); },
  rAddIng() { openSheet(pickerSheetHtml(), { type: 'picker' }); },
  rPick(el) { ui.rDraft.items.push({ pid: el.dataset.id, qty: 100 }); closeSheet(); render2(); toast('Ingrediente aggiunto: imposta i grammi'); },
  pickNew() { closeSheet(); go('#/prodotto/new?ret=recipe'); },
  rSave(el) { saveRecipe(!!el.dataset.log); },
  rDelete() {
    const r = ui.rDraft;
    if (!confirm(`Eliminare la ricetta “${r.name}”? Le voci già nel diario restano.`)) return;
    delete state.recipes[r.id]; ui.rDraft = null; save(); toast('Ricetta eliminata'); go('#/aggiungi?tab=ricette');
  },

  // dispensa / spesa
  pFilter(el) { ui.pantryFilter = el.dataset.f; render(); },
  addFreqToList(el) { Object.values(state.products).forEach((p) => { if (p.pantry && p.pantry.on && p.pantry.freq === el.dataset.f) p.pantry.inList = true; }); save(); render(); toast('Aggiunti alla lista'); },
  extraAdd() { const v = $('#extraIn').value.trim(); if (!v) return; state.shopping.extra.push({ id: uid(), name: v, checked: false }); save(); render(); setTimeout(() => $('#extraIn').focus(), 0); },
  extraDel(el) { state.shopping.extra = state.shopping.extra.filter((e) => e.id !== el.dataset.id); save(); render(); },
  shopDone() {
    const ch = state.shopping.checked;
    Object.values(state.products).forEach((p) => { if (ch[p.id] && p.pantry) p.pantry.inList = false; });
    state.shopping.checked = {};
    state.shopping.extra = state.shopping.extra.filter((e) => !e.checked);
    save(); render(); toast('Spesa fatta!');
  },

  // obiettivi
  gMode(el) { state.goals.mode = el.dataset.m; save(); render(); },
  weekCycle(el) {
    const g = state.goals; const i = +el.dataset.i;
    const k = g.dayTypes.findIndex((t) => t.id === g.week[i]);
    g.week[i] = g.dayTypes[(k + 1) % g.dayTypes.length].id; save(); render();
  },
  dtAdd() {
    const g = state.goals; const base = g.dayTypes[g.dayTypes.length - 1];
    const id = uid();
    g.dayTypes.push({ ...JSON.parse(JSON.stringify(base)), id, name: g.dayTypes.length === 1 ? 'Allenamento' : 'Nuovo tipo' });
    save(); render(); toast('Tipo di giornata aggiunto');
  },
  dtDel(el) {
    const g = state.goals; const id = el.dataset.id;
    const d = g.dayTypes.find((t) => t.id === id);
    if (!confirm(`Eliminare “${d.name}”?`)) return;
    g.dayTypes = g.dayTypes.filter((t) => t.id !== id);
    const first = g.dayTypes[0].id;
    g.week = g.week.map((w) => (w === id ? first : w));
    if (g.fixed === id) g.fixed = first;
    for (const k in state.dayOverride) if (state.dayOverride[k] === id) delete state.dayOverride[k];
    save(); render();
  },
  dtKcalFromMacro(el) { const d = state.goals.dayTypes.find((t) => t.id === el.dataset.id); d.kcal = Math.round(4 * (d.p || 0) + 4 * (d.c || 0) + 9 * (d.f || 0)); save(); render(); },

  // progressi
  range(el) { ui.range = +el.dataset.r; render(); },
  wSave() {
    const d = $('#wDate').value || today();
    const kg = num($('#wKg').value);
    let any = false;
    if ($('#wKg').value.trim()) {
      if (!kg || kg < 20 || kg > 400) { toast('Peso non valido'); return; }
      setWeight(d, kg); any = true;
    }
    document.querySelectorAll('[data-meas]').forEach((inp) => {
      const v = num(inp.value); if (v == null) return;
      const name = state.settings.measures[+inp.dataset.meas];
      state.measures = state.measures.filter((m) => !(m.date === d && m.name === name));
      state.measures.push({ date: d, name, value: v }); any = true;
    });
    if (!any) { toast('Inserisci almeno un valore'); return; }
    save(); render(); toast('Salvato');
  },
  wDel(el) {
    const d = el.dataset.date; const old = state.weights.find((w) => w.date === d);
    state.weights = state.weights.filter((w) => w.date !== d); save(); render();
    toast('Pesata eliminata', { label: 'Annulla', fn: () => { state.weights.push(old); save(); render(); } });
  },
  measNew() { const n = (prompt('Nome della misura (es. Fianchi, Braccio, % grasso)') || '').trim(); if (!n) return; if (!state.settings.measures.includes(n)) state.settings.measures.push(n); save(); render(); },

  // personalizza
  mealMove(el) {
    const m = state.settings.meals; const i = +el.dataset.i, j = i + +el.dataset.d;
    if (j < 0 || j >= m.length) return; [m[i], m[j]] = [m[j], m[i]]; save(); render();
  },
  mealDel(el) {
    const m = state.settings.meals; const i = +el.dataset.i;
    if (m.length <= 1) { toast('Serve almeno un pasto'); return; }
    if (!confirm(`Eliminare il pasto “${m[i].name}”? Le voci del diario associate resteranno ma non saranno visibili.`)) return;
    m.splice(i, 1); save(); render();
  },
  mealAdd() { const n = (prompt('Nome del nuovo pasto (es. Spuntino pomeriggio)') || '').trim(); if (!n) return; state.settings.meals.push({ id: uid(), name: n }); save(); render(); },
  theme(el) { state.settings.theme = el.dataset.t; save(); render(); },
  exportJson() { download(`bilancino-backup-${today()}.json`, JSON.stringify(state, null, 1), 'application/json'); },
  exportCsv() {
    const ns = state.settings.nutrients;
    const head = ['data', 'pasto', 'alimento', 'quantita', 'kcal', 'proteine_g', 'carboidrati_g', 'grassi_g', ...ns.map((n) => `${n.name}_${n.unit}`)];
    const rows = [head];
    Object.keys(state.diary).sort().forEach((d) => state.diary[d].forEach((e) => {
      rows.push([d, mealName(e.meal), e.label, qtyLabel(e.kind, sourceOf(e.kind, e.ref), e.qty, e.unit), ...['kcal', 'p', 'c', 'f', ...ns.map((n) => n.id)].map((k) => (e.n[k] != null ? String(round(e.n[k], 1)).replace('.', ',') : ''))]);
    }));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    download(`bilancino-diario-${today()}.csv`, '﻿' + csv, 'text/csv');
  },
  loadExamples() {
    let added = 0;
    for (const ex of EXAMPLES) {
      if (Object.values(state.products).some((p) => norm(p.name) === norm(ex[0]))) continue;
      const [name, basis, kcal, p, c, f, fiber, servings] = ex;
      const id = uid();
      state.products[id] = { ...newProduct(name), id, basis, autoKcal: false, per100: { kcal, p, c, f, fiber }, servings: (servings || []).map(([n, q]) => ({ id: uid(), name: n, qty: q })), tags: ['esempio'], notes: 'Valori indicativi: verifica con l’etichetta del prodotto che compri.', created: Date.now() };
      added++;
    }
    state.welcomeDone = true; save(); render();
    toast(added ? `${added} alimenti di esempio aggiunti` : 'Già presenti');
  },
  resetAll() {
    if (!confirm('Cancellare TUTTI i dati (diario, prodotti, ricette, pesate)? Prima conviene esportare un backup.')) return;
    if (!confirm('Sei sicuro? L’operazione non si può annullare.')) return;
    state = defaultState(); save(true); ui.date = today(); go('#/oggi'); toast('Dati cancellati');
  },
};
function render2() { // ri-disegna senza perdere lo scroll
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
function setWeight(d, kg) {
  state.weights = state.weights.filter((w) => w.date !== d);
  state.weights.push({ date: d, kg: round(kg, 2) });
}
function download(name, text, type) {
  const blob = new Blob([text], { type });
  // su iPhone/iPad (soprattutto da app installata) il download diretto non funziona bene: usa la condivisione
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.canShare) {
    const file = new File([blob], name, { type });
    if (navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => {}); return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ================================================================
   INPUT (mentre si digita) e CHANGE (a fine modifica)
   ================================================================ */
const INP = {
  search(el) { ui.q = el.value; $('#addList').innerHTML = renderAddList(); },
  qty(el) { const c = ui.sheet; c.qty = num(el.value) || 0; $('#qprev').innerHTML = qtyPreview(c); },
  pf(el) { ui.pDraft[el.dataset.k] = el.value; },
  pn(el) { ui.pDraft.per100[el.dataset.k] = num(el.value); if (el.dataset.k !== 'kcal') updateAutoKcal(); },
  pPi(el) { ui.pDraft.pantry[el.dataset.k] = el.value; },
  rf(el) {
    const r = ui.rDraft; const k = el.dataset.k;
    r[k] = k === 'cooked' ? num(el.value) : el.value;
    if (k === 'cooked') $('#rsum').innerHTML = recipeSummary(r);
  },
  rqty(el) {
    const r = ui.rDraft; const i = +el.dataset.i;
    r.items[i].qty = num(el.value) || 0;
    const p = state.products[r.items[i].pid];
    const k = $('#rk-' + i); if (k && p) k.textContent = `${fmt(productN(p, r.items[i].qty, 'g').kcal)} kcal`;
    $('#rsum').innerHTML = recipeSummary(r);
  },
  pickSearch(el) { $('#pickList').innerHTML = pickerList(el.value); },
};
const CHG = {
  meal(el) { ui.meal = el.value; },
  sheetMeal(el) { ui.sheet.meal = el.value; },
  pAuto(el) { ui.pDraft.autoKcal = el.checked; render2(); },
  pPantry(el) { ui.pDraft.pantry.on = el.checked; render2(); },
  pPf(el) { ui.pDraft.pantry[el.dataset.k] = el.value; },
  inList(el) { const p = state.products[el.dataset.id]; p.pantry.inList = el.checked; save(); render2(); },
  shopCheck(el) { state.shopping.checked[el.dataset.id] = el.checked; save(); render2(); },
  extraCheck(el) { const e = state.shopping.extra.find((x) => x.id === el.dataset.id); e.checked = el.checked; save(); render2(); },
  gTarget(el) { state.goals.target = num(el.value); save(); $('#gEst').innerHTML = estimateHtml(); },
  gRate(el) { state.goals.rate = +el.value; save(); $('#gEst').innerHTML = estimateHtml(); },
  gFixed(el) { state.goals.fixed = el.value; save(); },
  dtF(el) {
    const d = state.goals.dayTypes.find((t) => t.id === el.dataset.id); const k = el.dataset.k;
    d[k] = k === 'name' ? (el.value.trim() || d.name) : num(el.value) || 0; save();
    const box = $('#dti-' + d.id); if (box) box.innerHTML = dayTypeInfo(d);
  },
  dtX(el) { const d = state.goals.dayTypes.find((t) => t.id === el.dataset.id); d.extra ||= {}; const v = num(el.value); if (v == null) delete d.extra[el.dataset.k]; else d.extra[el.dataset.k] = v; save(); },
  mealName(el) { const m = state.settings.meals[+el.dataset.i]; m.name = el.value.trim() || m.name; save(); },
  nutrVis(el) { nutrient(el.dataset.id).visible = el.checked; save(); render2(); },
  home(el) { state.settings.home[el.dataset.k] = el.checked; save(); },
  showRem(el) { state.settings.showRemaining = el.checked; save(); },
  importJson(el) {
    const f = el.files && el.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const s = JSON.parse(rd.result);
        if (!s || !s.settings || !s.products || !s.diary) throw new Error('formato');
        if (!confirm('Sostituire tutti i dati attuali con quelli del backup?')) return;
        localStorage.setItem(KEY, JSON.stringify(s)); state = load(); render(); toast('Backup importato');
      } catch (e) { toast('File non valido'); }
    };
    rd.readAsText(f);
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const el = e.target;
  if (el.matches && el.matches('[role="button"][data-act]')) { e.preventDefault(); el.click(); }
  if (el.id === 'qtyIn') { e.preventDefault(); confirmQty(); }
  if (el.id === 'extraIn') { e.preventDefault(); ACT.extraAdd(); }
  if (el.id === 'qw') { e.preventDefault(); ACT.quickWeight(); }
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-in]');
  if (el && INP[el.dataset.in]) INP[el.dataset.in](el);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-ch]');
  if (el && CHG[el.dataset.ch]) CHG[el.dataset.ch](el);
});

/* ---------- alimenti di esempio (valori indicativi per 100 g/ml) ---------- */
// [nome, base, kcal, proteine, carboidrati, grassi, fibre, porzioni]
const EXAMPLES = [
  ['Petto di pollo crudo', 'g', 100, 23.3, 0, 0.8, 0],
  ['Riso basmati crudo', 'g', 350, 8, 78, 0.6, 1.3, [['porzione', 80]]],
  ['Fiocchi d’avena', 'g', 372, 13.5, 58.7, 7, 10, [['cucchiaio', 10]]],
  ['Yogurt greco 0%', 'g', 54, 10.3, 3, 0, 0, [['vasetto', 170]]],
  ['Uovo intero', 'g', 128, 12.4, 0, 8.7, 0, [['uovo', 50]]],
  ['Latte parzialmente scremato', 'ml', 46, 3.5, 5, 1.6, 0, [['tazza', 200]]],
  ['Olio extravergine d’oliva', 'g', 899, 0, 0, 99.9, 0, [['cucchiaio', 10], ['cucchiaino', 4]]],
  ['Parmigiano Reggiano', 'g', 392, 33, 0, 28.4, 0, [['cucchiaio grattugiato', 5]]],
  ['Tonno al naturale sgocciolato', 'g', 108, 25, 0, 1, 0, [['scatoletta', 52]]],
  ['Ceci lessati', 'g', 120, 7, 16, 2.5, 6, [['barattolo sgocciolato', 240]]],
  ['Gallette di riso', 'g', 387, 8, 81.5, 2.8, 4, [['galletta', 8]]],
  ['Patate', 'g', 77, 2, 17, 0.1, 2.2],
  ['Zucchine', 'g', 17, 1.2, 3.1, 0.3, 1],
  ['Mela', 'g', 52, 0.3, 14, 0.2, 2.4, [['mela media', 180]]],
  ['Banana', 'g', 89, 1.1, 23, 0.3, 2.6, [['banana media', 120]]],
  ['Mirtilli', 'g', 57, 0.7, 14.5, 0.3, 2.4],
];

/* ---------- avvio ---------- */
ui.meal = guessMeal();
document.documentElement.dataset.theme = state.settings.theme || 'auto';
render();
// il giorno cambia a mezzanotte: se l'app resta aperta, aggiorna "oggi"
let lastToday = today();
setInterval(() => { const t = today(); if (t !== lastToday) { if (ui.date === lastToday) ui.date = t; lastToday = t; if (parseHash().route === 'oggi') render(); } }, 60000);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
