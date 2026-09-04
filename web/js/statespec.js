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

export function defaultWindow(tf) {
  const prof = { panes: [], order: [], items: {},
                 view: { barSpacing: TF_BARSPACING[tf] || 8, autoScale: true },
                 ui: { open: { main: true } } };
  for (const c of addons.catalog()) {
    if (!c.auto) continue;
    const id = c.kind + '1';
    const props = { ...addons.defaults(c.kind), paneId: c.pane || 'main' };
    prof.items[id] = { kind: c.kind, enabled: true, visible: true, props };
    prof.order.push(id);
  }
  return reconcile(prof);
}

export function reconcile(prof) {
  const cat = new Map(addons.catalog().map((c) => [c.kind, c]));
  if (!prof.view) {
    prof.view = { barSpacing: prof.barSpacing === undefined ? 8 : prof.barSpacing,
                  autoScale: prof.scale ? prof.scale.autoScale !== false : true };
  }
  prof.items = prof.items || {};
  prof.order = (prof.order || []).filter((id) => prof.items[id]);
  for (const id of Object.keys(prof.items)) {
    const it = prof.items[id];
    const c = cat.get(it.kind);
    if (!c) { delete prof.items[id]; continue; }
    it.props = it.props || {};
    it.props.paneId = it.props.paneId || c.pane || 'main';
    for (const f of c.schema) {
      if (it.props[f.k] === undefined) it.props[f.k] = f.def;
    }
    if (!prof.order.includes(id)) prof.order.push(id);
  }
  const need = new Set(Object.values(prof.items).map((i) => i.props.paneId));
  need.add('main');
  const have = new Map((prof.panes || []).map((p) => [p.id, p]));
  prof.panes = [...need].map((pid) => have.get(pid) || {
    id: pid,
    h: pid === 'main' ? 300 : (cat.get([...cat.keys()].find((k) => cat.get(k).pane === pid)) || {}).paneH || 95,
    label: (cat.get([...cat.keys()].find((k) => cat.get(k).pane === pid)) || {}).label || pid,
  });
  prof.panes.sort((a, b) => (a.id === 'main' ? -1 : b.id === 'main' ? 1 : 0));
  return prof;
}
