/* desk.js - feature-blind BRIDGE for form desired/live reconciliation. */

function canonicalError(path) {
  const error = new TypeError(`CanonicalValueError(${path})`);
  error.name = 'CanonicalValueError';
  throw error;
}

function canonicalText(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) canonicalError(path);
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    const parts = [];
    for (let index = 0; index < value.length; index++) {
      if (!(index in value)) canonicalError(`${path}[${index}]`);
      parts.push(canonicalText(value[index], `${path}[${index}]`));
    }
    return '[' + parts.join(',') + ']';
  }
  if (!value || typeof value !== 'object') canonicalError(path);
  return '{' + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ':' + canonicalText(value[key], `${path}.${key}`)).join(',') + '}';
}

// Design: D8.v6.canonical-hash
export function canonicalHash(value) {
  const bytes = new TextEncoder().encode(canonicalText(value));
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

const idNum = (s) => { const m = /(\d+)$/.exec(String(s || '')); return m ? +m[1] : 0; };
const byId = (a, b) => idNum(a) - idNum(b) || String(a).localeCompare(String(b));
const copy = (value) => JSON.parse(JSON.stringify(value));

function call(api, name, ...args) {
  if (!api || typeof api[name] !== 'function') throw new TypeError(`BridgeContractError(${name})`);
  return api[name](...args);
}

// Design: D7.v6.desired-diff
export function createDesk({ host, catalog, frame, patch, log, recorder, scheduler } = {}) {
  const live = new Map();
  let eventSeq = 0;
  let destroyed = false;

  const report = (stage, id, error) => {
    if (typeof log === 'function') log(`[DESK!] ${stage} ${id} ${error}`);
  };
  const record = (op, id, kind, propsHash) => {
    const event = { seq: ++eventSeq, op, id, kind, propsHash };
    if (typeof recorder === 'function') recorder(event);
    else if (recorder && typeof recorder.record === 'function') recorder.record(event);
    return event;
  };
  const send = (type, id, value) => {
    if (typeof patch === 'function') patch({ type, id, value });
  };
  const destroyOne = (id, cur, events) => {
    live.delete(id);
    try { call(catalog, 'remove', cur.kind, cur.context, cur.addonHandle); } catch (error) { report('remove', id, error); }
    try { call(frame, 'destroyFrame', cur.frameHandle); } catch (error) { report('destroy', id, error); }
    events.push(record('remove', id, cur.kind, cur.propsHash));
  };

  function ensureOne(item, events) {
    const raw = item.props?.addonRaw || {};
    const meta = item.props?.frame || {};
    let normalized;
    let propsHash;
    try {
      normalized = call(catalog, 'normalize', item.kind, raw);
      propsHash = canonicalHash(normalized);
    } catch (error) {
      report('normalize', item.id, error);
      return null;
    }
    const geo = { rect: copy(meta.rect || {}), winState: meta.winState || 'normal' };
    const geoHash = canonicalHash(geo);
    const titleHash = canonicalHash({ shareGroup: meta.shareGroup ?? null, title: meta.title ?? null });
    let frameHandle;
    try {
      frameHandle = call(frame, 'createFrame', host, item.id, geo.rect, {
        focus: (event) => { if (event?.isTrusted === true && event.type === 'pointerdown') send('focus', item.id, event); },
        geo: (rect) => send('geo', item.id, rect),
        min: () => send('min', item.id),
        max: () => send('max', item.id),
        close: () => send('close', item.id),
        menu: (point) => send('menu', item.id, point),
      });
      call(frame, 'setFrameTitle', frameHandle, meta.title ?? '', meta.shareGroup ?? 'all');
      call(frame, 'setFrameState', frameHandle, geo.winState, { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight });
      call(frame, 'setFrameVisible', frameHandle, true);
      call(frame, 'setFrameZ', frameHandle, item.order | 0);
      const context = {
        id: item.id,
        contentHost: call(frame, 'getContentHost', frameHandle),
        patch: (value) => send('addon', item.id, value),
        log,
        scheduler,
      };
      const addonHandle = call(catalog, 'ensure', item.kind, context, item.id, normalized);
      const cur = {
        kind: item.kind, props: normalized, propsHash, geoHash, titleHash,
        order: item.order | 0, zIdx: item.order | 0, frameHandle, addonHandle, context, error: null,
      };
      live.set(item.id, cur);
      events.push(record('ensure', item.id, item.kind, propsHash));
      return cur;
    } catch (error) {
      report('ensure', item.id, error);
      if (frameHandle) {
        try { call(frame, 'destroyFrame', frameHandle); } catch (destroyError) { report('destroy', item.id, destroyError); }
      }
      return null;
    }
  }

  function updateOne(item, cur, events) {
    const raw = item.props?.addonRaw || {};
    const meta = item.props?.frame || {};
    let next;
    let propsHash;
    try {
      next = call(catalog, 'normalize', item.kind, raw);
      propsHash = canonicalHash(next);
    } catch (error) {
      report('normalize', item.id, error);
      return;
    }
    const geo = { rect: copy(meta.rect || {}), winState: meta.winState || 'normal' };
    const geoHash = canonicalHash(geo);
    const titleHash = canonicalHash({ shareGroup: meta.shareGroup ?? null, title: meta.title ?? null });
    const propsChanged = cur.propsHash !== propsHash;
    const geoChanged = cur.geoHash !== geoHash;
    const titleChanged = cur.titleHash !== titleHash;
    const orderChanged = cur.order !== (item.order | 0);
    if (!(propsChanged || geoChanged || titleChanged || orderChanged)) return;
    if (propsChanged) {
      try { call(catalog, 'update', item.kind, cur.context, cur.addonHandle, cur.props, next); }
      catch (error) { report('update', item.id, error); return; }
      cur.props = next;
      cur.propsHash = propsHash;
    }
    if (titleChanged) {
      try { call(frame, 'setFrameTitle', cur.frameHandle, meta.title ?? '', meta.shareGroup ?? 'all'); }
      catch (error) { report('title', item.id, error); }
      cur.titleHash = titleHash;
    }
    if (geoChanged) {
      try {
        call(frame, 'setFrameRect', cur.frameHandle, geo.rect);
        call(frame, 'setFrameState', cur.frameHandle, geo.winState, { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight });
      } catch (error) { report('geometry', item.id, error); }
      cur.geoHash = geoHash;
    }
    cur.order = item.order | 0;
    events.push(record('update', item.id, item.kind, cur.propsHash));
  }

  function apply(changeSet0) {
    if (destroyed) throw new Error('InvalidDeskHandle');
    const changeSet = changeSet0 || { mode: 'delta', items: [], absentIds: [], order: { mode: 'keep', id: null } };
    const events = [];
    const items = [...(changeSet.items || [])].sort((a, b) => byId(a.id, b.id));
    const byDesiredId = new Map(items.map((item) => [item.id, item]));
    const removals = new Set(changeSet.absentIds || []);
    for (const item of items) {
      const cur = live.get(item.id);
      if (cur && cur.kind !== item.kind) removals.add(item.id);
    }
    for (const id of [...removals].sort(byId).reverse()) {
      const cur = live.get(id);
      if (cur) destroyOne(id, cur, events);
    }
    for (const item of items) {
      let cur = live.get(item.id);
      if (!cur) cur = ensureOne(item, events);
      else updateOne(item, cur, events);
    }

    const order = changeSet.order || { mode: 'keep', id: null };
    if (order.mode === 'raise') {
      const cur = live.get(order.id);
      if (cur) {
        let maxZ = -1;
        for (const entry of live.values()) maxZ = Math.max(maxZ, entry.zIdx);
        if (maxZ > 1000000) {
          const ordered = [...live.entries()].sort((a, b) => a[1].zIdx - b[1].zIdx || byId(a[0], b[0]));
          const targetIndex = ordered.findIndex(([id]) => id === order.id);
          ordered.push(...ordered.splice(targetIndex, 1));
          ordered.forEach(([id, entry], index) => {
            if (entry.zIdx !== index) {
              try { call(frame, 'setFrameZ', entry.frameHandle, index); } catch (error) { report('z', id, error); }
              if (id !== order.id && !events.some(event => event.id === id && event.op !== 'remove')) {
                events.push(record('update', id, entry.kind, entry.propsHash));
              }
            }
            entry.zIdx = index; entry.order = index;
          });
          maxZ = ordered.length - 1;
        } else {
          try { call(frame, 'setFrameZ', cur.frameHandle, maxZ + 1); } catch (error) { report('z', order.id, error); }
          cur.zIdx = ++maxZ;
          cur.order = maxZ;
        }
        if (!events.some((event) => event.id === order.id && event.op !== 'remove')) {
          events.push(record('update', order.id, cur.kind, cur.propsHash));
        }
      }
    } else if (order.mode === 'rebuild') {
      const ordered = [...live.entries()].sort((a, b) => {
        const ai = byDesiredId.get(a[0])?.order ?? a[1].order;
        const bi = byDesiredId.get(b[0])?.order ?? b[1].order;
        return ai - bi || byId(a[0], b[0]);
      });
      ordered.forEach(([id, cur], index) => {
        if (cur.zIdx === index) return;
        try { call(frame, 'setFrameZ', cur.frameHandle, index); } catch (error) { report('z', id, error); }
        cur.zIdx = index;
        cur.order = index;
        if (!events.some((event) => event.id === id && event.op !== 'remove')) {
          events.push(record('update', id, cur.kind, cur.propsHash));
        }
      });
    }
    return { events };
  }

  function snapshot() {
    return [...live.entries()].sort((a, b) => byId(a[0], b[0])).map(([id, cur]) => ({
      id, kind: cur.kind, propsHash: cur.propsHash, geoHash: cur.geoHash,
      order: cur.order, zIdx: cur.zIdx, error: cur.error,
    }));
  }

  function destroy() {
    if (destroyed) return;
    const events = [];
    for (const id of [...live.keys()].sort(byId).reverse()) destroyOne(id, live.get(id), events);
    destroyed = true;
  }

  return { apply, mounted: () => live.size, snapshot, destroy };
}
