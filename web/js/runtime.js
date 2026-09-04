import * as addons from './addons.js';

function stable(o) {
  if (o === null || typeof o === 'string' || typeof o === 'boolean') return JSON.stringify(o);
  if (typeof o === 'number') {
    if (!Number.isFinite(o)) throw new TypeError('non-finite number in props');
    return JSON.stringify(Object.is(o, -0) ? 0 : o);
  }
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
  if (typeof o !== 'object') throw new TypeError('unsupported value in props');
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
}

function hash(o) {
  const s = stable(o);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function activePanes(profile, globalOn, ctx) {
  const used = new Set();
  for (const id of profile.order) {
    const it = profile.items[id];
    if (!it || !globalOn || !it.enabled || !it.visible) continue;
    const impl = addons.get(it.kind);
    if (!impl) continue;
    const props = impl.normalize(it, { id, form: ctx && ctx.form, axisSlot: 0 });
    used.add(props.paneId || it.props.paneId || 'main');
  }
  used.add('main');
  const known = new Map((profile.panes || []).map((p) => [p.id, p]));
  return [...used].map((id) => known.get(id) || { id, label: id, h: id === 'main' ? 300 : 120 });
}

export function createRuntime(engine) {
  const live = new Map();

  function desired(profile, globalOn, ctx) {
    const panes = activePanes(profile, globalOn, ctx);
    const idx = new Map(panes.map((p, i) => [p.id, i]));
    const slots = new Map();
    const out = [];
    for (const id of profile.order) {
      const it = profile.items[id];
      if (!it || !(globalOn && it.enabled && it.visible)) continue;
      const impl = addons.get(it.kind);
      if (!impl) continue;
      const slotKey = it.kind + '|' + (it.props.paneId || 'main');
      const slot = slots.get(slotKey) || 0;
      slots.set(slotKey, slot + 1);
      const props = impl.normalize(it, { id, form: ctx.form, axisSlot: slot });
      const pane = idx.get(props.paneId || it.props.paneId || 'main') ?? 0;
      const version = impl.version ? impl.version(ctx, props) : (ctx.barsHash || '0');
      out.push({ id, kind: it.kind, props, pane, version,
                 propsHash: hash({ kind: it.kind, props, pane }) });
    }
    out.sort((a, b) => a.pane - b.pane);
    return { want: out, panes };
  }

  return {
    apply(profile, globalOn, ctx, geo) {
      const ops = [];
      const { want, panes } = desired(profile, globalOn, ctx);
      const wantIds = new Set(want.map((w) => w.id));

      for (const [id, cur] of [...live.entries()]) {
        if (!wantIds.has(id)) {
          addons.get(cur.kind).remove(ctx, cur.handle);
          live.delete(id);
          ops.push({ op: 'remove', id, kind: cur.kind, propsHash: cur.propsHash });
        }
      }
      engine.trimPanes(panes.length);

      for (const w of want) {
        const cur = live.get(w.id);
        if (cur && (cur.kind !== w.kind || cur.pane !== w.pane)) {
          addons.get(cur.kind).remove(ctx, cur.handle);
          live.delete(w.id);
          ops.push({ op: 'remove', id: w.id, kind: cur.kind, propsHash: cur.propsHash });
        }
      }
      for (const w of want) {
        const cur = live.get(w.id);
        const itemCtx = { ...ctx, itemId: w.id,
          patchProps: (p) => { if (ctx.patchItem) ctx.patchItem(w.id, p); } };
        if (!cur) {
          const handle = addons.get(w.kind).ensure(itemCtx, w.props, w.pane);
          live.set(w.id, { kind: w.kind, pane: w.pane, props: w.props,
            propsHash: w.propsHash, version: w.version, handle });
          ops.push({ op: 'ensure', id: w.id, kind: w.kind, propsHash: w.propsHash });
        } else if (cur.propsHash !== w.propsHash || cur.version !== w.version) {
          addons.get(w.kind).update(itemCtx, cur.handle, w.props);
          cur.props = w.props;
          cur.propsHash = w.propsHash;
          cur.version = w.version;
          ops.push({ op: 'update', id: w.id, kind: w.kind, propsHash: w.propsHash });
        }
      }

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
      for (const [id, cur] of live.entries()) {
        const itemCtx = { ...ctx, itemId: id,
          patchProps: (p) => { if (ctx.patchItem) ctx.patchItem(id, p); } };
        addons.get(cur.kind).live(itemCtx, cur.handle, cur.props);
      }
    },
  };
}
