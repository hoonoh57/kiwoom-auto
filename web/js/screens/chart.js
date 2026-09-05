/* screens/chart.js - screen kind 'chart' [0615].
   body = 기존 프로필(panes/items/order/view/ui). 시리즈 계층은 무변경. */

import * as addons from '../addons.js';
import * as proptree from '../proptree.js';
import { createEngine } from '../core.js';
import { createRuntime } from '../runtime.js';
import { selectable, selectionPatch, contentKey, renderLegend } from './chart-selection.js';
import { DEL } from '../deskspec.js';

const TF_BS = { tick: 4, '1m': 8, '5m': 8, '30m': 9, '1d': 10, '1w': 12, '1M': 14 };
const H_MIN = 30;
const H_MAX = 600;

const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---- 공용 피드 (code|tf 단위 공유) ---- */
// Design: D5.v6.market-cache
const feeds = new Map();
let useSeq = 0;
const keyOf = (code, tf) => code + '|' + tf;

async function pull(key, force) {
  const fd = feeds.get(key);
  if (!fd) return;
  const seg = key.split('|');
  const q = `code=${encodeURIComponent(seg[0])}&tf=${encodeURIComponent(seg[1])}`;
  let data;
  try {
    const b = await fetch(`/api/bars?${q}${force ? '&force=1' : ''}`).then((r) => r.json());
    let g = { markers: [], eval: null };
    try { g = await fetch(`/api/signals?${q}`).then((r) => r.json()); } catch (e) { /* 신호 없음 */ }
    data = { bars: b.bars || [], barsHash: b.barsHash || '', liveBar: b.live || null,
             markers: g.markers || [], ev: g.eval || null, err: b.error || null };
  } catch (e) {
    data = { bars: [], barsHash: 'err', liveBar: null, markers: [], ev: null, err: String(e) };
  }
  if (feeds.get(key) !== fd) return;
  data.bars = data.bars.slice(-1200);
  fd.data = data;
  for (const cb of fd.refs) cb(data);
}

function subscribe(code, tf, cb) {
  const key = keyOf(code, tf);
  let fd = feeds.get(key);
  if (!fd) { fd = { refs: new Set(), data: null, useSeq: 0 }; feeds.set(key, fd); }
  fd.useSeq = ++useSeq;
  fd.refs.add(cb);
  if (fd.data) cb(fd.data); else pull(key, false);
  return () => {
    fd.refs.delete(cb);
    const idle = [...feeds.entries()].filter(([, entry]) => !entry.refs.size)
      .sort((a, b) => a[1].useSeq - b[1].useSeq || (a[0] < b[0] ? -1 : 1));
    for (let i = 0; i < idle.length - 32; i++) feeds.delete(idle[i][0]);
  };
}

setInterval(() => { for (const [k, fd] of feeds) if (fd.refs.size) pull(k, false); }, 15000);

/* ---- body 스펙 ---- */
const paneOf = (kind) => { const m = addons.meta(kind); return (m && m.pane) || 'main'; };
const nextItemId = (body, kind) => {
  let n = 1;
  while (body.items[kind + n]) n++;
  return kind + n;
};

function seed(form) {
  const items = {};
  const order = [];
  for (const c of addons.catalog()) {
    if (!c.auto) continue;
    let n = 1;
    while (items[c.kind + n]) n++;
    const id = c.kind + n;
    items[id] = { kind: c.kind, enabled: true, visible: true,
                  props: { ...addons.defaults(c.kind, { id, form }), paneId: c.pane || 'main' } };
    order.push(id);
  }
  return { items, order };
}

function normalizedPane(body, id, form) {
  const it = body.items[id];
  const impl = it && addons.get(it.kind);
  if (!impl) return 'main';
  const props = impl.normalize(it, { id, form, axisSlot: 0 });
  return props.paneId || it.props.paneId || 'main';
}

function usedPanes(body, form) {
  const out = ['main'];
  for (const id of body.order) {
    const p = normalizedPane(body, id, form);
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

function normPanes(prev, body, form) {
  const keep = new Map(arr(prev).filter((p) => p && p.id).map((p) => [p.id, p]));
  return usedPanes(body, form).map((id) => {
    const p = obj(keep.get(id));
    const def = id === 'main' ? 300 : 120;
    return { id, label: typeof p.label === 'string' && p.label ? p.label : id,
             h: Math.round(clamp(typeof p.h === 'number' && isFinite(p.h) ? p.h : def, H_MIN, H_MAX)) };
  });
}

function withPane(prev, id) {
  if (arr(prev).some((p) => p.id === id)) return arr(prev);
  return [...arr(prev), { id, label: id, h: id === 'main' ? 300 : 120 }];
}

export const SCREEN = {
  no: '0615',
  label: '차트',
  keywords: ['차트', 'chart', '캔들', 'candle', '지표'],
  quick: true,
  single: false,
  needCode: true,
  needTf: true,
  legacy: true,
  defRect: { w: 880, h: 560 },
  minSize: { w: 460, h: 280 },

  defaultBody(form) {
    const s = seed(form);
    const body = { items: s.items, order: s.order, panes: [], view: {}, ui: { open: { main: true }, panel: true, selectedItemId: null } };
    body.panes = normPanes([], body, form);
    body.view = { barSpacing: TF_BS[form.tf] || 8, autoScale: true };
    return body;
  },

  reconcileBody(body0, form) {
    const b = { ...obj(body0) };
    b.items = obj(b.items);
    b.order = arr(b.order).filter((id, i, a) => b.items[id] && addons.get(b.items[id].kind) && a.indexOf(id) === i);
    for (const id of Object.keys(b.items)) if (!b.order.includes(id)) delete b.items[id];
    if (!b.order.length) { const s = seed(form); b.items = s.items; b.order = s.order; }
    for (const id of b.order) {
      const it = obj(b.items[id]);
      it.kind = b.items[id].kind;
      it.enabled = it.enabled !== false;
      it.visible = it.visible !== false;
      it.props = { ...addons.defaults(it.kind, { id, form }), ...obj(it.props) };
      if (!it.props.paneId) it.props.paneId = paneOf(it.kind);
      b.items[id] = it;
    }
    b.panes = normPanes(b.panes, b, form);
    b.view = obj(b.view);
    b.view.barSpacing = clamp(typeof b.view.barSpacing === 'number' && b.view.barSpacing > 0
      ? b.view.barSpacing : (TF_BS[form.tf] || 8), 0.5, 60);
    b.view.autoScale = b.view.autoScale !== false;
    b.ui = obj(b.ui);
    b.ui.open = obj(b.ui.open);
    // Design: D3.v6.legend-selection
    if (!selectable(b, b.ui.selectedItemId, addons.meta)) b.ui.selectedItemId = null;
    if (b.ui.panel === undefined) b.ui.panel = true;
    return b;
  },

  mount(host, form, ctx) {
    const root = el('div', 'cf');
    const bar = el('div', 'cf-bar');
    const cin = el('input', 'cf-code');
    cin.value = form.code || '';
    cin.maxLength = 8;
    cin.title = '종목코드 6자리';
    const tsel = el('select', 'cf-tf');
    for (const tf of (ctx.env.tf || [form.tf])) {
      const o = el('option');
      o.value = tf;
      o.textContent = (ctx.env.tfLabel || {})[tf] || tf;
      tsel.append(o);
    }
    tsel.value = form.tf;
    const ev = el('span', 'cf-ev');
    const tog = el('button', 'cf-tog');
    tog.textContent = '\u2261';
    tog.title = '애드온 패널';
    bar.append(cin, tsel, ev, tog);

    const main = el('div', 'cf-main');
    const cwrap = el('div', 'cf-chart');
    const panel = el('div', 'cf-panel');
    const addw = el('span', 'cf-add');
    const tree = el('div', 'cf-tree');
    panel.append(addw, tree);
    main.append(cwrap, panel);
    const legend = el('div', 'cf-legend');
    legend.setAttribute('aria-label', '종목 선택');
    root.append(bar, legend, main);
    host.append(root);

    const engine = createEngine(cwrap);
    const runtime = createRuntime({ core: engine, registry: addons });
    const h = { root, engine, runtime, defaultKey: keyOf(form.code, form.tf),
                dataByKey: new Map(), unsubs: new Map(), bodyHash: '', panes: [], tid: 0 };

    // Design: D7.v6.legend-selection
    h.contentKey = contentKey(form);
    h.legend = () => renderLegend(legend, ctx.form(), addons, (id) => {
      const value = selectionPatch(ctx.form().body, id, addons.meta);
      if (value) ctx.patchBody(value);
    }, document);
    const cbs = {
      toggleOpen: (k, v) => ctx.patchBody({ ui: { open: { [k]: v } } }),
      toggleItem: (id, on) => ctx.patchBody({ items: { [id]: { enabled: on, visible: on } }, ...(!on && ctx.form().body.ui.selectedItemId === id ? { ui: { selectedItemId: null } } : {}) }),
      patchProps: (id, p) => {
        const b = ctx.form().body;
        const next = { ...b.items[id].props, ...p };
        ctx.patchBody({ items: { [id]: { props: p } }, panes: withPane(b.panes, next.paneId || 'main') });
      },
      deleteItem: (id) => {
        const b = ctx.form().body;
        ctx.patchBody({ items: { [id]: DEL }, order: b.order.filter((x) => x !== id), ...(b.ui.selectedItemId === id ? { ui: { selectedItemId: null } } : {}) });
      },
      prepareItem: (kind) => {
        const b = ctx.form().body;
        const id = nextItemId(b, kind);
        return { id, props: { ...addons.defaults(kind, { id, form: ctx.form() }), paneId: paneOf(kind) } };
      },
      addItem: (kind, draft) => {
        const b = ctx.form().body;
        const id = draft && draft.id && !b.items[draft.id] ? draft.id : nextItemId(b, kind);
        const pid = paneOf(kind);
        const props = { ...addons.defaults(kind, { id, form: ctx.form() }),
          paneId: pid, ...obj(draft && draft.props) };
        const it = { kind, enabled: true, visible: true,
                     props };
        ctx.patchBody({ items: { [id]: it }, order: [...b.order, id],
          panes: withPane(b.panes, props.paneId || pid) });
      },
      deletePane: (pid) => {
        const b = ctx.form().body;
        const formNow = ctx.form();
        const gone = b.order.filter((id) => normalizedPane(b, id, formNow) === pid);
        const items = {};
        for (const id of gone) items[id] = DEL;
        ctx.patchBody({ items, order: b.order.filter((id) => !gone.includes(id)),
                        panes: b.panes.filter((p) => p.id !== pid), ...(gone.includes(b.ui.selectedItemId) ? { ui: { selectedItemId: null } } : {}) });
      },
      previewHeight: (pid, v) => {
        engine.setPaneStretch(h.panes.map((p) => (p.id === pid ? v : p.h)));
      },
      commitHeight: (pid, v) => {
        const b = ctx.form().body;
        ctx.patchBody({ panes: b.panes.map((p) => (p.id === pid ? { ...p, h: clamp(v, H_MIN, H_MAX) } : p)) });
      },
    };
    proptree.renderAddBar(addw, [], cbs);

    // Design: D7.v6.symbol-link
    cin.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); cin.onchange(); }
    };
    cin.onchange = () => {
      const v = cin.value.trim();
      if (/^\d{6}$/.test(v)) { if (v !== ctx.form().code) ctx.setCode(v); }
      else cin.value = ctx.form().code;
    };
    tsel.onchange = () => ctx.patchForm({ tf: tsel.value });
    tog.onclick = () => ctx.patchBody({ ui: { panel: !obj(ctx.form().body.ui).panel } });

    function draw(geo) {
      h.legend();
      const f = ctx.form();
      if (!f) return;
      const empty = { bars: [], barsHash: '0', liveBar: null, markers: [], ev: null, err: null };
      const mainData = h.dataByKey.get(h.defaultKey) || empty;
      const rc = { engine, form: f, bars: mainData.bars, barsHash: mainData.barsHash,
                   liveBar: mainData.liveBar, markers: mainData.markers,
                   dataFor: (key) => h.dataByKey.get(key || h.defaultKey) || empty,
                   patchItem: (id, p) => ctx.patchBody({ items: { [id]: { props: p } } }) };
      const r = runtime.apply(f.body, ctx.globalOn(), rc, geo);
      h.panes = r.panes;
      const bh = JSON.stringify([f.body.items, f.body.order, f.body.panes, f.body.ui]);
      if (bh !== h.bodyHash) { h.bodyHash = bh; proptree.renderTree(tree, f.body, r.panes, cbs); }
      else proptree.syncHeightInputs(tree, r.panes);
      panel.style.display = obj(f.body.ui).panel === false ? 'none' : '';
      const e = mainData.ev || {};
      ev.textContent = mainData.err ? 'ERR ' + String(mainData.err).slice(0, 40)
        : String(e.signal || e.state || e.pos || '');
      runtime.tickLive(rc);
    }

    h.draw = draw;

    function syncFeeds(f) {
      h.defaultKey = keyOf(f.code, f.tf);
      const wanted = new Map([[h.defaultKey, { code: f.code, tf: f.tf }]]);
      for (const id of arr(f.body.order)) {
        const it = f.body.items[id];
        if (!it) continue;
        const src = addons.source(it.kind, it, { id, form: f });
        if (src && src.code && src.tf) wanted.set(keyOf(src.code, src.tf), src);
      }
      for (const [key, off] of h.unsubs) {
        if (!wanted.has(key)) { off(); h.unsubs.delete(key); h.dataByKey.delete(key); }
      }
      for (const [key, src] of wanted) {
        if (h.unsubs.has(key)) continue;
        h.unsubs.set(key, subscribe(src.code, src.tf, (d) => { h.dataByKey.set(key, d); draw(false); }));
      }
    }

    h.legend();
    syncFeeds(form);

    // Design: D5.v6.chart-range
    const scheduler = ctx.scheduler || { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) };
    let rangeUserPending = false, expiry = null;
    const clearRange = () => {
      rangeUserPending = false;
      scheduler.clear(h.tid);
      scheduler.clear(expiry);
    };
    const markRange = (e) => {
      if (!e.isTrusted || (e.type === 'pointerdown' && (!e.isPrimary || e.button !== 0))) return;
      clearRange();
      rangeUserPending = true;
      expiry = scheduler.set(clearRange, 1500);
    };
    cwrap.addEventListener('wheel', markRange, { capture: true, passive: true });
    cwrap.addEventListener('pointerdown', markRange, true);
    engine.onRangeChange(() => {
      if (!rangeUserPending) return;
      scheduler.clear(h.tid);
      h.tid = scheduler.set(() => {
        const f = ctx.form();
        const bs = engine.getBarSpacing();
        clearRange();
        if (f && Math.abs((obj(f.body.view).barSpacing || 0) - bs) > 0.01) ctx.patchBody({ view: { barSpacing: bs } });
      }, 800);
    });

    h.resub = (f) => {
      cin.value = f.code;
      tsel.value = f.tf;
      syncFeeds(f);
    };
    h.stop = () => {
      for (const off of h.unsubs.values()) off();
      h.unsubs.clear();
      clearRange();
      cwrap.removeEventListener('wheel', markRange, true);
      cwrap.removeEventListener('pointerdown', markRange, true);
      engine.destroy();
      root.remove();
    };
    return h;
  },

  update(h, form, ctx) {
    // Design: D7.v6.legend-selection — selection writes never reach series primitives.
    const key = contentKey(form);
    if (h.contentKey === key) { h.legend(); return; }
    h.contentKey = key;
    h.resub(form);
    h.draw(true);
  },

  resize(h) { if (h && h.draw) h.draw(false); },
  unmount(h) { h.stop(); },
};
