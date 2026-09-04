import { createEngine } from './core.js';
import { createRuntime, activePanes } from './runtime.js';
import * as addons from './addons.js';
import { renderTree, renderAddBar, syncHeightInputs } from './proptree.js';

const $ = (s) => document.querySelector(s);
const api = async (u, o) => {
  const r = await fetch(u, o);
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
  return r.json();
};
const J = (m, b) => ({ method: m, headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(b) });

function log(m) {
  const e = $('#log');
  e.textContent = new Date().toLocaleTimeString('ko-KR') + '  ' + m + '\n' + e.textContent;
  if (e.textContent.length > 4000) e.textContent = e.textContent.slice(0, 4000);
}

const engine = createEngine($('#chart'));
const runtime = createRuntime(engine);

const barCache = new Map(), sigCache = new Map();
const FRESH_MS = 20000;
let ST = null, ACT = null, PROF = null, HEALTH = null, PANES = [];
let saveTimer = null;
let geoLock = 0;

const q = () => `vd=${ACT.vd}&code=${ACT.code}&tf=${ACT.tf}`;

async function getBars(code, tf, force) {
  const k = code + '|' + tf, c = barCache.get(k);
  if (!force && c && Date.now() - c.at < FRESH_MS) return c;
  const d = await api(`/api/bars?code=${code}&tf=${tf}${force ? '&force=1' : ''}`);
  const rec = { bars: d.bars, live: d.live, barsHash: d.barsHash, at: Date.now() };
  barCache.set(k, rec);
  if (d.error) log('[BARS] ' + d.error);
  return rec;
}

async function getSignals(code, tf, h, fast, slow) {
  const k = `${code}|${tf}|${h}|${fast}|${slow}`;
  if (sigCache.has(k)) return sigCache.get(k);
  const d = await api(`/api/signals?code=${code}&tf=${tf}&fast=${fast}&slow=${slow}`);
  sigCache.set(k, d);
  return d;
}

/* ---- 저장 ---- */
function savePanes() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api(`/api/profile?${q()}`, J('PATCH', { panes: PROF.panes,
                                            barSpacing: engine.getBarSpacing() })).catch(() => {});
  }, 500);
}

/* ---- 드래그 -> 슬라이더/STATE 동기 ---- */
function pullHeights() {
  if (!PROF || !PANES.length || Date.now() < geoLock) return;
  const hs = engine.getPaneHeights();
  let ch = false;
  PANES.forEach((p, i) => {
    const h = hs[i];
    if (h > 20 && Math.abs(h - p.h) > 2) {
      p.h = h;
      const t = PROF.panes.find((x) => x.id === p.id);
      if (t) t.h = h;
      ch = true;
    }
  });
  if (ch) { syncHeightInputs($('#tree'), PANES); savePanes(); }
}
setInterval(pullHeights, 400);
$('#chartWrap').addEventListener('pointerup', () => setTimeout(pullHeights, 60));
window.addEventListener('beforeunload', () => { pullHeights(); });
engine.onRangeChange(() => savePanes());

/* ---- 트리 콜백 ---- */
const CB = {
  toggleOpen: async (k, v) => {
    PROF.ui.open[k] = v;
    tree();
    api(`/api/profile?${q()}`, J('PATCH', { ui: { open: { [k]: v } } })).catch(() => {});
  },
  toggleItem: async (id, on) => {
    PROF.items[id].enabled = on; PROF.items[id].visible = on;
    await api(`/api/profile?${q()}`, J('PATCH', { items: { [id]: { enabled: on, visible: on } } }));
    await draw(false);
  },
  patchProp: async (id, k, v) => {
    PROF.items[id].props[k] = v;
    await api(`/api/profile?${q()}`, J('PATCH', { items: { [id]: { props: { [k]: v } } } }));
    await draw(false);
  },
  previewHeight: (paneId, h) => {
    const i = PANES.findIndex((p) => p.id === paneId);
    if (i >= 0) { engine.setPaneHeight(i, h); PANES[i].h = h; }
    const t = PROF.panes.find((x) => x.id === paneId);
    if (t) t.h = h;
  },
  commitHeight: (paneId, h) => { CB.previewHeight(paneId, h); savePanes(); },
  deleteItem: async (id) => {
    PROF = await api(`/api/profile/item?${q()}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await draw(false);
  },
  deletePane: async (paneId) => {
    PROF = await api(`/api/profile/pane?${q()}&paneId=${encodeURIComponent(paneId)}`, { method: 'DELETE' });
    await draw(false);
  },
  addItem: async (kind) => {
    const m = addons.meta(kind);
    let n = 1;
    while (PROF.items[kind + n]) n++;
    const id = kind + n;
    const props = { ...addons.defaults(kind) };
    let pane = null;
    if (m.pane === 'main') {
      props.paneId = 'main';
    } else {
      const pid = m.pane + (PROF.panes.some((p) => p.id === m.pane) ? '_' + n : '');
      props.paneId = pid;
      if (!PROF.panes.some((p) => p.id === pid)) pane = { id: pid, label: m.label, h: 95 };
    }
    try {
      PROF = await api(`/api/profile/item?${q()}`, J('POST', { id, kind, props, pane }));
      log(`[ADD] ${id} -> ${props.paneId}`);
      await draw(false);
    } catch (e) { log('[ADD-FAIL] ' + e.message); }
  },
};

function tree() {
  PANES = activePanes(PROF, ST.globalOn);
  renderTree($('#tree'), PROF, PANES, CB);
  renderAddBar($('#addWrap'), PANES, CB);
}

/* ---- 상단 ---- */
function renderTop() {
  const v = $('#vds'); v.innerHTML = '';
  for (const [id, d] of Object.entries(ST.vds)) {
    const b = document.createElement('button');
    b.textContent = `${d.label} ${d.name}`;
    if (id === ACT.vd) b.className = 'on';
    b.onclick = () => switchTo(id, d.code, d.tf || ACT.tf);
    v.append(b);
  }
  const t = $('#tfs'); t.innerHTML = '';
  for (const tf of HEALTH.tf) {
    const b = document.createElement('button');
    b.textContent = HEALTH.tfLabel[tf];
    if (tf === ACT.tf) b.className = 'on';
    b.onclick = () => switchTo(ACT.vd, ACT.code, tf);
    t.append(b);
  }
  $('#mode').textContent = `${HEALTH.mode}${HEALTH.paper ? '/모의' : '/실거래'}`;
}

/* ---- 그리기 ---- */
async function draw(force, geo) {
  const rec = await getBars(ACT.code, ACT.tf, force);
  const sg = PROF.items.signals;
  let markers = [], ev = null;
  const on = sg && sg.enabled && sg.visible;
  const d = await getSignals(ACT.code, ACT.tf, rec.barsHash,
                             on ? sg.props.fast : 5, on ? sg.props.slow : 20);
  ev = d.eval;
  if (on) markers = d.markers;
  const ctx = { engine, bars: rec.bars, liveBar: rec.live, barsHash: rec.barsHash, markers };
  const r = runtime.apply(PROF, ST.globalOn, ctx, !!geo);
  if (geo) geoLock = Date.now() + 1200;
  runtime.tickLive(ctx);
  PANES = r.panes;
  tree();
  $('#eval').textContent = ev ? `${ev.signal}\n${ev.reason}` : '-';
  log(`[APPLY] ${ACT.vd}/${ACT.code}/${ACT.tf} bars=${rec.bars.length} panes=${r.panes.length} ops=${r.ops.length}`);
}

async function switchTo(vd, code, tf) {
  try {
    pullHeights();
    ACT = await api('/api/state/active', J('PATCH', { vd, code, tf }));
    ST = await api('/api/state');
    PROF = (await api(`/api/profile?${q()}`)).profile;
    renderTop();
    await draw(false, true);
    await refreshQuote();
  } catch (e) {
    log('[SWITCH-FAIL] ' + vd + '/' + code + '/' + tf + ' :: ' + e.message);
  }
}

async function refreshQuote() {
  try {
    const d = await api('/api/quote?code=' + ACT.code);
    const s = d.change > 0 ? '+' : '';
    $('#quote').textContent = `${d.code}  ${d.price.toLocaleString()}  ${s}${d.change} (${s}${d.rate}%)`;
  } catch (e) { $('#quote').textContent = '시세 실패'; }
}

async function refreshBalance() {
  try {
    const b = await api('/api/balance');
    $('#bal').textContent = `현금 ${Math.round(b.cash).toLocaleString()}\n평가 ${Math.round(b.eval).toLocaleString()}\n손익 ${Math.round(b.pnl).toLocaleString()}\n보유 ${b.positions.length}건`;
  } catch (e) { $('#bal').textContent = '조회 실패'; }
}

async function order(side) {
  const qty = Math.max(1, +$('#qty').value | 0);
  let price = 0;
  if (!$('#mkt').checked) {
    const c = barCache.get(ACT.code + '|' + ACT.tf);
    price = c && c.bars.length ? c.bars[c.bars.length - 1].close : 0;
  }
  try {
    const r = await api('/api/order', J('POST', { code: ACT.code, side, qty, price, tf: ACT.tf }));
    log(`[ORDER] ${side} ${ACT.code} x${qty} -> ${r.orderNo} (${r.mode})`);
  } catch (e) { log('[ORDER-FAIL] ' + e.message); }
  refreshBalance();
}

(async function boot() {
  const NEED = ['vds','tfs','mode','quote','chart','tree','addWrap','eval','qty','mkt','buy','sell','bal','log'];
  const miss = NEED.filter((id) => !document.getElementById(id));
  if (miss.length) throw new Error('HTML-MISMATCH 누락 id: ' + miss.join(', '));
  $('#buy').onclick = () => order('BUY');
  $('#sell').onclick = () => order('SELL');

  HEALTH = await api('/api/health');
  ST = await api('/api/state');
  ACT = ST.active;
  PROF = (await api(`/api/profile?${q()}`)).profile;
  renderTop();
  await draw(true, true);
  await refreshQuote(); await refreshBalance();
  setInterval(() => draw(true).catch((e) => log('[DRAW] ' + e.message)), 15000);
  setInterval(refreshQuote, 5000);
  setInterval(refreshBalance, 30000);
  log('[BOOT] 완료');
})().catch((e) => log('[BOOT-FAIL] ' + e.message));
