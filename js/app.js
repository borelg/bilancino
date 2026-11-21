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
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 7.5c0-1.5 1.5-1.5 1.5-3M13.5 7.5c0-1.5 1.5-1.5 1.5-3"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
};
const ic = (n, s = 22, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- stato ---------- */
function defaultState() {
  return {
    v: 3,
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
      theme: 'light',
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
    shopping: { checked: {}, extra: [], planChecked: {} },
    favorites: [],
    plan: {},
    tdee: { lastReview: null, history: [] },
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
    if (!s.v || s.v < 2) { if (s.settings.theme === 'auto') s.settings.theme = 'light'; s.v = 2; } // v2: tema chiaro predefinito
    // v3: piano pasti, TDEE, quantità "in casa". Solo aggiunte: nessun dato esistente viene modificato.
    s.shopping ||= {}; s.shopping.checked ||= {}; s.shopping.extra ||= []; s.shopping.planChecked ||= {};
    s.plan ||= {}; s.tdee ||= { lastReview: null, history: [] }; s.tdee.history ||= [];
    if (s.v < 3) s.v = 3;
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
  pieRange: 'today',
  libTab: 'alimenti',
  libQ: '',
  planWeek: null,
  planTab: 'ricette',
  planMeal: null,
  shopRange: 'next7',
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
const NAV_ROUTES = ['oggi', 'alimenti', 'dispensa', 'progressi', 'obiettivi'];

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
  document.documentElement.dataset.theme = state.settings.theme || 'light';
}
function renderNav(active) {
  const nav = $('#nav');
  if (!active) { nav.hidden = true; return; }
  nav.hidden = false;
  const a = (r, icon, label) => `<a href="#/${r}" ${active === r ? 'aria-current="page"' : ''}>${ic(icon, 24)}${label}</a>`;
  if (active === 'dispensa') active = 'alimenti';
  nav.innerHTML = a('oggi', 'cal', 'Diario') + a('alimenti', 'bowl', 'Alimenti') +
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
  const dirty = ui.sheet && ui.sheet.dirty;
  ui.sheet = null;
  $('#sheet').hidden = true; $('#scrim').hidden = true;
  $('#sheet').innerHTML = '';
  document.body.style.overflow = '';
  if (dirty && !silent) render2();
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
      <a class="icon-btn" href="#/piano" aria-label="Piano pasti">${ic('plan')}</a>
      <a class="icon-btn" href="#/personalizza" aria-label="Personalizza" style="margin-right:-10px">${ic('gear')}</a>
    </div>
  </header>`;
  h += tdeeBanner();

  if (!state.welcomeDone && !Object.keys(state.products).length) {
    h += `<section class="card stack">
      <h2>Benvenuto in Bilancino</h2>
      <p class="muted" style="margin:0">Un diario alimentare tutto tuo: inserisci gli alimenti con i valori dell'etichetta, crea ricette, salva la spesa ricorrente. I dati restano su questo telefono.</p>
      <div class="grid2">
        <a class="btn soft sm" href="#/obiettivi">Imposta obiettivi</a>
        <a class="btn soft sm" href="#/prodotto/new?ret=${encodeURIComponent('#/oggi')}">Primo alimento</a>
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
        : `<span class="row"><label class="sr" for="qw">Peso in kg</label><input id="qw" class="input" inputmode="decimal" autocomplete="off" placeholder="kg" style="width:90px;height:40px"><button class="btn sm" data-act="quickWeight">Salva</button></span>`}
    </section>`;
  }

  // pasti
  const entries = state.diary[d] || [];
  const yest = state.diary[addDays(d, -1)] || [];
  const planned = (state.plan[d] || []).filter((it) => !it.logged && planItemSrc(it));
  const planChip = (mid) => {
    const pi = planned.filter((it) => it.meal === mid);
    if (!pi.length) return '';
    return `<button class="chip green" data-act="planLogMeal" data-meal="${esc(mid)}" style="height:34px;max-width:100%" aria-label="Registra dal piano: ${esc(pi.map((it) => planItemSrc(it).name).join(', '))}">${ic('plan', 15)}<span class="ellipsis">Dal piano: ${esc(pi.map((it) => planItemSrc(it).name).join(', '))}</span></button>`;
  };
  for (const m of S.meals) {
    const list = entries.filter((e) => e.meal === m.id);
    const kc = list.reduce((s, e) => s + (e.n.kcal || 0), 0);
    const addHref = `#/aggiungi?meal=${encodeURIComponent(m.id)}`;
    if (!list.length) {
      const canCopy = yest.some((e) => e.meal === m.id);
      h += `<section class="card dashed stack" style="padding:10px 10px 10px 16px;gap:6px">
        <div class="between"><h2>${esc(m.name)}</h2><a class="btn plain sm" href="${addHref}">+ Aggiungi</a></div>
        <div class="row wrap" style="gap:6px">
          ${planChip(m.id)}
          ${canCopy ? `<button class="chip" data-act="copyMeal" data-meal="${esc(m.id)}" style="height:34px">${ic('copy', 15)} Come ieri</button>` : ''}
          <button class="chip" data-act="mealTools" data-meal="${esc(m.id)}" style="height:34px">${ic('star', 15)} Preferiti e copia</button>
        </div>
      </section>`;
      continue;
    }
    const mt = {}; list.forEach((e) => addN(mt, e.n));
    h += `<section class="card" style="padding:12px 16px 6px">
      <div class="meal-head">
        <div class="stack" style="gap:0"><h2>${esc(m.name)}</h2><span class="small muted">P ${fmt(mt.p || 0)} · C ${fmt(mt.c || 0)} · G ${fmt(mt.f || 0)}</span></div>
        <span class="row" style="gap:0"><span class="small muted" style="font-weight:600;margin-right:2px">${fmt(kc)} kcal</span>
        <button class="icon-btn" data-act="favSave" data-meal="${esc(m.id)}" aria-label="Salva ${esc(m.name)} tra i preferiti" style="color:var(--muted)">${ic('star', 20)}</button>
        <a class="icon-btn" href="${addHref}" aria-label="Aggiungi a ${esc(m.name)}" style="color:var(--accent);margin-right:-10px">${ic('plus', 22, 2.2)}</a></span>
      </div>
      ${list.map((e) => `<button class="entry" data-act="editEntry" data-id="${e.id}">
        <span class="grow"><span class="t">${esc(e.label)}</span>${e.kind === 'recipe' ? ' <span class="tag">RICETTA</span>' : ''}<br><span class="small muted">${esc(qtyLabel(e.kind, sourceOf(e.kind, e.ref), e.qty, e.unit))}</span></span>
        <span class="k">${fmt(e.n.kcal)} kcal</span></button>`).join('')}
      ${planChip(m.id) ? `<div style="padding:4px 0 8px">${planChip(m.id)}</div>` : ''}
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
  const tabs = [['recenti', 'Recenti'], ['preferiti', 'Preferiti'], ['prodotti', 'Alimenti'], ['ricette', 'Ricette'], ['dispensa', 'Dispensa']];
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
    <input type="search" id="q" data-in="search" placeholder="Cerca alimenti e ricette…" value="${esc(ui.q)}" autocomplete="off"></label>
  <div class="seg tabs5" role="group" aria-label="Elenco">
    ${tabs.map(([k, l]) => `<button data-act="addTab" data-tab="${k}" aria-pressed="${ui.addTab === k}">${l}</button>`).join('')}
  </div>
  <div class="grid3">
    <a class="btn soft sm" href="#/prodotto/new?ret=add">+ Alimento</a>
    <a class="btn soft sm" href="#/ricetta/new?ret=${encodeURIComponent('#/aggiungi?tab=ricette')}">+ Ricetta</a>
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

const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'it', { sensitivity: 'base', numeric: true });
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
  if (ui.addTab === 'preferiti') return renderFavList(q);
  let items = allItems();
  const tab = ui.addTab;
  if (tab === 'prodotti') items = items.filter((i) => i.kind === 'product');
  if (tab === 'ricette') items = items.filter((i) => i.kind === 'recipe');
  if (tab === 'dispensa') items = items.filter((i) => i.kind === 'product' && i.src.pantry && i.src.pantry.on);
  // Recenti: dal più recente; tutte le altre schede: ordine alfabetico
  if (tab === 'recenti' && !q) items = items.filter((i) => i.src.lastUsed).sort((a, b) => b.src.lastUsed - a.src.lastUsed).slice(0, 40);
  else if (tab === 'recenti') items = items.filter((i) => matches(i.src, q)).sort((a, b) => (b.src.lastUsed || 0) - (a.src.lastUsed || 0) || byName(a.src, b.src));
  else items = items.filter((i) => matches(i.src, q)).sort((a, b) => byName(a.src, b.src));
  if (!items.length) {
    if (tab === 'recenti' && !q) return `<div class="empty"><strong>Nessun alimento recente</strong>Crea un alimento o una ricetta: comparirà qui dopo il primo utilizzo.</div>`;
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
    <label class="qty"><span class="sr">Quantità</span><input id="qtyIn" inputmode="decimal" autocomplete="off" data-in="qty" value="${fmtIn(ctx.qty)}"><span class="muted" id="qtyU" style="font-weight:600">${esc(shortUnit(ctx))}</span></label>
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
    consumeStock(c.kind, c.id, c.qty, c.unit);
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

/* ---------- pasti preferiti ---------- */
function favKcal(f) { return f.items.reduce((s, it) => s + (itemN(it).kcal || 0), 0); }
function itemN(it) { // valori aggiornati se l'alimento esiste ancora, altrimenti quelli salvati
  const src = sourceOf(it.kind, it.ref);
  if (src && it.kind !== 'quick') return nutrOf(it.kind, src, it.qty, it.unit);
  return it.n || {};
}
function renderFavList(q) {
  const favs = state.favorites.filter((f) => !q || norm(f.name + ' ' + f.items.map((i) => i.label).join(' ')).includes(norm(q))).sort(byName);
  if (!favs.length) return `<div class="empty"><strong>${q ? 'Nessun preferito trovato' : 'Nessun pasto preferito'}</strong>${q ? '' : 'Nel Diario tocca la stellina ☆ accanto a un pasto (es. la tua colazione tipo) per salvarlo qui. Poi lo aggiungi con un tocco.'}</div>`;
  return `<ul class="list">` + favs.map((f) => `<li><div class="li">
    <button class="grow" data-act="favOpen" data-id="${f.id}" style="background:none;border:0;text-align:left;padding:0;display:flex;flex-direction:column;gap:2px;min-width:0">
      <span class="t ellipsis">${esc(f.name)}</span>
      <span class="s ellipsis">${f.items.length} ${f.items.length === 1 ? 'voce' : 'voci'} · ${fmt(favKcal(f))} kcal</span>
      <span class="m ellipsis">${esc(f.items.map((i) => i.label).join(', '))}</span>
    </button>
    <button class="icon-btn soft" data-act="favOpen" data-id="${f.id}" aria-label="Aggiungi ${esc(f.name)}">${ic('plus', 20, 2.2)}</button>
  </div></li>`).join('') + `</ul>`;
}
function favSheetHtml(ctx) {
  const f = state.favorites.find((x) => x.id === ctx.id);
  const sel = ctx.sel;
  const tot = {}; f.items.forEach((it, i) => { if (sel[i]) addN(tot, itemN(it)); });
  const nSel = sel.filter(Boolean).length;
  return `<div class="between"><h2 style="font-size:21px">${esc(f.name)}</h2>
    <span class="row" style="gap:0"><button class="icon-btn" data-act="favRename" aria-label="Rinomina">${ic('edit', 20)}</button>
    <button class="icon-btn" data-act="favDelete" aria-label="Elimina preferito" style="color:var(--warn)">${ic('trash', 20)}</button></span></div>
  <ul class="list">${f.items.map((it, i) => `<li><label class="li" style="min-height:50px">
    <input type="checkbox" class="check" data-ch="favItem" data-i="${i}" ${sel[i] ? 'checked' : ''}>
    <span class="grow"><span class="t">${esc(it.label)}</span><br><span class="s">${esc(qtyLabel(it.kind, sourceOf(it.kind, it.ref), it.qty, it.unit))}</span></span>
    <span class="s">${fmt(itemN(it).kcal)} kcal</span></label></li>`).join('')}</ul>
  <div class="small muted" id="favTot">${nSel} ${nSel === 1 ? 'voce selezionata' : 'voci selezionate'} · <strong style="color:var(--ink)">${fmt(tot.kcal || 0)} kcal</strong> · P ${fmt(tot.p || 0)} · C ${fmt(tot.c || 0)} · G ${fmt(tot.f || 0)}</div>
  <label class="field"><span>Aggiungi a</span><select class="input" data-ch="sheetMeal">${state.settings.meals.map((m) => `<option value="${esc(m.id)}" ${m.id === ctx.meal ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
  <button class="btn block" data-act="favApply" ${nSel ? '' : 'disabled'} style="height:54px;font-size:16px">Aggiungi ${nSel} ${nSel === 1 ? 'voce' : 'voci'} · ${esc(cap(ui.date === today() ? 'oggi' : shortDate(ui.date)))}</button>
  <p class="small muted" style="margin:0">Togli la spunta a ciò che oggi non hai mangiato. I valori sono quelli attuali degli alimenti.</p>`;
}
function openFav(id, meal) {
  const f = state.favorites.find((x) => x.id === id);
  if (!f) return;
  const ctx = { type: 'fav', id, meal: meal || ui.meal || f.meal, sel: f.items.map(() => true) };
  openSheet(favSheetHtml(ctx), ctx);
}
function mealToolsHtml(meal) {
  const favs = [...state.favorites].sort(byName);
  const y = addDays(ui.date, -1);
  return `<h2 style="font-size:21px">${esc(mealName(meal))}: aggiungi in blocco</h2>
  <h3 class="section-label" style="margin:0">Pasti preferiti</h3>
  ${favs.length ? `<ul class="list">${favs.map((f) => `<li><button class="li" data-act="favOpen" data-id="${f.id}" data-meal="${esc(meal)}">
      <span class="grow" style="min-width:0"><span class="t ellipsis" style="display:block">${esc(f.name)}</span><span class="s ellipsis" style="display:block">${f.items.length} voci · ${fmt(favKcal(f))} kcal · ${esc(f.items.map((i) => i.label).join(', '))}</span></span>${ic('right', 18)}</button></li>`).join('')}</ul>`
    : `<p class="small muted" style="margin:0">Ancora nessuno. Quando un pasto è completo, tocca la stellina ☆ accanto al suo nome nel Diario per salvarlo come preferito.</p>`}
  <h3 class="section-label" style="margin:4px 0 0">Copia da un altro giorno</h3>
  <div class="row"><label class="field grow"><span>Data</span><input type="date" class="input" id="copyDate" value="${y}" max="${today()}"></label>
    <label class="field grow"><span>Pasto</span><select class="input" id="copyMeal">${state.settings.meals.map((m) => `<option value="${esc(m.id)}" ${m.id === meal ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label></div>
  <button class="btn soft block" data-act="copyFrom" data-meal="${esc(meal)}">${ic('copy', 18)} Copia in ${esc(mealName(meal))}</button>`;
}
function addItemsToDay(items, meal) {
  const day = (state.diary[ui.date] ||= []);
  items.forEach((it) => {
    const src = sourceOf(it.kind, it.ref);
    const n = itemN(it);
    day.push({ id: uid(), meal, kind: it.kind, ref: it.ref, qty: it.qty, unit: it.unit, label: src ? src.name : it.label, n });
    if (src) { src.lastUsed = Date.now(); src.uses = (src.uses || 0) + 1; consumeStock(it.kind, it.ref, it.qty, it.unit); }
  });
}

/* sheet per voci "rapide" o senza origine */
function quickSheetHtml(e) {
  const v = (k) => e && e.n[k] != null ? fmtIn(round(e.n[k], 1)) : '';
  return `<h2 style="font-size:21px">${e ? 'Modifica voce' : 'Aggiunta rapida'}</h2>
  <label class="field"><span>Descrizione</span><input class="input" id="qkName" value="${esc(e ? e.label : '')}" placeholder="Es. pizza al ristorante"></label>
  <div class="grid2">
    <label class="field"><span>Kcal</span><input class="input" id="qkK" inputmode="decimal" autocomplete="off" value="${v('kcal')}"></label>
    <label class="field"><span>Proteine (g)</span><input class="input" id="qkP" inputmode="decimal" autocomplete="off" value="${v('p')}"></label>
    <label class="field"><span>Carboidrati (g)</span><input class="input" id="qkC" inputmode="decimal" autocomplete="off" value="${v('c')}"></label>
    <label class="field"><span>Grassi (g)</span><input class="input" id="qkF" inputmode="decimal" autocomplete="off" value="${v('f')}"></label>
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
      <span class="row" style="gap:6px">${opts.extra || ''}<input class="n" inputmode="decimal" autocomplete="off" data-in="pn" data-k="${k}" id="pn-${k}" value="${fmtIn(k === 'kcal' && p.autoKcal ? round(kcalFrom(p.per100), 0) : p.per100[k])}" ${opts.ro ? 'readonly aria-readonly="true" style="color:var(--muted)"' : ''} placeholder="0"><span class="u">${esc(unit)}</span></span></label>`;
  const sub = (parent) => S.nutrients.filter((n) => n.parent === parent).map((n) => nrow(n.id, n.name, n.unit, { sub: true })).join('');
  const others = S.nutrients.filter((n) => !n.parent).map((n) => nrow(n.id, n.name, n.unit, { custom: !n.builtin })).join('');
  const ret = params.ret || '';
  return `
  <header class="between">
    <button class="link" data-act="pCancel">Annulla</button>
    <h2>${p.id ? 'Modifica alimento' : 'Nuovo alimento'}</h2>
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
    <label class="field grow"><span>Nome porzione</span><input class="input" id="svName" list="servNames" placeholder="vasetto, fetta, cucchiaio…">
      <datalist id="servNames">${servingNames().map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist></label>
    <label class="field" style="width:90px"><span>${unitOf(p)}</span><input class="input" id="svQty" inputmode="decimal" autocomplete="off" placeholder="150"></label>
    <button class="btn soft" data-act="pServAdd" style="align-self:flex-end">Aggiungi</button>
  </div>

  <h2>Dispensa e spesa</h2>
  <div class="card stack">
    <label class="between"><span><span style="font-weight:600">In casa adesso</span><br><span class="small muted">Facoltativo: si scala da solo quando registri nel diario e sale quando chiudi la spesa del piano pasti.</span></span>
      <span class="row" style="gap:6px"><input class="input" data-in="pStock" inputmode="decimal" autocomplete="off" value="${fmtIn(p.stock || null)}" placeholder="0" style="width:84px;text-align:right"><span class="muted">${unitOf(p)}</span></span></label>
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
  ${p.id ? `<button class="btn danger" data-act="pDelete">Elimina alimento</button>` : ''}
  <div class="footer-bar"><div><button class="btn block" data-act="pSave" data-ret="${esc(ret)}">Salva alimento</button></div></div>`;
};
const FREQS = [['settimana', 'Ogni settimana'], ['2settimane', 'Ogni 2 settimane'], ['mese', 'Ogni mese'], ['occasionale', 'Ogni tanto']];
const freqLabel = (k) => (FREQS.find((f) => f[0] === k) || [0, ''])[1];
function servingNames() {
  const set = new Set(['porzione', 'vasetto', 'fetta', 'cucchiaio', 'cucchiaino', 'tazza', 'bicchiere', 'confezione', 'pezzo']);
  Object.values(state.products).forEach((p) => (p.servings || []).forEach((s) => set.add(s.name)));
  return [...set].sort((a, b) => a.localeCompare(b, 'it'));
}
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
  if (!p.name.trim()) { toast('Dai un nome all’alimento'); return; }
  if (p.autoKcal) p.per100.kcal = round(kcalFrom(p.per100), 1);
  if (p.tagsTxt != null) { p.tags = p.tagsTxt.split(',').map((t) => t.trim()).filter(Boolean); delete p.tagsTxt; }
  const isNew = !p.id;
  if (isNew) { p.id = uid(); p.created = Date.now(); }
  delete p._for;
  state.products[p.id] = p;
  ui.pDraft = null;
  save();
  toast(isNew ? 'Alimento creato' : 'Alimento salvato');
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
    ui.rDraft._ret = params.ret || '';
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
      <span class="row" style="gap:4px;height:44px"><input data-in="rf" data-k="cooked" inputmode="decimal" autocomplete="off" value="${fmtIn(r.cooked)}" placeholder="–"
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
        <span class="grow" style="min-width:0"><span class="t ellipsis" style="display:block">${p ? esc(p.name) : '<em>alimento eliminato</em>'}</span><span class="s" id="rk-${i}">${fmt(n.kcal)} kcal</span></span>
        <label class="row" style="gap:4px"><span class="sr">Quantità</span><input class="input" data-in="rqty" data-i="${i}" inputmode="decimal" autocomplete="off" value="${fmtIn(it.qty)}" style="width:76px;height:40px;text-align:right"><span class="muted small">${p ? unitOf(p) : 'g'}</span></label>
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
  <label class="search">${ic('search', 20)}<span class="sr">Cerca</span><input type="search" data-in="pickSearch" placeholder="Cerca alimento…" autocomplete="off"></label>
  <div id="pickList">${pickerList('')}</div>
  <button class="btn soft" data-act="pickNew">+ Crea nuovo alimento</button>`;
}
function pickerList(q) {
  const ps = Object.values(state.products).filter((p) => matches(p, q)).sort(byName).slice(0, 80);
  if (!ps.length) return `<div class="empty">Nessun alimento trovato.</div>`;
  return `<ul class="list">${ps.map((p) => `<li><button class="li" data-act="rPick" data-id="${p.id}"><span class="grow"><span class="t">${esc(p.name)}</span><br><span class="s">${p.brand ? esc(p.brand) + ' · ' : ''}${fmt(per100(p).kcal)} kcal / 100 ${unitOf(p)}</span></span>${ic('plus', 20)}</button></li>`).join('')}</ul>`;
}
function saveRecipe(log) {
  const r = ui.rDraft;
  if (!r.name.trim()) { toast('Dai un nome alla ricetta'); return; }
  if (!r.items.length) { toast('Aggiungi almeno un ingrediente'); return; }
  const isNew = !r.id;
  if (isNew) { r.id = uid(); r.created = Date.now(); }
  const ret = r._ret;
  delete r._for; delete r._ret;
  r.items = r.items.filter((it) => state.products[it.pid] && it.qty > 0);
  state.recipes[r.id] = r;
  ui.rDraft = null;
  save();
  toast('Ricetta salvata');
  if (log) go(`#/aggiungi?open=r:${r.id}`);
  else go(ret || '#/alimenti?tab=ricette');
}

/* ================================================================
   SCHERMATA: ALIMENTI E RICETTE (libreria) — con Dispensa come scheda
   ================================================================ */
SCREENS.alimenti = function (id, params) {
  if (params.tab) ui.libTab = params.tab;
  const tab = ui.libTab;
  const ret = encodeURIComponent(`#/alimenti?tab=${tab}`);
  const counts = {
    alimenti: Object.keys(state.products).length,
    ricette: Object.keys(state.recipes).length,
    preferiti: state.favorites.length,
    dispensa: Object.values(state.products).filter((p) => p.pantry && p.pantry.on).length,
  };
  const tabs = [['alimenti', 'Alimenti'], ['ricette', 'Ricette'], ['preferiti', 'Preferiti'], ['dispensa', 'Dispensa']];
  const newBtn = tab === 'alimenti' ? `<a class="btn sm" href="#/prodotto/new?ret=${ret}">+ Nuovo</a>`
    : tab === 'ricette' ? `<a class="btn sm" href="#/ricetta/new?ret=${ret}">+ Nuova</a>`
    : tab === 'dispensa' ? `<a class="btn sm" href="#/prodotto/new?ret=${ret}&pantry=1">+ Nuovo</a>` : '';
  let h = `<header class="header"><h1 style="font-size:26px">Alimenti e ricette</h1>${newBtn}</header>
  <div class="seg tabs5" role="group" aria-label="Sezione">${tabs.map(([k, l]) => `<button data-act="libTab" data-tab="${k}" aria-pressed="${tab === k}">${l} <span style="font-weight:500;opacity:.7">${counts[k]}</span></button>`).join('')}</div>`;
  if (tab === 'dispensa') return h + dispensaBody();
  const ph = { alimenti: 'Cerca alimenti…', ricette: 'Cerca ricette…', preferiti: 'Cerca pasti preferiti…' }[tab];
  h += `<label class="search">${ic('search', 20)}<span class="sr">Cerca</span><input type="search" data-in="libSearch" placeholder="${ph}" value="${esc(ui.libQ)}" autocomplete="off"></label>
  <div id="libList">${libList()}</div>`;
  return h;
};
SCREENS.dispensa = function () { ui.libTab = 'dispensa'; return SCREENS.alimenti(null, {}); };

function libList() {
  const tab = ui.libTab, q = ui.libQ.trim();
  const ret = encodeURIComponent(`#/alimenti?tab=${tab}`);
  const chev = `<span style="color:var(--muted)">${ic('right', 18)}</span>`;
  if (tab === 'alimenti') {
    const ps = Object.values(state.products).filter((p) => matches(p, q)).sort(byName);
    if (!ps.length) return q ? `<div class="empty"><strong>Nessun risultato</strong><a href="#/prodotto/new?ret=${ret}&name=${encodeURIComponent(q)}">Crea “${esc(q)}”</a></div>`
      : `<div class="card empty"><strong>Nessun alimento</strong>Crea il primo con “+ Nuovo”, oppure carica gli alimenti di esempio da Personalizza.</div>`;
    return `<ul class="list">${ps.map((p) => { const n = per100(p); return `<li><a class="li" href="#/prodotto/${p.id}?ret=${ret}" style="text-decoration:none;color:inherit">
      <span class="grow" style="min-width:0;display:flex;flex-direction:column;gap:2px">
        <span class="t ellipsis">${esc(p.name)}</span>
        <span class="s ellipsis">${p.brand ? esc(p.brand) + ' · ' : ''}${fmt(n.kcal)} kcal / 100 ${unitOf(p)}${(p.servings || []).length ? ` · ${p.servings.length} porz.` : ''}</span>
        <span class="m">P ${fmt(n.p, 1)} · C ${fmt(n.c, 1)} · G ${fmt(n.f, 1)}</span></span>${chev}</a></li>`; }).join('')}</ul>`;
  }
  if (tab === 'ricette') {
    const rs = Object.values(state.recipes).filter((r) => matches(r, q)).sort(byName);
    if (!rs.length) return q ? `<div class="empty"><strong>Nessun risultato</strong></div>`
      : `<div class="card empty"><strong>Nessuna ricetta</strong>Crea la prima con “+ Nuova”: ingredienti, porzioni e peso da cotto.</div>`;
    return `<ul class="list">${rs.map((r) => { const inf = recipeInfo(r); const n = scaleN(inf.tot, 1 / (r.servings || 1)); return `<li><a class="li" href="#/ricetta/${r.id}?ret=${ret}" style="text-decoration:none;color:inherit">
      <span class="grow" style="min-width:0;display:flex;flex-direction:column;gap:2px">
        <span class="t ellipsis">${esc(r.name)}</span>
        <span class="s ellipsis">${fmt(r.servings, 1)} porzioni · ${fmt(n.kcal)} kcal a porzione (${fmt(inf.portionW)} g)</span>
        <span class="m ellipsis">${esc(r.items.map((it) => (state.products[it.pid] || {}).name).filter(Boolean).join(', '))}</span></span>${chev}</a></li>`; }).join('')}</ul>`;
  }
  // preferiti
  const fs = state.favorites.filter((f) => !q || norm(f.name + ' ' + f.items.map((i) => i.label).join(' ')).includes(norm(q))).sort(byName);
  if (!fs.length) return q ? `<div class="empty"><strong>Nessun risultato</strong></div>`
    : `<div class="card empty"><strong>Nessun pasto preferito</strong>Nel Diario, quando un pasto è completo, tocca la stellina ☆ accanto al suo nome per salvarlo qui.</div>`;
  return `<ul class="list">${fs.map((f) => `<li><button class="li" data-act="favEdit" data-id="${f.id}">
    <span class="grow" style="min-width:0;display:flex;flex-direction:column;gap:2px">
      <span class="t ellipsis">${esc(f.name)}</span>
      <span class="s ellipsis">${f.items.length} ${f.items.length === 1 ? 'voce' : 'voci'} · ${fmt(favKcal(f))} kcal</span>
      <span class="m ellipsis">${esc(f.items.map((i) => i.label).join(', '))}</span></span>${chev}</button></li>`).join('')}</ul>`;
}

/* modifica di un pasto preferito (dalla libreria) */
function favUnitLabel(it) {
  const src = sourceOf(it.kind, it.ref);
  if (it.unit === 'g') return src && it.kind === 'product' ? unitOf(src) : 'g';
  if (it.unit === 'portion') return 'porz.';
  const s = src && (src.servings || []).find((x) => x.id === it.unit);
  return s ? s.name : '';
}
function favEditHtml(f) {
  return `<h2 style="font-size:21px">Modifica preferito</h2>
  <label class="field"><span>Nome</span><input class="input" data-in="favName" value="${esc(f.name)}"></label>
  <ul class="list">${f.items.map((it, i) => {
    const src = sourceOf(it.kind, it.ref);
    return `<li><div class="li" style="padding-right:4px">
      <span class="grow" style="min-width:0"><span class="t ellipsis" style="display:block">${esc(src ? src.name : it.label)}</span><span class="s" id="fk-${i}">${fmt(itemN(it).kcal)} kcal</span></span>
      ${it.kind !== 'quick' && src ? `<label class="row" style="gap:4px"><span class="sr">Quantità</span><input class="input" data-in="favQty" data-i="${i}" inputmode="decimal" autocomplete="off" value="${fmtIn(it.qty)}" style="width:72px;height:40px;text-align:right"><span class="muted small ellipsis" style="max-width:64px">${esc(favUnitLabel(it))}</span></label>` : ''}
      <button class="icon-btn" data-act="favItemDel" data-i="${i}" aria-label="Rimuovi ${esc(it.label)}">${ic('x', 18)}</button></div></li>`;
  }).join('') || '<li><div class="empty">Nessuna voce.</div></li>'}</ul>
  <div class="small muted" id="favEditTot">Totale ${fmt(favKcal(f))} kcal</div>
  <div class="grid2"><button class="btn danger" data-act="favDelete">Elimina</button><button class="btn" data-act="favEditDone">Fatto</button></div>
  ${f.items.length ? `<button class="btn soft" data-act="favUse">Aggiungi al diario</button>` : ''}`;
}

/* ---------- dispensa (scheda della libreria) ---------- */
function dispensaBody() {
  const all = Object.values(state.products).filter((p) => p.pantry && p.pantry.on);
  const f = ui.pantryFilter;
  const items = f === 'all' ? all : all.filter((p) => p.pantry.freq === f);
  const inList = all.filter((p) => p.pantry.inList).length + state.shopping.extra.length;
  let h = `<div class="grid2">
    <a class="btn soft sm" href="#/piano">${ic('plan', 16)} Piano pasti</a>
    <a class="btn soft sm" href="#/spesa">${ic('basket', 16)} Lista della spesa</a>
  </div>
  <div class="chips scroll">
    <button class="chip ${f === 'all' ? 'on' : ''}" data-act="pFilter" data-f="all">Tutti</button>
    ${FREQS.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="pFilter" data-f="${k}">${l}</button>`).join('')}
  </div>`;
  if (!all.length) {
    h += `<div class="card empty"><strong>La dispensa è vuota</strong>Quando crei o modifichi un alimento, spunta “Lo compro regolarmente”: comparirà qui, raggruppato per reparto, e potrai metterlo nella lista della spesa con un tocco.</div>`;
  } else {
    const groups = {};
    items.forEach((p) => { const a = p.pantry.aisle || 'Senza reparto'; (groups[a] ||= []).push(p); });
    const order = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'it'));
    if (f !== 'all' && items.length) h += `<button class="btn soft sm" data-act="addFreqToList" data-f="${f}">Metti tutti in lista spesa</button>`;
    const ret = encodeURIComponent('#/alimenti?tab=dispensa');
    for (const a of order) {
      h += `<h3 class="section-label">${esc(a)}</h3><ul class="list">` + groups[a].sort(byName).map((p) => `<li><div class="li" style="padding:6px 8px 6px 14px">
        <input type="checkbox" class="check" data-ch="inList" data-id="${p.id}" ${p.pantry.inList ? 'checked' : ''} aria-label="${esc(p.name)} nella lista spesa">
        <a href="#/prodotto/${p.id}?ret=${ret}" class="grow" style="text-decoration:none;color:inherit;min-width:0"><span class="t ellipsis" style="display:block">${esc(p.name)}${p.brand ? ` · <span class="muted" style="font-weight:500">${esc(p.brand)}</span>` : ''}</span>
          <span class="s">${[p.pantry.pack, freqLabel(p.pantry.freq), p.stock > 0 ? `in casa ${fmt(p.stock)} ${unitOf(p)}` : ''].filter(Boolean).map(esc).join(' · ')}</span></a>
        <a class="icon-btn soft" href="#/aggiungi?open=p:${p.id}" aria-label="Registra ${esc(p.name)} nel diario">${ic('plus', 20, 2.2)}</a>
      </div></li>`).join('') + `</ul>`;
    }
    if (!items.length) h += `<div class="empty">Nessun alimento con questa frequenza.</div>`;
  }
  h += `<div style="height:70px"></div><div class="floating"><a class="card dark between" href="#/spesa" style="text-decoration:none;padding:12px 12px 12px 16px;box-shadow:var(--shadow)">
    <span class="stack" style="gap:0"><strong>Lista della spesa · ${inList + shopPlan().rows.filter((r) => r.buy > 0).length}</strong><span class="small muted">Dispensa + piano pasti</span></span>
    <span class="btn sm" style="background:var(--on-dark);color:var(--dark)">Apri</span></a></div>`;
  return h;
}

/* ---------- lista della spesa ---------- */
const SHOP_RANGES = [['next7', 'Prossimi 7 giorni'], ['week', 'Fino a domenica'], ['nextweek', 'Settimana prossima']];
function shopPlan() {
  const t = today();
  let from = t, to = addDays(t, 6);
  if (ui.shopRange === 'week') to = addDays(mondayOf(t), 6);
  if (ui.shopRange === 'nextweek') { from = addDays(mondayOf(t), 7); to = addDays(from, 6); }
  const need = planNeeds(from, to);
  const rows = Object.keys(need).map((pid) => {
    const p = state.products[pid]; const stock = p.stock || 0;
    return { p, need: need[pid], stock, buy: Math.max(0, need[pid] - stock) };
  }).sort((a, b) => (a.p.pantry && a.p.pantry.aisle || '~').localeCompare(b.p.pantry && b.p.pantry.aisle || '~', 'it') || byName(a.p, b.p));
  return { from, to, rows };
}
function packHint(p, g) {
  const s = [...(p.servings || [])].sort((a, b) => b.qty - a.qty)[0];
  return s && s.qty >= 20 ? ` ≈ ${fmt(Math.ceil(g / s.qty))} × ${s.name}` : '';
}
SCREENS.spesa = function () {
  const ps = Object.values(state.products).filter((p) => p.pantry && p.pantry.on && p.pantry.inList);
  const ch = state.shopping.checked;
  const pc = state.shopping.planChecked;
  const sp = shopPlan();
  const toBuy = sp.rows.filter((r) => r.buy > 0);
  const inHouse = sp.rows.filter((r) => r.buy <= 0);
  const groups = {};
  ps.forEach((p) => { const a = p.pantry.aisle || 'Senza reparto'; (groups[a] ||= []).push(p); });
  const nChecked = ps.filter((p) => ch[p.id]).length + state.shopping.extra.filter((e) => e.checked).length + toBuy.filter((r) => pc[r.p.id]).length;
  let h = `<header class="topbar">
    <button class="icon-btn" data-act="back" aria-label="Indietro" style="margin-left:-12px">${ic('back', 24)}</button>
    <h1 class="grow">Lista della spesa</h1>
  </header>
  <section class="card stack" aria-label="Dal piano pasti">
    <div class="between"><h2>Dal piano pasti</h2>
      <label><span class="sr">Periodo</span><select class="input" data-ch="shopRange" style="height:38px;width:auto;font-size:14px;font-weight:600">
        ${SHOP_RANGES.map(([k, l]) => `<option value="${k}" ${ui.shopRange === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    ${!sp.rows.length ? `<p class="small muted" style="margin:0">Nessun pasto pianificato dal ${shortDate(sp.from)} al ${shortDate(sp.to)} (contano solo le voci non ancora registrate). <a href="#/piano">Apri il piano pasti</a></p>`
      : `<span class="small muted">Ingredienti delle voci pianificate dal ${shortDate(sp.from)} al ${shortDate(sp.to)}, meno quello che hai in casa.</span>
      ${toBuy.length ? `<ul class="list">${toBuy.map((r) => `<li><div class="li" style="padding:8px 8px 8px 14px">
        <input type="checkbox" class="check" data-ch="planCheck" data-id="${r.p.id}" ${pc[r.p.id] ? 'checked' : ''} aria-label="Preso: ${esc(r.p.name)}">
        <span class="grow" style="min-width:0;${pc[r.p.id] ? 'text-decoration:line-through;color:var(--muted)' : ''}"><span class="t ellipsis" style="display:block">${esc(r.p.name)}</span>
          <span class="s">servono ${fmt(r.need)} ${unitOf(r.p)}${r.stock > 0 ? ` · in casa ${fmt(r.stock)}` : ''}</span></span>
        <span style="text-align:right;white-space:nowrap"><strong>${fmt(r.buy)} ${unitOf(r.p)}</strong>${packHint(r.p, r.buy) ? `<br><span class="s">${esc(packHint(r.p, r.buy))}</span>` : ''}</span>
      </div></li>`).join('')}</ul>` : `<p class="small" style="margin:0">Hai già in casa tutto quello che serve.</p>`}
      ${inHouse.length ? `<span class="small muted">Già in casa: ${esc(inHouse.map((r) => r.p.name).join(', '))}</span>` : ''}`}
  </section>
  <h3 class="section-label">Dispensa e voci libere</h3>
  <div class="row"><label class="sr" for="extraIn">Aggiungi voce libera</label><input id="extraIn" class="input grow" placeholder="Aggiungi voce libera (es. detersivo)"><button class="btn soft" data-act="extraAdd">Aggiungi</button></div>`;
  if (!ps.length && !state.shopping.extra.length) h += `<p class="small muted" style="margin:0 4px">Spunta gli alimenti nella dispensa per aggiungerli qui.</p>`;
  for (const a of Object.keys(groups).sort((x, y) => x.localeCompare(y, 'it'))) {
    h += `<h3 class="section-label">${esc(a)}</h3><ul class="list">` + groups[a].sort(byName).map((p) => `<li><label class="li">
      <input type="checkbox" class="check" data-ch="shopCheck" data-id="${p.id}" ${ch[p.id] ? 'checked' : ''}>
      <span class="grow" style="${ch[p.id] ? 'text-decoration:line-through;color:var(--muted)' : ''}"><span class="t">${esc(p.name)}</span>${p.pantry.pack ? `<br><span class="s">${esc(p.pantry.pack)}</span>` : ''}</span></label></li>`).join('') + `</ul>`;
  }
  if (state.shopping.extra.length) {
    h += `<h3 class="section-label">Altro</h3><ul class="list">` + state.shopping.extra.map((e) => `<li><div class="li">
      <input type="checkbox" class="check" data-ch="extraCheck" data-id="${e.id}" ${e.checked ? 'checked' : ''} aria-label="${esc(e.name)}">
      <span class="grow t" style="${e.checked ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(e.name)}</span>
      <button class="icon-btn" data-act="extraDel" data-id="${e.id}" aria-label="Rimuovi">${ic('x', 18)}</button></div></li>`).join('') + `</ul>`;
  }
  h += `<div class="footer-bar"><div><button class="btn block" data-act="shopDone" ${nChecked ? '' : 'disabled'}>Fine spesa · ${nChecked} ${nChecked === 1 ? 'preso' : 'presi'}</button></div></div>`;
  return h;
};

/* ================================================================
   PIANO PASTI SETTIMANALE
   ================================================================ */
const mondayOf = (d) => addDays(d, -weekday(d));
const WDL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
function planItemSrc(it) { return it.kind === 'fav' ? state.favorites.find((f) => f.id === it.ref) : sourceOf(it.kind, it.ref); }
function planItemN(it) {
  const src = planItemSrc(it);
  if (!src) return {};
  if (it.kind === 'fav') { const t = {}; src.items.forEach((x) => addN(t, itemN(x))); return scaleN(t, it.qty || 1); }
  return nutrOf(it.kind, src, it.qty, it.unit);
}
function planUnitLabel(it) {
  const src = planItemSrc(it);
  if (it.kind === 'fav') return '× pasto';
  if (it.unit === 'portion') return 'porz.';
  if (it.unit === 'g') return src ? unitOf(src) : 'g';
  const s = src && (src.servings || []).find((x) => x.id === it.unit);
  return s ? s.name : '';
}
/* scompone una voce (alimento o ricetta) nei grammi dei singoli alimenti */
function expandProducts(kind, ref, qty, unit, mult, cb) {
  if (kind === 'product') { const p = state.products[ref]; if (p) cb(ref, gramsOf(p, qty, unit) * mult); }
  else if (kind === 'recipe') {
    const r = state.recipes[ref]; if (!r) return;
    const inf = recipeInfo(r);
    const f = unit === 'portion' ? qty / (r.servings || 1) : (inf.weight ? qty / inf.weight : 0);
    r.items.forEach((x) => { if (state.products[x.pid]) cb(x.pid, x.qty * f * mult); });
  }
}
function planNeeds(from, to) {
  const need = {};
  const add = (pid, g) => { if (g > 0) need[pid] = (need[pid] || 0) + g; };
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const it of state.plan[d] || []) {
      if (it.logged) continue;
      if (it.kind === 'fav') { const f = planItemSrc(it); if (f) f.items.forEach((x) => expandProducts(x.kind, x.ref, x.qty, x.unit, it.qty || 1, add)); }
      else expandProducts(it.kind, it.ref, it.qty, it.unit, 1, add);
    }
  }
  return need;
}
/* "in casa": scala le quantità quando si registra qualcosa nel diario */
function consumeStock(kind, ref, qty, unit, mult = 1) {
  expandProducts(kind, ref, qty, unit, mult, (pid, g) => {
    const p = state.products[pid];
    if (p && p.stock > 0) p.stock = Math.max(0, round(p.stock - g, 1));
  });
}
function logPlanItems(date, items) {
  const day = (state.diary[date] ||= []);
  let n = 0;
  for (const it of items) {
    const src = planItemSrc(it);
    if (!src) continue;
    if (it.kind === 'fav') {
      const m = it.qty || 1;
      for (const x of src.items) {
        const xs = sourceOf(x.kind, x.ref);
        day.push({ id: uid(), meal: it.meal, kind: x.kind, ref: x.ref, qty: x.kind === 'quick' ? 1 : x.qty * m, unit: x.unit, label: xs ? xs.name : x.label, n: scaleN(itemN(x), m) });
        if (xs) { consumeStock(x.kind, x.ref, x.qty, x.unit, m); xs.lastUsed = Date.now(); }
        n++;
      }
      src.lastUsed = Date.now();
    } else {
      day.push({ id: uid(), meal: it.meal, kind: it.kind, ref: it.ref, qty: it.qty, unit: it.unit, label: src.name, n: nutrOf(it.kind, src, it.qty, it.unit) });
      consumeStock(it.kind, it.ref, it.qty, it.unit);
      src.lastUsed = Date.now(); src.uses = (src.uses || 0) + 1;
      n++;
    }
    it.logged = true;
  }
  return n;
}
SCREENS.piano = function (id, params) {
  if (params.w) ui.planWeek = params.w;
  const t = today();
  const w0 = ui.planWeek || mondayOf(t);
  const weekHas = [0, 1, 2, 3, 4, 5, 6].some((i) => (state.plan[addDays(w0, i)] || []).length);
  let h = `<header class="topbar">
    <button class="icon-btn" data-act="back" aria-label="Indietro" style="margin-left:-12px">${ic('back', 24)}</button>
    <h1 class="grow">Piano pasti</h1>
    <a class="btn soft sm" href="#/spesa">${ic('basket', 16)} Spesa</a>
  </header>
  <div class="between">
    <button class="icon-btn outline" data-act="planWeek" data-d="-7" aria-label="Settimana precedente">${ic('left')}</button>
    <button class="link" data-act="planWeek" data-d="0" style="color:var(--ink);text-align:center"><strong>${shortDate(w0)} – ${shortDate(addDays(w0, 6))}</strong><br><span class="small muted" style="font-weight:500">${w0 === mondayOf(t) ? 'questa settimana' : 'torna a questa settimana'}</span></button>
    <button class="icon-btn outline" data-act="planWeek" data-d="7" aria-label="Settimana successiva">${ic('right')}</button>
  </div>
  <div class="row wrap" style="gap:8px">
    <button class="chip" data-act="planCopyPrev">${ic('copy', 15)} Copia settimana precedente</button>
    ${weekHas ? `<button class="chip" data-act="planClearWeek">${ic('trash', 15)} Svuota settimana</button>` : ''}
  </div>`;
  if (!Object.keys(state.recipes).length && !state.favorites.length && !Object.keys(state.products).length) {
    h += `<div class="card empty"><strong>Niente da pianificare, per ora</strong>Crea alimenti, ricette o pasti preferiti: poi potrai distribuirli sui giorni della settimana.</div>`;
  }
  for (let i = 0; i < 7; i++) {
    const d = addDays(w0, i);
    const items = state.plan[d] || [];
    const tot = {}; items.forEach((it) => addN(tot, planItemN(it)));
    const dt = dayType(d);
    const pending = items.filter((it) => !it.logged && planItemSrc(it));
    if (!items.length) {
      h += `<section class="card between" style="padding:6px 6px 6px 14px${d === t ? ';border-color:var(--accent)' : ''}" aria-label="${WDL[i]} ${shortDate(d)}">
        <span class="row" style="gap:8px"><h2>${WDL[i]} ${toDate(d).getDate()}</h2>${d === t ? '<span class="tag">OGGI</span>' : ''}<span class="small muted">${esc(dt.name)}</span></span>
        <button class="btn plain sm" data-act="planAdd" data-d="${d}">+ Pianifica</button></section>`;
      continue;
    }
    h += `<section class="card stack" style="gap:8px;padding:12px 14px${d === t ? ';border-color:var(--accent)' : ''}" aria-label="${WDL[i]} ${shortDate(d)}">
      <div class="between">
        <h2>${WDL[i]} ${toDate(d).getDate()}${d === t ? ' <span class="tag">OGGI</span>' : ''}</h2>
        <span class="small ${items.length && tot.kcal > dt.kcal * 1.05 ? 'over' : 'muted'}" style="font-weight:600">${items.length ? `${fmt(tot.kcal || 0)} / ${fmt(dt.kcal)} kcal` : esc(dt.name)}</span>
      </div>`;
    for (const m of state.settings.meals) {
      const mi = items.filter((it) => it.meal === m.id);
      if (!mi.length) continue;
      h += `<div class="small muted" style="font-weight:700;margin-top:2px">${esc(m.name)}</div>` + mi.map((it) => {
        const src = planItemSrc(it);
        const n = planItemN(it);
        return `<div class="row" style="gap:6px;min-height:44px;border-top:1px solid var(--line-2);padding-top:4px">
          <span class="grow" style="min-width:0"><span class="ellipsis" style="display:block;font-size:14px;font-weight:600;${it.logged ? 'color:var(--muted)' : ''}">${src ? esc(src.name) : '<em>eliminato</em>'}${it.kind === 'recipe' ? ' <span class="tag">RICETTA</span>' : it.kind === 'fav' ? ' <span class="tag">PREFERITO</span>' : ''}</span>
            <span class="small muted">${it.logged ? '✓ registrato nel diario · ' : ''}${fmt(n.kcal || 0)} kcal</span></span>
          ${it.logged ? '' : `<label class="row" style="gap:4px"><span class="sr">Quantità</span><input class="input" data-ch="planQty" data-d="${d}" data-id="${it.id}" inputmode="decimal" autocomplete="off" value="${fmtIn(it.qty)}" style="width:62px;height:38px;text-align:right;padding:0 8px"><span class="small muted ellipsis" style="max-width:56px">${esc(planUnitLabel(it))}</span></label>`}
          <button class="icon-btn" data-act="planDel" data-d="${d}" data-id="${it.id}" aria-label="Togli dal piano" style="width:36px">${ic('x', 18)}</button>
        </div>`;
      }).join('');
    }
    h += `<div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:wrap">
      ${pending.length ? `<button class="btn soft sm" data-act="planLogDay" data-d="${d}">Registra nel diario</button>` : ''}
      <button class="btn plain sm" data-act="planAdd" data-d="${d}">+ Pianifica</button></div></section>`;
  }
  return h;
};
function planPickerHtml(ctx) {
  const tabs = [['ricette', 'Ricette'], ['preferiti', 'Preferiti'], ['alimenti', 'Alimenti']];
  return `<div class="between"><h2 style="font-size:21px">${WDL[weekday(ctx.date)]} ${toDate(ctx.date).getDate()}</h2><button class="btn plain sm" data-act="sheetClose">Fatto</button></div>
  <label class="field"><span>Pasto</span><select class="input" data-ch="planMeal">${state.settings.meals.map((m) => `<option value="${esc(m.id)}" ${m.id === ctx.meal ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
  <div class="seg" role="group" aria-label="Cosa pianificare">${tabs.map(([k, l]) => `<button data-act="planTab" data-tab="${k}" aria-pressed="${ui.planTab === k}">${l}</button>`).join('')}</div>
  <label class="search">${ic('search', 20)}<span class="sr">Cerca</span><input type="search" data-in="planSearch" placeholder="Cerca…" autocomplete="off" value="${esc(ctx.q || '')}"></label>
  <div id="planList">${planPickList(ctx.q || '')}</div>`;
}
function planPickList(q) {
  let list;
  if (ui.planTab === 'ricette') list = Object.values(state.recipes).filter((r) => matches(r, q)).sort(byName).map((r) => ({ kind: 'recipe', src: r, sub: `${fmt(scaleN(recipeInfo(r).tot, 1 / (r.servings || 1)).kcal)} kcal a porzione` }));
  else if (ui.planTab === 'preferiti') list = state.favorites.filter((f) => !q || norm(f.name).includes(norm(q))).sort(byName).map((f) => ({ kind: 'fav', src: f, sub: `${f.items.length} voci · ${fmt(favKcal(f))} kcal` }));
  else list = Object.values(state.products).filter((p) => matches(p, q)).sort(byName).map((p) => ({ kind: 'product', src: p, sub: `${fmt(per100(p).kcal)} kcal / 100 ${unitOf(p)}` }));
  if (!list.length) return `<div class="empty">Niente da mostrare.</div>`;
  return `<ul class="list">${list.slice(0, 80).map((x) => `<li><button class="li" data-act="planPick" data-kind="${x.kind}" data-id="${x.src.id}">
    <span class="grow" style="min-width:0"><span class="t ellipsis" style="display:block">${esc(x.src.name)}</span><span class="s">${x.sub}</span></span>${ic('plus', 20)}</button></li>`).join('')}</ul>`;
}

/* ================================================================
   TDEE ADATTIVO — dispendio reale da calorie registrate e trend del peso
   ================================================================ */
const TDEE_WINDOW = 28, TDEE_MIN_DAYS = 14, TDEE_MIN_WEIGHTS = 4, TDEE_MIN_SPAN = 10;
function tdeeCalc() {
  const end = addDays(today(), -1);              // oggi è incompleto: si esclude
  const start = addDays(end, -(TDEE_WINDOW - 1));
  let n = 0, sum = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const e = state.diary[d];
    if (e && e.length) { const k = dayTotals(d).kcal || 0; if (k > 0) { n++; sum += k; } }
  }
  const ws = state.weights.filter((w) => w.date >= addDays(start, -3) && w.date <= today()).sort((a, b) => a.date.localeCompare(b.date));
  const span = ws.length > 1 ? Math.round((toDate(ws[ws.length - 1].date) - toDate(ws[0].date)) / 864e5) : 0;
  const base = { n, nw: ws.length, span };
  if (n < TDEE_MIN_DAYS || ws.length < TDEE_MIN_WEIGHTS || span < TDEE_MIN_SPAN) return { ...base, ok: false };
  // regressione lineare del peso: kg al giorno
  const xs = ws.map((w) => (toDate(w.date) - toDate(start)) / 864e5), ys = ws.map((w) => w.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  const slope = sxx ? sxy / sxx : 0;
  const intake = sum / n;
  const tdee = intake - slope * 7700;
  if (!(tdee > 1000 && tdee < 6000)) return { ...base, ok: false, implausible: true };
  const rate = state.goals.rate || 0;
  const suggested = Math.round((tdee + rate * 7700 / 7) / 10) * 10;
  let cur = 0; for (let i = 0; i < 7; i++) cur += dayType(addDays(today(), i)).kcal || 0; cur /= 7;
  return { ...base, ok: true, intake, slope, weekly: slope * 7, tdee: Math.round(tdee / 10) * 10, rate, suggested, current: Math.round(cur), delta: Math.round(suggested - cur) };
}
function tdeeCard() {
  const r = tdeeCalc();
  let h = `<section class="card stack" aria-label="Dispendio reale stimato"><div class="between"><h2>Dispendio reale</h2><span class="tag">ADATTIVO</span></div>`;
  if (!r.ok) {
    if (r.implausible) h += `<p class="small" style="margin:0">Con i dati delle ultime 4 settimane il calcolo dà un risultato poco plausibile. Di solito succede quando alcune giornate non sono registrate per intero.</p>`;
    else {
      const bar = (v, max, l) => `<div class="stack" style="gap:4px"><div class="between small"><span>${l}</span><strong>${Math.min(v, max)}/${max}</strong></div><div class="bar"><i style="width:${clamp(v / max * 100, 0, 100)}%;background:var(--accent)"></i></div></div>`;
      h += `<p class="small muted" style="margin:0">L'app calcola quante calorie bruci davvero confrontando quello che registri con l'andamento del peso. Nelle ultime 4 settimane servono:</p>
        ${bar(r.n, TDEE_MIN_DAYS, 'Giornate registrate')}${bar(r.nw, TDEE_MIN_WEIGHTS, 'Pesate')}${bar(r.span, TDEE_MIN_SPAN, 'Giorni tra prima e ultima pesata')}`;
    }
    return h + `</section>`;
  }
  const rateTxt = r.rate === 0 ? 'mantenere il peso' : `${r.rate < 0 ? 'perdere' : 'prendere'} ${fmt(Math.abs(r.rate), 2)} kg a settimana`;
  const big = Math.abs(r.delta) >= 50;
  h += `<div class="row" style="align-items:baseline;gap:6px"><strong class="num" style="font-size:28px">${fmt(r.tdee)}</strong><span class="muted">kcal al giorno</span></div>
  <div class="small muted">Ultime 4 settimane: in media ${fmt(r.intake)} kcal registrate in ${r.n} giornate; il peso è ${r.weekly < 0 ? 'sceso' : 'salito'} di ${fmt(Math.abs(r.weekly), 2)} kg a settimana (${r.nw} pesate).</div>
  <div class="small" style="background:var(--bg);border-radius:10px;padding:8px 10px">Per ${rateTxt} servono circa <strong>${fmt(r.suggested)} kcal</strong> al giorno. I tuoi obiettivi dei prossimi 7 giorni sono in media ${fmt(r.current)} kcal${big ? `: <strong>${r.delta > 0 ? '+' : '−'}${fmt(Math.abs(r.delta))} kcal</strong> da correggere.` : ', quindi sono già allineati.'}</div>
  ${big ? `<button class="btn" data-act="tdeeApply">Applica ${r.delta > 0 ? '+' : '−'}${fmt(Math.abs(r.delta))} kcal agli obiettivi</button>` : ''}
  <p class="small muted" style="margin:0">Stima statistica, aggiornata ogni giorno. Contano solo le giornate con almeno una voce: registrale per intero. La correzione vale per tutti i tipi di giornata; le proteine restano uguali e la differenza si divide tra carboidrati e grassi. Il ritmo si cambia in Obiettivi.</p>
  </section>`;
  return h;
}
function tdeeBanner() {
  if (ui.date !== today()) return '';
  const r = tdeeCalc();
  const lr = state.tdee.lastReview;
  if (!r.ok || Math.abs(r.delta) < 100 || (lr && lr > addDays(today(), -7))) return '';
  return `<section class="card stack" style="border-color:var(--accent);gap:8px" aria-label="Nuova stima del dispendio">
    <strong>Nuova stima: bruci circa ${fmt(r.tdee)} kcal al giorno</strong>
    <span class="small muted">Per il ritmo che hai scelto i tuoi obiettivi andrebbero ${r.delta > 0 ? 'alzati' : 'abbassati'} di circa ${fmt(Math.abs(r.delta))} kcal.</span>
    <div class="row wrap" style="gap:8px"><button class="btn sm" data-act="tdeeApply">Applica</button><a class="btn soft sm" href="#/obiettivi">Dettagli</a><button class="btn plain sm" data-act="tdeeSnooze">Più tardi</button></div>
  </section>`;
}
function applyTdee() {
  const r = tdeeCalc();
  if (!r.ok) return;
  const d = r.delta;
  for (const t of state.goals.dayTypes) {
    const ck = (t.c || 0) * 4, fk = (t.f || 0) * 9, tot = ck + fk;
    t.kcal = Math.max(800, Math.round(((t.kcal || 0) + d) / 10) * 10);
    if (tot > 0) {
      t.c = Math.max(0, Math.round((t.c || 0) + d * (ck / tot) / 4));
      t.f = Math.max(0, Math.round((t.f || 0) + d * (fk / tot) / 9));
    } else t.c = Math.max(0, Math.round((t.c || 0) + d / 4));
  }
  state.tdee.lastReview = today();
  state.tdee.history.push({ date: today(), tdee: r.tdee, delta: d });
  if (state.tdee.history.length > 60) state.tdee.history = state.tdee.history.slice(-60);
  save();
  toast(`Obiettivi ${d > 0 ? 'alzati' : 'abbassati'} di ${fmt(Math.abs(d))} kcal`);
}

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
      <label class="field"><span>Obiettivo (kg)</span><input class="input" inputmode="decimal" autocomplete="off" data-ch="gTarget" value="${fmtIn(g.target)}" placeholder="es. 74"></label>
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
  ${tdeeCard()}
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
    <label class="field"><span>Calorie (kcal)</span><input class="input" inputmode="decimal" autocomplete="off" data-ch="dtF" data-id="${d.id}" data-k="kcal" value="${fmtIn(d.kcal)}" style="font-weight:700;font-size:18px"></label>
    <div class="grid3">
      ${MACROS.map((m) => `<label class="field"><span style="display:flex;align-items:center;gap:5px"><i class="dot" style="background:${m.color}"></i>${m.name}</span>
        <input class="input" inputmode="decimal" autocomplete="off" data-ch="dtF" data-id="${d.id}" data-k="${m.k}" value="${fmtIn(d[m.k])}"></label>`).join('')}
    </div>
    <div id="dti-${d.id}">${dayTypeInfo(d)}</div>
    ${visN.length ? `<div class="grid3">${visN.map((n) => `<label class="field"><span class="ellipsis">${esc(n.name)} (${esc(n.unit)})</span><input class="input" inputmode="decimal" autocomplete="off" data-ch="dtX" data-id="${d.id}" data-k="${n.id}" value="${fmtIn(d.extra && d.extra[n.id])}" placeholder="–"></label>`).join('')}</div>` : ''}
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
    kcalDays.push({ date: d, tot, dt: dayType(d) });
    if (tot) { tracked++; kcalSum += tot.kcal || 0; if ((tot.p || 0) >= (dayType(d).p || 0) * 0.95) pHit++; }
  }
  const variation = trend.length > 1 ? trend[trend.length - 1].kg - trend[0].kg : null;
  const lw = latestWeight();
  const ranges = [[7, '1S'], [30, '1M'], [90, '3M'], [180, '6M'], [365, '1A']];
  let h = `<header class="header"><h1>Progressi</h1>
    <div class="seg" role="group" aria-label="Periodo">${ranges.map(([r, l]) => `<button data-act="range" data-r="${r}" aria-pressed="${ui.range === r}" style="width:36px;padding:0">${l}</button>`).join('')}</div></header>
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
  ${tdeeCard()}
  <section class="card stack" aria-label="Ripartizione dei macronutrienti">
    <div class="between"><h2>Macronutrienti</h2>
      <label><span class="sr">Periodo</span><select class="input" data-ch="pieRange" style="height:38px;width:auto;font-size:14px;font-weight:600">
        ${[['today', 'Oggi'], ['7', 'Media 7 giorni'], ['30', 'Media 30 giorni'], ['all', 'Media di sempre']].map(([k, l]) => `<option value="${k}" ${ui.pieRange === k ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label></div>
    <div id="pieBox">${macroPie()}</div>
  </section>
  <section class="card stack" aria-label="Calorie per giorno" style="padding:14px 12px 10px">
    <h2 style="padding:0 4px">Calorie e macro</h2>
    <div id="kBox">${kcalChart(kcalDays)}</div>
  </section>
  <section class="card stack" aria-label="Registra misure">
    <h2>Registra</h2>
    <div class="grid2">
      <label class="field"><span>Data</span><input class="input" type="date" id="wDate" value="${t}" max="${t}"></label>
      <label class="field"><span>Peso (kg)</span><input class="input" id="wKg" inputmode="decimal" autocomplete="off" placeholder="es. 78,2"></label>
      ${state.settings.measures.map((m, i) => `<label class="field"><span>${esc(m)} (cm)</span><input class="input" data-meas="${i}" inputmode="decimal" autocomplete="off" placeholder="–"></label>`).join('')}
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
let kPts = [];
function kcalChart(days, sel) {
  let pts;
  let weekly = false;
  const avgTot = (arr) => { const tr = arr.filter((d) => d.tot); if (!tr.length) return null; const o = {}; tr.forEach((d) => addN(o, d.tot)); return scaleN(o, 1 / tr.length); };
  const avgGoal = (arr) => { const o = { kcal: 0, p: 0, c: 0, f: 0 }; arr.forEach((d) => { for (const k in o) o[k] += (d.dt[k] || 0) / arr.length; }); return o; };
  if (days.length > 45) { // medie settimanali
    weekly = true;
    pts = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      pts.push({ date: chunk[0].date, to: chunk[chunk.length - 1].date, tot: avgTot(chunk), dt: avgGoal(chunk), n: chunk.filter((d) => d.tot).length });
    }
  } else pts = days.map((d) => ({ date: d.date, tot: d.tot, dt: d.dt }));
  kPts = pts;
  if (!pts.some((p) => p.tot)) return `<div class="empty">Nessun giorno registrato nel periodo.</div>`;
  if (sel == null || !pts[sel] || !pts[sel].tot) { sel = -1; for (let i = pts.length - 1; i >= 0; i--) if (pts[i].tot) { sel = i; break; } }

  const parts = (t) => { const pk = (t.p || 0) * 4, ck = (t.c || 0) * 4, fk = (t.f || 0) * 9; return { pk, ck, fk, ok: Math.max(0, (t.kcal || 0) - pk - ck - fk) }; };
  const goals = (g) => { const gp = (g.p || 0) * 4, gpc = gp + (g.c || 0) * 4, gpcf = gpc + (g.f || 0) * 9; return { gp, gpc, gpcf, gk: g.kcal || 0 }; };
  const W = 340, H = 170, L = 34, R = 8, T = 10, B = 20;
  let max = 1;
  pts.forEach((p) => { const g = goals(p.dt); max = Math.max(max, g.gk, g.gpcf); if (p.tot) { const q = parts(p.tot); max = Math.max(max, q.pk + q.ck + q.fk + q.ok); } });
  max *= 1.08;
  const bw = (W - L - R) / pts.length;
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, Math.round(max / 2 / 100) * 100, Math.round(max * 0.9 / 100) * 100];
  let s = ticks.map((v) => `<path d="M${L} ${y(v).toFixed(1)}H${W - R}" stroke="var(--line-2)"/><text x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`).join('');
  let anyOther = false;
  pts.forEach((p, i) => {
    const gap = Math.min(3, bw * 0.22);
    const x0 = L + i * bw + gap / 2;
    const w = Math.max(1, bw - gap);
    let g = '';
    if (i === sel) g += `<rect x="${(L + i * bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${H - T - B}" fill="var(--accent-soft)"/>`;
    if (p.tot) {
      const q = parts(p.tot);
      if (q.ok > 1) anyOther = true;
      let base = 0;
      for (const [v, c] of [[q.pk, 'var(--prot)'], [q.ck, 'var(--carb)'], [q.fk, 'var(--fat)'], [q.ok, 'var(--field)']]) {
        if (v <= 0) continue;
        g += `<rect x="${x0.toFixed(1)}" y="${y(base + v).toFixed(1)}" width="${w.toFixed(1)}" height="${(y(base) - y(base + v)).toFixed(1)}" fill="${c}"/>`;
        base += v;
      }
    }
    const gl = goals(p.dt);
    const tick = (v, c, dash) => v > 0 ? `<path d="M${(x0 - 1).toFixed(1)} ${y(v).toFixed(1)}h${(w + 2).toFixed(1)}" stroke="${c}" stroke-width="2"${dash ? ' stroke-dasharray="2 1.5"' : ''}/>` : '';
    g += tick(gl.gp, 'var(--prot)') + tick(gl.gpc, 'var(--carb)');
    if (Math.abs(gl.gpcf - gl.gk) > gl.gk * 0.02) g += tick(gl.gpcf, 'var(--fat)');
    g += tick(gl.gk, 'var(--ink)', true);
    // area trasparente per il tocco
    g += `<rect x="${(L + i * bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${H - T - B}" fill="transparent"/>`;
    s += `<g data-act="kbar" data-i="${i}" style="cursor:pointer">${g}</g>`;
  });
  s += `<text x="${L}" y="${H - 5}">${shortDate(pts[0].date)}</text><text x="${W - R}" y="${H - 5}" text-anchor="end">${shortDate(days[days.length - 1].date)}</text>`;
  const sw = (c, l) => `<span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:2px;background:${c};display:inline-block"></i>${l}</span>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Calorie per ${weekly ? 'settimana' : 'giorno'}, divise per macronutriente">${s}</svg>
  <div class="row wrap small muted" style="gap:4px 12px;padding:0 4px">${sw('var(--prot)', 'Proteine')}${sw('var(--carb)', 'Carboidrati')}${sw('var(--fat)', 'Grassi')}${anyOther ? sw('var(--field)', 'Altro') : ''}</div>
  <span class="small muted" style="padding:0 4px">Tacche degli obiettivi, sommati dal basso: blu = proteine, arancio = proteine + carboidrati, puntini = kcal totali. Se un colore arriva alla sua tacca, quel macro è centrato.${weekly ? ' Ogni barra è la media giornaliera di una settimana.' : ''} Tocca una barra per i dettagli.</span>
  <div id="kDetail">${sel >= 0 ? kDetail(pts[sel], weekly) : ''}</div>`;
}
function kDetail(p, weekly) {
  const t = p.tot, g = p.dt;
  const when = weekly ? `Settimana dal ${shortDate(p.date)} (media di ${p.n} giorni)` : cap(toDate(p.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }));
  const cell = (l, v, goal, u, c) => `<div class="stack" style="gap:0;padding:6px 8px;border-radius:10px;background:var(--bg);border-top:3px solid ${c}"><span class="small muted">${l}</span><strong style="font-size:15px;white-space:nowrap">${fmt(v)}<span class="muted" style="font-weight:500"> / ${fmt(goal)}${u ? ' ' + u : ' kcal'}</span></strong></div>`;
  return `<div class="stack" style="gap:6px;padding:0 4px">
    <strong class="small">${esc(when)}</strong>
    <div class="grid2" style="gap:6px">${cell('Calorie', t.kcal, g.kcal, '', 'var(--ink)')}${cell('Proteine', t.p, g.p, 'g', 'var(--prot)')}${cell('Carboidrati', t.c, g.c, 'g', 'var(--carb)')}${cell('Grassi', t.f, g.f, 'g', 'var(--fat)')}</div>
  </div>`;
}
function macroPie() {
  const t = today();
  let dates;
  const tracked = (d) => state.diary[d] && state.diary[d].length;
  if (ui.pieRange === 'today') dates = [t];
  else if (ui.pieRange === 'all') dates = Object.keys(state.diary).filter((d) => d <= t && tracked(d));
  else { const n = +ui.pieRange; dates = []; for (let i = 0; i < n; i++) { const d = addDays(t, -i); if (tracked(d)) dates.push(d); } }
  const label = { today: 'oggi', 7: 'negli ultimi 7 giorni', 30: 'negli ultimi 30 giorni', all: 'da sempre' }[ui.pieRange];
  if (!dates.length || !dates.some(tracked)) return `<div class="empty">Nessun alimento registrato ${label}.</div>`;
  const tot = {}; const goal = { kcal: 0, p: 0, c: 0, f: 0 };
  dates.forEach((d) => { addN(tot, dayTotals(d)); const g = dayType(d); for (const k in goal) goal[k] += g[k] || 0; });
  const avg = scaleN(tot, 1 / dates.length); const gAvg = scaleN(goal, 1 / dates.length);
  const kc = (o) => ({ p: (o.p || 0) * 4, c: (o.c || 0) * 4, f: (o.f || 0) * 9 });
  const a = kc(avg), g = kc(gAvg);
  const aSum = a.p + a.c + a.f, gSum = g.p + g.c + g.f;
  if (!aSum) return `<div class="empty">Le voci registrate ${label} non hanno macronutrienti.</div>`;
  const pct = (o, sum, k) => (sum ? o[k] / sum * 100 : 0);
  // torta (cerchio con tratto spesso) + anello esterno sottile con gli obiettivi
  const ring = (vals, sum, r, sw) => {
    const C = 2 * Math.PI * r; let off = 0;
    return MACROS.map((m) => { const len = sum ? vals[m.k] / sum * C : 0; const el = len > 0 ? `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${m.color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>` : ''; off += len; return el; }).join('');
  };
  const labels = (() => { let acc = 0; return MACROS.map((m) => { const share = a[m.k] / aSum; const mid = (acc + share / 2) * 2 * Math.PI - Math.PI / 2; acc += share; if (share < 0.08) return ''; const x = 70 + Math.cos(mid) * 36, yy = 70 + Math.sin(mid) * 36; return `<text x="${x.toFixed(1)}" y="${(yy + 4).toFixed(1)}" text-anchor="middle" style="fill:#fff;font:700 12px Inter,sans-serif">${Math.round(share * 100)}%</text>`; }).join(''); })();
  const svg = `<svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Ripartizione ${label}: ${MACROS.map((m) => `${m.name} ${Math.round(pct(a, aSum, m.k))}%`).join(', ')}">
    ${ring(a, aSum, 28, 56)}${gSum ? ring(g, gSum, 65, 6) : ''}${labels}</svg>`;
  const rows = MACROS.map((m) => {
    const d = pct(a, aSum, m.k) - pct(g, gSum, m.k);
    return `<div class="stack" style="gap:1px">
      <span class="row" style="gap:6px;font-weight:700;font-size:14px"><i class="dot" style="background:${m.color}"></i>${m.name}</span>
      <span style="font-size:14px"><strong>${Math.round(pct(a, aSum, m.k))}%</strong> · ${fmt(avg[m.k] || 0)} g</span>
      <span class="small muted">obiettivo ${Math.round(pct(g, gSum, m.k))}% · ${fmt(gAvg[m.k])} g${gSum && Math.abs(d) >= 3 ? ` <span class="${Math.abs(d) >= 8 ? 'over' : ''}">(${d > 0 ? '+' : '−'}${Math.round(Math.abs(d))})</span>` : ''}</span>
    </div>`;
  }).join('');
  return `<div class="row" style="gap:14px;align-items:center">
    <div style="flex:0 0 auto">${svg}</div>
    <div class="stack grow" style="gap:8px">${rows}</div>
  </div>
  <div class="small muted" style="margin-top:8px">${ui.pieRange === 'today' ? 'Oggi' : `Media giornaliera su ${dates.length} ${dates.length === 1 ? 'giorno registrato' : 'giorni registrati'}`}: <strong style="color:var(--ink)">${fmt(avg.kcal || 0)} kcal</strong> su ${fmt(gAvg.kcal)} di obiettivo. Percentuali calcolate sulle kcal dei macro; l'anello esterno mostra la ripartizione obiettivo.</div>`;
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
    <p class="small muted" style="margin:10px 0 0">Quelli spuntati compaiono nel diario e negli obiettivi. Negli alimenti puoi inserirli tutti.</p>
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
    ${[['light', 'Chiaro'], ['dark', 'Scuro'], ['auto', 'Come il telefono']].map(([k, l]) => `<button data-act="theme" data-t="${k}" aria-pressed="${S.theme === k}">${l}</button>`).join('')}
  </div>

  <h3 class="section-label">I tuoi dati</h3>
  <div class="card stack">
    <span class="small muted">${nP} alimenti · ${nR} ricette · ${nD} giorni nel diario · ${state.weights.length} pesate</span>
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
    src.forEach((e) => { day.push({ ...JSON.parse(JSON.stringify(e)), id: uid() }); consumeStock(e.kind, e.ref, e.qty, e.unit); });
    save(); render(); toast(`Copiato ${mealName(m)} di ieri`);
  },
  editEntry(el) { editEntry(el.dataset.id); },
  favSave(el) {
    const m = el.dataset.meal;
    const list = (state.diary[ui.date] || []).filter((e) => e.meal === m);
    if (!list.length) return;
    const name = (prompt('Nome del pasto preferito', `${mealName(m)} tipo`) || '').trim();
    if (!name) return;
    state.favorites.push({ id: uid(), name, meal: m, created: Date.now(), items: list.map((e) => ({ kind: e.kind, ref: e.ref, qty: e.qty, unit: e.unit, label: e.label, n: e.n })) });
    save(); toast(`“${name}” salvato tra i preferiti`);
  },
  mealTools(el) { const m = el.dataset.meal; openSheet(mealToolsHtml(m), { type: 'tools', meal: m }); },
  favOpen(el) { openFav(el.dataset.id, el.dataset.meal); },
  favApply() {
    const c = ui.sheet; const f = state.favorites.find((x) => x.id === c.id);
    const items = f.items.filter((_, i) => c.sel[i]);
    if (!items.length) return;
    addItemsToDay(items, c.meal); f.lastUsed = Date.now();
    save(); closeSheet();
    if (parseHash().route === 'oggi') render();
    toast(`${items.length} ${items.length === 1 ? 'voce aggiunta' : 'voci aggiunte'} a ${mealName(c.meal)}`, parseHash().route === 'oggi' ? null : { label: 'Vai al diario', fn: () => go('#/oggi') });
  },
  favRename() {
    const f = state.favorites.find((x) => x.id === ui.sheet.id);
    const n = (prompt('Nuovo nome', f.name) || '').trim(); if (!n) return;
    f.name = n; save(); $('#sheet').innerHTML = '<div class="grip"></div>' + favSheetHtml(ui.sheet);
    const l = $('#addList'); if (l) l.innerHTML = renderAddList();
  },
  favDelete() {
    const f = state.favorites.find((x) => x.id === ui.sheet.id);
    if (!confirm(`Eliminare il preferito “${f.name}”? Le voci già nel diario restano.`)) return;
    state.favorites = state.favorites.filter((x) => x.id !== f.id); save(); closeSheet(true); render2();
    toast('Preferito eliminato');
  },
  favEdit(el) { const f = state.favorites.find((x) => x.id === el.dataset.id); if (f) openSheet(favEditHtml(f), { type: 'favEdit', id: f.id, dirty: true }); },
  favEditDone() { closeSheet(); },
  favUse() { const id = ui.sheet.id; closeSheet(true); render2(); openFav(id, guessMeal()); },
  favItemDel(el) {
    const f = state.favorites.find((x) => x.id === ui.sheet.id); f.items.splice(+el.dataset.i, 1); save();
    $('#sheet').innerHTML = '<div class="grip"></div>' + favEditHtml(f);
  },
  back() { history.length > 1 ? history.back() : go('#/oggi'); },
  sheetClose() { closeSheet(); },
  libTab(el) { ui.libTab = el.dataset.tab; ui.libQ = ''; history.replaceState(null, '', `#/alimenti?tab=${ui.libTab}`); render(); },
  // piano pasti
  planWeek(el) { const d = +el.dataset.d; ui.planWeek = d ? addDays(ui.planWeek || mondayOf(today()), d) : mondayOf(today()); render(); },
  planAdd(el) { const ctx = { type: 'planPick', date: el.dataset.d, meal: ui.planMeal && state.settings.meals.some((m) => m.id === ui.planMeal) ? ui.planMeal : (state.settings.meals[0] || {}).id, q: '' }; openSheet(planPickerHtml(ctx), ctx); },
  planTab(el) { ui.planTab = el.dataset.tab; $('#sheet').innerHTML = '<div class="grip"></div>' + planPickerHtml(ui.sheet); },
  planPick(el) {
    const c = ui.sheet; const kind = el.dataset.kind; const id = el.dataset.id;
    let qty = 1, unit = kind === 'recipe' ? 'portion' : 'fav';
    if (kind === 'product') {
      const p = state.products[id];
      const okUnit = p.lastUnit && (p.lastUnit === 'g' || (p.servings || []).some((s) => s.id === p.lastUnit));
      qty = okUnit ? p.lastQty : 100; unit = okUnit ? p.lastUnit : 'g';
    }
    (state.plan[c.date] ||= []).push({ id: uid(), meal: c.meal, kind, ref: id, qty, unit });
    c.dirty = true; save();
    const src = planItemSrc({ kind, ref: id });
    toast(`${src.name} → ${WDL[weekday(c.date)]}, ${mealName(c.meal)}`);
  },
  planDel(el) {
    const list = state.plan[el.dataset.d] || []; const i = list.findIndex((x) => x.id === el.dataset.id);
    if (i < 0) return; const [rm] = list.splice(i, 1); if (!list.length) delete state.plan[el.dataset.d];
    save(); render2();
    toast('Tolto dal piano', { label: 'Annulla', fn: () => { (state.plan[el.dataset.d] ||= []).splice(i, 0, rm); save(); render2(); } });
  },
  planLogDay(el) {
    const d = el.dataset.d; const items = (state.plan[d] || []).filter((it) => !it.logged);
    const n = logPlanItems(d, items); save(); render2();
    toast(`${n} ${n === 1 ? 'voce registrata' : 'voci registrate'} nel diario di ${shortDate(d)}`);
  },
  planLogMeal(el) {
    const items = (state.plan[ui.date] || []).filter((it) => !it.logged && it.meal === el.dataset.meal);
    const n = logPlanItems(ui.date, items); save(); render();
    toast(`${n} ${n === 1 ? 'voce registrata' : 'voci registrate'} dal piano`);
  },
  planCopyPrev() {
    const w0 = ui.planWeek || mondayOf(today()); let n = 0;
    for (let i = 0; i < 7; i++) {
      const src = state.plan[addDays(w0, i - 7)] || [];
      if (!src.length) continue;
      const dst = (state.plan[addDays(w0, i)] ||= []);
      src.forEach((it) => { dst.push({ id: uid(), meal: it.meal, kind: it.kind, ref: it.ref, qty: it.qty, unit: it.unit }); n++; });
    }
    if (!n) { toast('La settimana precedente è vuota'); return; }
    save(); render2(); toast(`Copiate ${n} voci`);
  },
  planClearWeek() {
    if (!confirm('Togliere tutte le voci pianificate di questa settimana? Il diario non cambia.')) return;
    const w0 = ui.planWeek || mondayOf(today());
    for (let i = 0; i < 7; i++) delete state.plan[addDays(w0, i)];
    save(); render2();
  },
  // TDEE
  tdeeApply() { applyTdee(); render2(); },
  tdeeSnooze() { state.tdee.lastReview = today(); save(); render2(); },
  copyFrom(el) {
    const meal = el.dataset.meal; const d = $('#copyDate').value; const from = $('#copyMeal').value;
    const list = (state.diary[d] || []).filter((e) => e.meal === from);
    if (!list.length) { toast('Nessuna voce in quel pasto'); return; }
    const day = (state.diary[ui.date] ||= []);
    list.forEach((e) => { day.push({ ...JSON.parse(JSON.stringify(e)), id: uid(), meal }); consumeStock(e.kind, e.ref, e.qty, e.unit); });
    save(); closeSheet(); render(); toast(`Copiate ${list.length} voci`);
  },
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
    const ret = parseHash().params.ret;
    delete state.products[p.id]; ui.pDraft = null; save(); toast('Alimento eliminato'); go(ret && ret[0] === '#' ? ret : '#/alimenti?tab=alimenti');
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
    if (!n || !confirm(`Eliminare il nutriente “${n.name}”? I valori inseriti negli alimenti non verranno più mostrati.`)) return;
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
    const ret = r._ret; delete state.recipes[r.id]; ui.rDraft = null; save(); toast('Ricetta eliminata'); go(ret || '#/alimenti?tab=ricette');
  },

  // dispensa / spesa
  pFilter(el) { ui.pantryFilter = el.dataset.f; render(); },
  addFreqToList(el) { Object.values(state.products).forEach((p) => { if (p.pantry && p.pantry.on && p.pantry.freq === el.dataset.f) p.pantry.inList = true; }); save(); render(); toast('Aggiunti alla lista'); },
  extraAdd() { const v = $('#extraIn').value.trim(); if (!v) return; state.shopping.extra.push({ id: uid(), name: v, checked: false }); save(); render(); setTimeout(() => $('#extraIn').focus(), 0); },
  extraDel(el) { state.shopping.extra = state.shopping.extra.filter((e) => e.id !== el.dataset.id); save(); render(); },
  shopDone() {
    // alimenti del piano presi: la quantità comprata va "in casa"
    const pc = state.shopping.planChecked;
    shopPlan().rows.forEach((r) => { if (pc[r.p.id] && r.buy > 0) r.p.stock = round((r.p.stock || 0) + r.buy, 1); });
    state.shopping.planChecked = {};
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
  kbar(el) {
    const i = +el.dataset.i; const p = kPts[i];
    if (!p || !p.tot) return;
    document.querySelectorAll('[data-act="kbar"]').forEach((g) => { const hl = g.querySelector('rect[fill="var(--accent-soft)"]'); if (hl) hl.remove(); });
    el.insertAdjacentHTML('afterbegin', `<rect x="${el.lastElementChild.getAttribute('x')}" y="10" width="${el.lastElementChild.getAttribute('width')}" height="140" fill="var(--accent-soft)"/>`);
    $('#kDetail').innerHTML = kDetail(p, !!p.to);
  },
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
      state.products[id] = { ...newProduct(name), id, basis, autoKcal: false, per100: { kcal, p, c, f, fiber }, servings: (servings || []).map(([n, q]) => ({ id: uid(), name: n, qty: q })), tags: ['esempio'], notes: 'Valori indicativi: verifica con l’etichetta della confezione che compri.', created: Date.now() };
      added++;
    }
    state.welcomeDone = true; save(); render();
    toast(added ? `${added} alimenti di esempio aggiunti` : 'Già presenti');
  },
  resetAll() {
    if (!confirm('Cancellare TUTTI i dati (diario, alimenti, ricette, pesate)? Prima conviene esportare un backup.')) return;
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
  libSearch(el) { ui.libQ = el.value; $('#libList').innerHTML = libList(); },
  planSearch(el) { ui.sheet.q = el.value; $('#planList').innerHTML = planPickList(el.value); },
  pStock(el) { ui.pDraft.stock = num(el.value) || 0; },
  favName(el) { const f = state.favorites.find((x) => x.id === ui.sheet.id); f.name = el.value.trim() || f.name; save(); },
  favQty(el) {
    const f = state.favorites.find((x) => x.id === ui.sheet.id); const it = f.items[+el.dataset.i];
    const v = num(el.value); if (!v || v <= 0) return;
    it.qty = v; it.n = itemN(it); save();
    $('#fk-' + el.dataset.i).textContent = `${fmt(itemN(it).kcal)} kcal`;
    $('#favEditTot').textContent = `Totale ${fmt(favKcal(f))} kcal`;
  },
};
const CHG = {
  meal(el) { ui.meal = el.value; },
  pieRange(el) { ui.pieRange = el.value; $('#pieBox').innerHTML = macroPie(); },
  shopRange(el) { ui.shopRange = el.value; render2(); },
  planCheck(el) { state.shopping.planChecked[el.dataset.id] = el.checked; save(); render2(); },
  planMeal(el) { ui.sheet.meal = el.value; ui.planMeal = el.value; },
  planQty(el) {
    const it = (state.plan[el.dataset.d] || []).find((x) => x.id === el.dataset.id);
    const v = num(el.value);
    if (it && v > 0) { it.qty = v; save(); }
    render2();
  },
  sheetMeal(el) { ui.sheet.meal = el.value; if (ui.sheet.type === 'fav') $('#sheet').innerHTML = '<div class="grip"></div>' + favSheetHtml(ui.sheet); },
  favItem(el) { ui.sheet.sel[+el.dataset.i] = el.checked; $('#sheet').innerHTML = '<div class="grip"></div>' + favSheetHtml(ui.sheet); },
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
document.documentElement.dataset.theme = state.settings.theme || 'light';
render();
// il giorno cambia a mezzanotte: se l'app resta aperta, aggiorna "oggi"
let lastToday = today();
setInterval(() => { const t = today(); if (t !== lastToday) { if (ui.date === lastToday) ui.date = t; lastToday = t; if (parseHash().route === 'oggi') render(); } }, 60000);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
