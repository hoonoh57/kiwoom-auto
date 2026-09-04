/* screens/chart.js - screen kind 'chart' [0615].
   body = 기존 프로필(panes/items/order/view/ui). 시리즈 계층은 무변경. */

import * as addons from '../addons.js';
import * as proptree from '../proptree.js';
import { createEngine } from '../core.js';
import { createRuntime } from '../runtime.js';
import { DEL } from '../deskspec.js';

const TF_BS = { tick: 4, '1m': 8, '5m': 8, '30m': 9, '1d': 10, '1w': 12, '1M': 14 };
const H_MIN = 30;
const H_MAX = 600;

const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---- 공용 피드 (code|tf 단위 공유) ---- */
const feeds = new Map();
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
  fd.data = data;
  for (const cb of fd.refs) cb(data);
}

function subscribe(code, tf, cb) {
  const key = keyOf(code, tf);
  let fd = feeds.get(key);
  if (!fd) { fd = { refs: new Set(), data: null }; feeds.set(key, fd); }
  fd.refs.add(cb);
  if (fd.data) cb(fd.data); else pull(key, false);
  return () => { fd.refs.delete(cb); if (!fd.refs.size) feeds.delete(key); };
}

setInterval(() => { for (const k of [...feeds.keys()]) pull(k, false); }, 15000);

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

function usedPanes(body) {
  const out = ['main'];
  for (const id of body.order) {
    const p = (body.items[id].props.paneId || 'main');
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

function normPanes(prev, body) {
  const keep = new Map(arr(prev).filter((p) => p && p.id).map((p) => [p.id, p]));
  return usedPanes(body).map((id) => {
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
    const body = { items: s.items, order: s.order, panes: [], view: {}, ui: { open: { main: true }, panel: true } };
    body.panes = normPanes([], body);
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
    b.panes = normPanes(b.panes, b);
    b.view = obj(b.view);
    b.view.barSpacing = clamp(typeof b.view.barSpacing === 'number' && b.view.barSpacing > 0
      ? b.view.barSpacing : (TF_BS[form.tf] || 8), 0.5, 60);
    b.view.autoScale = b.view.autoScale !== false;
    b.ui = obj(b.ui);
    b.ui.open = obj(b.ui.open);
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
    root.append(bar, main);
    host.append(root);

    const engine = createEngine(cwrap);
    const runtime = createRuntime(engine);
    const h = { root, engine, runtime, defaultKey: keyOf(form.code, form.tf),
                dataByKey: new Map(), unsubs: new Map(), bodyHash: '', panes: [], tid: 0 };

    const cbs = {
      toggleOpen: (k, v) => ctx.patchBody({ ui: { open: { [k]: v } } }),
      toggleItem: (id, on) => ctx.patchBody({ items: { [id]: { enabled: on, visible: on } } }),
      patchProps: (id, p) => {
        const b = ctx.form().body;
        const next = { ...b.items[id].props, ...p };
        ctx.patchBody({ items: { [id]: { props: p } }, panes: withPane(b.panes, next.paneId || 'main') });
      },
      deleteItem: (id) => {
        const b = ctx.form().body;
        ctx.patchBody({ items: { [id]: DEL }, order: b.order.filter((x) => x !== id) });
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
        const gone = b.order.filter((id) => (b.items[id].props.paneId || 'main') === pid);
        const items = {};
        for (const id of gone) items[id] = DEL;
        ctx.patchBody({ items, order: b.order.filter((id) => !gone.includes(id)),
                        panes: b.panes.filter((p) => p.id !== pid) });
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

    cin.onchange = () => {
      const v = cin.value.trim();
      if (/^\d{6}$/.test(v)) ctx.setCode(v);
      else cin.value = ctx.form().code;
    };
    tsel.onchange = () => ctx.patchForm({ tf: tsel.value });
    tog.onclick = () => ctx.patchBody({ ui: { panel: !obj(ctx.form().body.ui).panel } });

    function draw(geo) {
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

    syncFeeds(form);

    engine.onRangeChange(() => {
      clearTimeout(h.tid);
      h.tid = setTimeout(() => {
        const f = ctx.form();
        if (!f) return;
        const bs = engine.getBarSpacing();
        if (Math.abs((obj(f.body.view).barSpacing || 0) - bs) > 0.01) ctx.patchBody({ view: { barSpacing: bs } });
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
      clearTimeout(h.tid);
      engine.destroy();
      root.remove();
    };
    return h;
  },

  update(h, form, ctx) {
    h.resub(form);
    h.draw(true);
  },

  resize(h) { if (h && h.draw) h.draw(false); },
  unmount(h) { h.stop(); },
};
