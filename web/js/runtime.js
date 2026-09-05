import { canonicalHash } from './desk.js';

export function activePanes(profile, globalOn, ctx, registry) {
  const used = new Set();
  for (const id of profile.order) {
    const it = profile.items[id];
    if (!it || !globalOn || !it.enabled || !it.visible) continue;
    const impl = registry.get(it.kind);
    if (!impl) continue;
    const props = impl.normalize(it, { id, form: ctx && ctx.form, axisSlot: 0 });
    used.add(props.paneId || it.props.paneId || 'main');
  }
  used.add('main');
  const known = new Map((profile.panes || []).map((p) => [p.id, p]));
  return [...used].map((id) => known.get(id) || { id, label: id, h: id === 'main' ? 300 : 120 });
}

// Design: D7.v6.desired-diff
export function createRuntime({ core: engine, registry, recorder } = {}) {
  const live = new Map();
  let seq = 0;

  const record = (op, id, kind, propsHash) => {
    const event = { seq: ++seq, op, id, kind, propsHash };
    if (typeof recorder === 'function') recorder(event);
    else if (recorder && typeof recorder.record === 'function') recorder.record(event);
    return event;
  };
  const report = (ctx, stage, id, error) => {
    if (ctx && typeof ctx.log === 'function') ctx.log(`[RUNTIME!] ${stage} ${id} ${error}`);
  };

  function desired(profile, globalOn, ctx) {
    const panes = activePanes(profile, globalOn, ctx, registry);
    const idx = new Map(panes.map((p, i) => [p.id, i]));
    const slots = new Map();
    const out = [];
    for (const id of profile.order) {
      const it = profile.items[id];
      if (!it || !(globalOn && it.enabled && it.visible)) continue;
      const impl = registry.get(it.kind);
      if (!impl) continue;
      const slotKey = it.kind + '|' + (it.props.paneId || 'main');
      const slot = slots.get(slotKey) || 0;
      slots.set(slotKey, slot + 1);
      const props = impl.normalize(it, { id, form: ctx.form, axisSlot: slot });
      const pane = idx.get(props.paneId || it.props.paneId || 'main') ?? 0;
      const version = impl.version ? impl.version(ctx, props) : (ctx.barsHash || '0');
      out.push({ id, kind: it.kind, props, pane, version,
                 propsHash: canonicalHash({ kind: it.kind, props, pane }) });
    }
    out.sort((a, b) => a.pane - b.pane);
    return { want: out, panes };
  }

  return {
    apply(profile, globalOn, ctx, geo) {
      const ops = [];
      const { want, panes } = desired(profile, globalOn, ctx);
      const wantIds = new Set(want.map((w) => w.id));

      const gone = [...live.entries()].filter(([id]) => !wantIds.has(id))
        .sort((a, b) => String(b[0]).localeCompare(String(a[0]), undefined, { numeric: true }));
      for (const [id, cur] of gone) {
        live.delete(id);
        try { registry.get(cur.kind).remove(ctx, cur.handle); }
        catch (error) { report(ctx, 'remove', id, error); }
        ops.push(record('remove', id, cur.kind, cur.propsHash));
      }
      engine.trimPanes(panes.length);

      for (const w of want) {
        const cur = live.get(w.id);
        if (cur && (cur.kind !== w.kind || cur.pane !== w.pane)) {
          live.delete(w.id);
          try { registry.get(cur.kind).remove(ctx, cur.handle); }
          catch (error) { report(ctx, 'remove', w.id, error); }
          ops.push(record('remove', w.id, cur.kind, cur.propsHash));
        }
      }
      for (const w of want) {
        const cur = live.get(w.id);
        const itemCtx = { ...ctx, itemId: w.id,
          patchProps: (p) => { if (ctx.patchItem) ctx.patchItem(w.id, p); } };
        if (!cur) {
          let handle;
          try { handle = registry.get(w.kind).ensure(itemCtx, w.props, w.pane); }
          catch (error) { report(ctx, 'ensure', w.id, error); continue; }
          live.set(w.id, { kind: w.kind, pane: w.pane, props: w.props,
            propsHash: w.propsHash, version: w.version, handle });
          ops.push(record('ensure', w.id, w.kind, w.propsHash));
        } else if (cur.propsHash !== w.propsHash || cur.version !== w.version) {
          try { registry.get(w.kind).update(itemCtx, cur.handle, w.props); }
          catch (error) { report(ctx, 'update', w.id, error); continue; }
          cur.props = w.props;
          cur.propsHash = w.propsHash;
          cur.version = w.version;
          ops.push(record('update', w.id, w.kind, w.propsHash));
        }
      }

      if (geo) {
        const view = profile.view || {};
        engine.setPaneStretch(panes.map((p) => p.h));
        if (view.barSpacing > 0) engine.setBarSpacing(view.barSpacing);
        engine.setAutoScale(view.autoScale !== false);
        // Design: D5.v6.chart-range — scrolling requires an explicit user command.
      }
      return { ops, panes };
    },
    tickLive(ctx) {
      for (const [id, cur] of live.entries()) {
        const itemCtx = { ...ctx, itemId: id,
          patchProps: (p) => { if (ctx.patchItem) ctx.patchItem(id, p); } };
        registry.get(cur.kind).live(itemCtx, cur.handle, cur.props);
      }
    },
    mounted: () => live.size,
    snapshot: () => [...live.entries()].map(([id, cur]) => ({ id, kind: cur.kind, propsHash: cur.propsHash, pane: cur.pane })),
    destroy(ctx = {}) {
      for (const [id, cur] of [...live.entries()].reverse()) {
        live.delete(id);
        try { registry.get(cur.kind).remove(ctx, cur.handle); }
        catch (error) { report(ctx, 'remove', id, error); }
        record('remove', id, cur.kind, cur.propsHash);
      }
    },
  };
}
