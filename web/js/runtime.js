import * as addons from './addons.js';

function hash(o) {
  const s = JSON.stringify(o, Object.keys(o).sort());
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h.toString(16);
}

export function activePanes(profile, globalOn) {
  const used = new Set();
  for (const id of profile.order) {
    const it = profile.items[id];
    if (it && globalOn && it.enabled && it.visible) used.add(it.props.paneId || 'main');
  }
  used.add('main');
  return profile.panes.filter((p) => used.has(p.id));
}

export function createRuntime(engine) {
  const live = new Map();
  let dataHash = '';

  function desired(profile, globalOn) {
    const panes = activePanes(profile, globalOn);
    const idx = new Map(panes.map((p, i) => [p.id, i]));
    const out = [];
    for (const id of profile.order) {
      const it = profile.items[id];
      if (!it || !(globalOn && it.enabled && it.visible)) continue;
      const impl = addons.get(it.kind);
      if (!impl) continue;
      const pane = idx.get(it.props.paneId || 'main') ?? 0;
      const props = impl.normalize(it);
      out.push({ id, kind: it.kind, props, pane,
                 propsHash: hash({ k: it.kind, p: props, n: pane }) });
    }
    out.sort((a, b) => a.pane - b.pane);
    return { want: out, panes };
  }

  return {
    apply(profile, globalOn, ctx, geo) {
      const ops = [];
      const { want, panes } = desired(profile, globalOn);
      const wantIds = new Set(want.map((w) => w.id));
      const dataChanged = ctx.barsHash !== dataHash;

      for (const [id, cur] of [...live.entries()]) {
        if (!wantIds.has(id)) {
          addons.get(cur.kind).remove(ctx, cur.handle);
          live.delete(id);
          ops.push({ op: 'remove', id });
        }
      }
      engine.trimPanes(panes.length);

      for (const w of want) {
        const cur = live.get(w.id);
        if (cur && (cur.kind !== w.kind || cur.pane !== w.pane)) {
          addons.get(cur.kind).remove(ctx, cur.handle);
          live.delete(w.id);
          ops.push({ op: 'remove', id: w.id });
        }
      }
      for (const w of want) {
        const cur = live.get(w.id);
        if (!cur) {
          const handle = addons.get(w.kind).ensure(ctx, w.props, w.pane);
          live.set(w.id, { kind: w.kind, pane: w.pane, propsHash: w.propsHash, handle });
          ops.push({ op: 'ensure', id: w.id });
        } else if (cur.propsHash !== w.propsHash || dataChanged) {
          addons.get(w.kind).update(ctx, cur.handle, w.props);
          cur.propsHash = w.propsHash;
          ops.push({ op: 'update', id: w.id });
        }
      }
      dataHash = ctx.barsHash;

      if (geo) {
        const view = profile.view || {};
        engine.setPaneStretch(panes.map((p) => p.h));
        if (view.barSpacing > 0) engine.setBarSpacing(view.barSpacing);
        engine.setAutoScale(view.autoScale !== false);
        engine.scrollToRealTime();
      }
      return { ops, panes };
    },
    tickLive(ctx) {
      for (const [, cur] of live.entries()) addons.get(cur.kind).live(ctx, cur.handle);
    },
  };
}
