import * as addons from './addons.js';

export const TF_BARSPACING = { tick: 4, '1m': 8, '5m': 8, '30m': 9,
                               '1d': 10, '1w': 12, '1M': 14 };

const F = (k, def, read, write) => ({ k, def, read, write });
const dig = (o, k) => k.split('.').reduce((a, s) => (a == null ? a : a[s]), o);
const put = (o, k, v) => {
  const ps = k.split('.');
  let c = o;
  for (const s of ps.slice(0, -1)) c = (c[s] = c[s] || {});
  c[ps[ps.length - 1]] = v;
};

export const SPEC = {
  project: {
    path: () => '',
    fields: [
      F('globalOn', true),
      F('layout.sidebarW', 300,
        () => document.querySelector('aside').offsetWidth,
        (v) => document.querySelector('aside').style.width = v + 'px'),
    ],
  },
  vds: { path: () => 'vds', fields: [] },
  vd: {
    path: (c) => `vds/${c.vd}`,
    fields: [F('code', ''), F('name', ''), F('tf', '1m')],
  },
  window: {
    path: (c) => `profiles/${c.vd}|${c.code}|${c.tf}`,
    fields: [
      F('view.barSpacing', 8,
        (c) => c.engine.getBarSpacing(),
        (v, c) => c.engine.setBarSpacing(v)),
      F('view.autoScale', true,
        (c) => c.engine.getAutoScale(),
        (v, c) => c.engine.setAutoScale(v)),
      F('panes', [],
        (c) => {
          const hs = c.engine.getPaneHeights();
          return c.panes.map((p, i) => ({ ...p, h: hs[i] > 20 ? hs[i] : p.h }));
        },
        (v, c) => c.engine.setPaneStretch(c.panes.map((p) => p.h))),
      F('items', {}),
      F('order', []),
      F('ui.open', {}),
    ],
  },
};

export function capture(scope, ctx) {
  const out = {};
  for (const f of SPEC[scope].fields) {
    if (!f.read) continue;
    put(out, f.k, f.read(ctx));
  }
  return out;
}

export function restore(scope, ctx, data) {
  for (const f of SPEC[scope].fields) {
    if (!f.write) continue;
    const v = dig(data, f.k);
    f.write(v === undefined ? f.def : v, ctx);
  }
}

export const pathOf = (scope, ctx) => SPEC[scope].path(ctx);

const paneLabel = (paneId) => {
  const c = addons.catalog().find((x) => x.pane === paneId);
  return (c && c.label) || paneId;
};
const clampH = (value, fallback) => {
  const h = Number(value);
  return Number.isFinite(h) ? Math.min(600, Math.max(50, h)) : fallback;
};

export function defaultWindow(tf) {
  return reconcile({ view: { barSpacing: TF_BARSPACING[tf] || 8, autoScale: true },
                     ui: { open: { main: true } } });
}

export function reconcile(prof) {
  prof = (prof && typeof prof === 'object') ? prof : {};
  const cat = new Map(addons.catalog().map((c) => [c.kind, c]));
  const v = prof.view || {};
  prof.view = {
    barSpacing: v.barSpacing > 0 ? v.barSpacing
              : (prof.barSpacing > 0 ? prof.barSpacing : 8),
    autoScale: v.autoScale !== undefined ? v.autoScale !== false
             : (prof.scale ? prof.scale.autoScale !== false : true),
  };
  delete prof.barSpacing;
  delete prof.scale;
  prof.items = prof.items || {};
  prof.order = (prof.order || []).filter((id) => prof.items[id]);
  for (const id of Object.keys(prof.items)) {
    const it = prof.items[id];
    const c = it && cat.get(it.kind);
    if (!c) { delete prof.items[id]; continue; }
    it.enabled = it.enabled !== false;
    it.visible = it.visible !== false;
    it.props = it.props || {};
    it.props.paneId = it.props.paneId || c.pane || 'main';
    for (const f of c.schema) {
      if (it.props[f.k] === undefined) it.props[f.k] = f.def;
    }
    if (!prof.order.includes(id)) prof.order.push(id);
  }
  prof.order = prof.order.filter((id) => prof.items[id]);

  if (!prof.order.length) {
    for (const c of addons.catalog()) {
      if (!c.auto) continue;
      const id = c.kind + '1';
      prof.items[id] = { kind: c.kind, enabled: true, visible: true,
                         props: { ...addons.defaults(c.kind), paneId: c.pane || 'main' } };
      prof.order.push(id);
    }
  }

  const used = new Set(prof.order.map((id) => prof.items[id].props.paneId));
  used.add('main');
  const have = new Map((prof.panes || []).filter((p) => p && p.id).map((p) => [p.id, p]));
  const seq = [];
  const push = (pid) => { if (used.has(pid) && !seq.includes(pid)) seq.push(pid); };
  push('main');
  for (const id of prof.order) push(prof.items[id].props.paneId);
  for (const p of (prof.panes || [])) if (p && p.id) push(p.id);
  prof.panes = seq.map((pid) => ({
    id: pid,
    label: paneLabel(pid),
    h: clampH((have.get(pid) || {}).h, paneDefaultH(pid)),
  }));

  prof.ui = prof.ui || {};
  prof.ui.open = prof.ui.open || { main: true };
  return prof;
}

export const DEFAULT_VDS = {
  vd1: { label: 'VD1', code: '005930', name: '삼성전자', tf: '1m' },
  vd2: { label: 'VD2', code: '000660', name: 'SK하이닉스', tf: '5m' },
  vd3: { label: 'VD3', code: '035720', name: '카카오', tf: '1d' },
  vd4: { label: 'VD4', code: '005380', name: '현대차', tf: '1d' },
};

export function defaultProject() {
  return { schemaVersion: 4, globalOn: true,
           active: { vd: 'vd1', code: DEFAULT_VDS.vd1.code, tf: DEFAULT_VDS.vd1.tf },
           vds: JSON.parse(JSON.stringify(DEFAULT_VDS)), profiles: {} };
}

export function paneDefaultH(paneId) {
  if (paneId === 'main') return 300;
  const c = addons.catalog().find((x) => x.pane === paneId);
  return (c && c.paneH) || 95;
}
