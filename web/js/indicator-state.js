// Design: D7.v6.indicator-sync — pure desired-state transformations.
const clone = value => structuredClone(value);
const numeric = id => +(String(id).match(/\d+$/)?.[0] || 0);
export function reconcileIndicators(body, catalog) {
  const next = clone(body);
  next.indicatorSync ||= { enabled: false, sourceId: null };
  const targets = next.order.filter(id => catalog.meta(next.items[id]?.kind)?.selectable);
  const indicators = () => next.order.filter(id => catalog.meta(next.items[id]?.kind)?.indicator);
  const remove = id => { delete next.items[id]; next.order = next.order.filter(value => value !== id); };
  for (const id of indicators()) {
    const target = next.items[id].props.targetItemId;
    if (target && !targets.includes(target)) remove(id);
  }
  const sync = next.indicatorSync;
  if (!sync.enabled) return next;
  if (!targets.includes(sync.sourceId)) { next.indicatorSync = { enabled: false, sourceId: null }; return next; }
  for (const id of indicators()) if (!next.items[id].props.targetItemId) next.items[id].props.targetItemId = sync.sourceId;
  const originals = indicators().filter(id => next.items[id].props.targetItemId === sync.sourceId);
  for (const id of originals) delete next.items[id].props.syncOriginId;
  let seq = Math.max(next.itemSeq || 1, ...Object.keys(next.items).map(id => numeric(id) + 1));
  for (const target of targets.filter(id => id !== sync.sourceId)) {
    const previous = indicators().filter(id => next.items[id].props.targetItemId === target);
    const keep = new Set();
    for (const origin of originals) {
      const item = next.items[origin];
      let id = previous.find(id => next.items[id].props.syncOriginId === origin && next.items[id].kind === item.kind);
      if (!id) { id = item.kind + seq++; next.order.push(id); }
      const props = { ...clone(item.props), targetItemId: target, syncOriginId: origin };
      next.items[id] = { ...clone(item), props };
      keep.add(id);
    }
    for (const id of previous) if (!keep.has(id)) remove(id);
  }
  next.itemSeq = seq;
  return next;
}
// Design: D7.v6.indicator-sync
export function toggleIndicatorSync(body, enabled, catalog) {
  if (enabled && !catalog.meta(body.items[body.ui?.selectedItemId]?.kind)?.selectable) return null;
  const next = clone(body);
  next.indicatorSync = { enabled, sourceId: enabled ? body.ui.selectedItemId : null };
  return reconcileIndicators(next, catalog);
}
// Design: D7.v6.indicator-sync
export function indicatorBodyPatch(before, after, deletion) {
  const result = clone(after);
  const deletions = (old, next) => {
    for (const key of Object.keys(old)) {
      if (!Object.hasOwn(next,key)) next[key] = deletion;
      else if(old[key] && next[key] && typeof old[key] === 'object' && typeof next[key] === 'object' && !Array.isArray(old[key]) && !Array.isArray(next[key])) deletions(old[key],next[key]);
    }
  };
  deletions(before,result);
  return result;
}
// Design: D7.v6.indicator-sync
export function indicatorProfile(form, catalog) {
  const body = { ...form.body, items: { ...form.body.items } };
  const slots = new Map();
  const targetProps = new Map();
  for (const id of body.order) {
    const it = body.items[id];
    if (!it || !catalog.meta(it.kind)?.selectable) continue;
    const key = it.kind + '|' + (it.props.paneId || 'main');
    const axisSlot = slots.get(key) || 0; slots.set(key, axisSlot + 1);
    targetProps.set(id, catalog.get(it.kind).normalize(it, { id, form, axisSlot }));
  }
  for (const id of body.order) {
    const it = body.items[id];
    if (!it || !catalog.meta(it.kind)?.indicator || !it.props.targetItemId) continue;
    const target = body.items[it.props.targetItemId];
    const p = targetProps.get(it.props.targetItemId);
    if (!target || !p) { body.items[id] = { ...it, enabled: false }; continue; }
    const overlay = catalog.meta(it.kind).pane === 'main';
    body.items[id] = { ...it, enabled: it.enabled && target.enabled, visible: it.visible && target.visible,
      props: { ...it.props, dataKey: p.dataKey, code: p.code, tf: p.tf,
        paneId: overlay ? p.paneId : `${it.props.targetItemId}:${catalog.meta(it.kind).pane}`,
        scaleId: overlay ? p.scaleId : 'right',
        compareMode: overlay ? p.compareMode : 'price', baseTime: p.baseTime, baseValue: p.baseValue } };
  }
  return body;
}
