/* deskspec.js - schemaVersion 6 STATE.
   Pure state policy: no DOM, network, persistence, or screen-kind branches. */

export const PROJECT_SCHEMA = 6;
export const VD_MAX = 8;
export const VD_HOTKEYS = 8;
export const GRID = 24;
export const MIN_W = 240;
export const MIN_H = 120;
export const DEF_CODE = '005930';
export const DEF_TF = '1m';
export const DEL = '__delete__';

const ROOT_KEYS = [
  'schemaVersion', 'globalOn', 'activeVd', 'symLink', 'layout', 'seq',
  'vds', 'forms', 'snapshots', 'undo',
];
const VD_KEYS = ['slot', 'label', 'enabled', 'z'];
const FORM_KEYS = [
  'screen', 'vd', 'allVd', 'visible', 'title', 'code', 'tf', 'link',
  'shareGroup', 'rect', 'winState', 'prevRect', 'body',
];

const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const obj = (v) => (isObject(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clone = (v) => JSON.parse(JSON.stringify(v));
const idNum = (s) => { const m = /(\d+)$/.exec(String(s || '')); return m ? +m[1] : 0; };
const byId = (a, b) => idNum(a) - idNum(b) || String(a).localeCompare(String(b));
const slotId = (n) => `vd${n}`;
const validSlotId = (id) => /^vd[1-8]$/.test(String(id));
const codePoints = (s) => [...String(s)];

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (typeof value !== 'string' || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function exactPatch(before0, after0) {
  const before = obj(before0);
  const after = obj(after0);
  const out = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!(key in after)) { out[key] = DEL; continue; }
    if (!(key in before)) { out[key] = clone(after[key]); continue; }
    const a = before[key];
    const b = after[key];
    if (isObject(a) && isObject(b)) {
      const nested = exactPatch(a, b);
      if (Object.keys(nested).length) out[key] = nested;
    } else if (JSON.stringify(a) !== JSON.stringify(b)) out[key] = clone(b);
  }
  return out;
}

function screenMeta(cat, kind) {
  if (!cat || typeof cat.meta !== 'function') return {};
  try { return obj(cat.meta(kind)); } catch (_) { return {}; }
}

function normalRect(raw0, meta0, bounds0) {
  const raw = obj(raw0);
  const meta = obj(meta0);
  const bounds = obj(bounds0);
  const minW = Math.max(MIN_W, Math.round(obj(meta.minSize).w || MIN_W));
  const minH = Math.max(MIN_H, Math.round(obj(meta.minSize).h || MIN_H));
  const bw = Math.max(minW, Math.round(bounds.w || 1280));
  const bh = Math.max(minH, Math.round(bounds.h || 720));
  const dw = obj(meta.defRect).w || 720;
  const dh = obj(meta.defRect).h || 460;
  const w = clamp(Math.round(finite(raw.w) ? raw.w : dw), minW, bw);
  const h = clamp(Math.round(finite(raw.h) ? raw.h : dh), minH, bh);
  const x = clamp(Math.round(finite(raw.x) ? raw.x : GRID), 0, Math.max(0, bw - w));
  const y = clamp(Math.round(finite(raw.y) ? raw.y : GRID), 0, Math.max(0, bh - h));
  return { x, y, w, h };
}

// Design: D3.v6.vd-fields
export function labelKey(value) {
  return String(value ?? '').trim().normalize('NFKC').replace(/[A-Z]/g, (c) => c.toLowerCase());
}

// Design: D3.v6.vd-fields
export function validateVdLabel(st, id, value) {
  const label = String(value ?? '').trim();
  if (!label || codePoints(label).length > 8) return { ok: false, reason: 'invalid', conflictSlot: null };
  const wanted = labelKey(label);
  for (let slot = 1; slot <= VD_MAX; slot++) {
    const otherId = slotId(slot);
    if (otherId !== id && labelKey(obj(obj(st).vds)[otherId]?.label) === wanted) {
      return { ok: false, reason: 'duplicate', conflictSlot: slot };
    }
  }
  return { ok: true, reason: null, conflictSlot: null };
}

function nextUniqueNumericLabel(vds, start, exceptId = null) {
  const used = new Set(Object.entries(obj(vds))
    .filter(([id]) => id !== exceptId)
    .map(([, v]) => labelKey(obj(v).label)));
  let n = Math.max(1, start | 0);
  while (used.has(labelKey(String(n)))) n++;
  return String(n);
}

function emptyVd(slot, enabled = false, label = null) {
  return { slot, label: label ?? String(slot), enabled: !!enabled, z: [] };
}

// Design: D3.v6.root-fields
export function defaultStateV6() {
  const vds = {};
  for (let slot = 1; slot <= VD_MAX; slot++) vds[slotId(slot)] = emptyVd(slot, slot === 1);
  return {
    schemaVersion: PROJECT_SCHEMA,
    globalOn: true,
    activeVd: 'vd1',
    symLink: 'vd',
    layout: { sidebarW: 300, snapPx: 8 },
    seq: { form: 1, snapshot: 1 },
    vds,
    forms: {},
    snapshots: {},
    undo: null,
  };
}

export const defaultProject = defaultStateV6;

export function defaultVd(label, order = 0) {
  const slot = clamp((order | 0) + 1, 1, VD_MAX);
  return emptyVd(slot, true, String(label));
}

export function vdOrder(st) {
  return Array.from({ length: VD_MAX }, (_, i) => slotId(i + 1))
    .filter((id) => Object.prototype.hasOwnProperty.call(obj(obj(st).vds), id));
}

export function nextVdId(st) {
  return vdOrder(st).find((id) => !obj(st.vds[id]).enabled) || null;
}

export function nextVdOrder(st) {
  const id = nextVdId(st);
  return id ? idNum(id) - 1 : VD_MAX;
}

export function nextVdLabel(st) {
  const id = nextVdId(st);
  return nextUniqueNumericLabel(obj(st).vds, id ? idNum(id) : VD_MAX + 1);
}

export function hasVdLabel(st, label, exceptId) {
  const result = validateVdLabel(st, exceptId, label);
  return !result.ok && result.reason === 'duplicate';
}

export function nextFormId(st) {
  let n = Math.max(1, obj(obj(st).seq).form | 0);
  for (const id of Object.keys(obj(obj(st).forms))) n = Math.max(n, idNum(id) + 1);
  return `f${n}`;
}

export function cascadeRect(st, vd, meta, bounds) {
  const count = Object.values(obj(obj(st).forms)).filter((f) => obj(f).vd === vd).length;
  const step = count % 8;
  const base = normalRect({}, meta, bounds);
  return normalRect({ x: GRID / 2 + step * GRID, y: GRID / 2 + step * GRID, w: base.w, h: base.h }, meta, bounds);
}

export function defaultForm(st, kind, seed0, cat, bounds) {
  const seed = obj(seed0);
  const meta = screenMeta(cat, kind);
  const vd = validSlotId(seed.vd) ? seed.vd : (validSlotId(st.activeVd) ? st.activeVd : 'vd1');
  const rect = seed.rect ? normalRect(seed.rect, meta, bounds) : cascadeRect(st, vd, meta, bounds);
  const needCode = meta.needCode !== false;
  const needTf = !!meta.needTf;
  const form = {
    screen: String(kind || ''), vd, allVd: !!seed.allVd, visible: seed.visible !== false,
    title: typeof seed.title === 'string' && seed.title ? seed.title : null,
    code: needCode ? (/^\d{6}$/.test(String(seed.code || '')) ? String(seed.code) : DEF_CODE) : null,
    tf: needTf ? (typeof seed.tf === 'string' && seed.tf ? seed.tf : DEF_TF) : null,
    link: seed.link === 'pin' ? 'pin' : 'follow',
    shareGroup: /^(all|10|[1-9])$/.test(String(seed.shareGroup || 'all')) ? String(seed.shareGroup || 'all') : 'all',
    rect, winState: 'normal', prevRect: { ...rect }, body: {},
  };
  form.body = cat && typeof cat.defaultBody === 'function' ? cat.defaultBody(kind, form) : {};
  return form;
}

function orderedLegacyVds(rawVds) {
  return Object.keys(obj(rawVds)).sort((a, b) => {
    const av = obj(rawVds[a]);
    const bv = obj(rawVds[b]);
    const ao = finite(av.order) ? av.order | 0 : 0;
    const bo = finite(bv.order) ? bv.order | 0 : 0;
    return ao - bo || idNum(a) - idNum(b) || String(a).localeCompare(String(b));
  });
}

function mapVds(raw0, migrating, repairs) {
  const rawVds = obj(raw0.vds);
  const keys = Object.keys(rawVds);
  const alreadyFixed = !migrating && keys.length === VD_MAX && keys.every(validSlotId);
  const groups = Array.from({ length: VD_MAX }, () => []);
  const oldToNew = {};
  if (alreadyFixed) {
    for (let slot = 1; slot <= VD_MAX; slot++) {
      const id = slotId(slot);
      groups[slot - 1].push(id);
      oldToNew[id] = id;
    }
  } else {
    const ordered = orderedLegacyVds(rawVds);
    ordered.forEach((oldId, index) => {
      const slot = index < 7 ? index + 1 : 8;
      groups[slot - 1].push(oldId);
      oldToNew[oldId] = slotId(slot);
    });
    repairs.push(`[REPAIR] vd-layout count=${ordered.length}`);
    if (ordered.length > VD_MAX) repairs.push(`[REPAIR] vd-merge count=${ordered.length - 7}`);
  }
  const vds = {};
  const usedLabels = new Set();
  for (let slot = 1; slot <= VD_MAX; slot++) {
    const ids = groups[slot - 1];
    const source = obj(rawVds[ids[0]]);
    let label = String(source.label ?? '').trim();
    if (!label || codePoints(label).length > 8 || usedLabels.has(labelKey(label))) {
      label = nextUniqueNumericLabel(vds, slot);
      repairs.push(`[REPAIR] vd-label slot=${slot}`);
    }
    usedLabels.add(labelKey(label));
    const enabled = alreadyFixed ? !!source.enabled : ids.length > 0;
    const z = ids.flatMap((id) => arr(obj(rawVds[id]).z));
    vds[slotId(slot)] = { slot, label, enabled, z };
    if (alreadyFixed && source.slot !== slot) repairs.push(`[REPAIR] vd-slot id=${slotId(slot)}`);
  }
  return { vds, groups, oldToNew };
}

function normalizeForm(id, raw0, activeVd, oldToNew, options, repairs) {
  const raw = obj(raw0);
  const kind = typeof raw.screen === 'string' ? raw.screen : '';
  const meta = screenMeta(options.cat, kind);
  let vd = oldToNew[raw.vd] || (validSlotId(raw.vd) ? raw.vd : activeVd);
  if (!validSlotId(vd)) vd = activeVd;
  if (vd !== raw.vd) repairs.push(`[REPAIR] form-vd id=${id}`);
  const rect = normalRect(raw.rect, meta, options.bounds);
  const prevRect = normalRect(raw.prevRect || rect, meta, options.bounds);
  const code = meta.needCode === false ? null
    : (/^\d{6}$/.test(String(raw.code || '')) ? String(raw.code) : (meta.needCode ? DEF_CODE : null));
  const tf = meta.needTf === false ? null
    : (typeof raw.tf === 'string' && raw.tf ? raw.tf : (meta.needTf ? DEF_TF : null));
  const form = {
    screen: kind, vd, allVd: !!raw.allVd, visible: raw.visible !== false,
    title: typeof raw.title === 'string' && raw.title ? raw.title : null,
    code, tf,
    link: raw.link === 'pin' ? 'pin' : 'follow',
    shareGroup: /^(all|10|[1-9])$/.test(String(raw.shareGroup || 'all')) ? String(raw.shareGroup || 'all') : 'all',
    rect, winState: ['normal', 'min', 'max'].includes(raw.winState) ? raw.winState : 'normal',
    prevRect, body: {},
  };
  let body = obj(raw.body);
  if (options.cat && typeof options.cat.reconcileBody === 'function' && kind) {
    try { body = options.cat.reconcileBody(kind, body, form); } catch (_) { body = obj(raw.body); }
  }
  form.body = clone(body);
  return form;
}

function repairZ(st, sourceZ, repairs) {
  const formIds = Object.keys(st.forms).sort(byId);
  const allIds = formIds.filter((id) => st.forms[id].allVd);
  const globalAll = uniqueStrings([
    ...Array.from({ length: VD_MAX }, (_, i) => slotId(i + 1)).flatMap((id) => arr(sourceZ[id])),
    ...allIds,
  ]).filter((id) => allIds.includes(id));
  for (let slot = 1; slot <= VD_MAX; slot++) {
    const vid = slotId(slot);
    const vd = st.vds[vid];
    if (!vd.enabled) { vd.z = []; continue; }
    const owned = formIds.filter((id) => st.forms[id].vd === vid && !st.forms[id].allVd);
    const allowed = new Set([...owned, ...allIds]);
    const prior = uniqueStrings(arr(sourceZ[vid])).filter((id) => allowed.has(id));
    const z = [...prior];
    for (const id of owned) if (!z.includes(id)) z.push(id);
    for (const id of globalAll) if (!z.includes(id)) z.push(id);
    if (JSON.stringify(z) !== JSON.stringify(arr(sourceZ[vid]))) repairs.push(`[REPAIR] z-fix id=${vid}`);
    vd.z = z;
  }
}

function reconcileInternal(raw0, options = {}) {
  if (!isObject(raw0)) return { st: null, patch: null, repairs: [], fatal: { code: 'ROOT_TYPE' }, changed: false, dropped: [] };
  if (finite(raw0.schemaVersion) && raw0.schemaVersion > PROJECT_SCHEMA) {
    return { st: null, patch: null, repairs: [], fatal: { code: 'FUTURE_SCHEMA', schemaVersion: raw0.schemaVersion }, changed: false, dropped: [] };
  }
  const raw = clone(raw0);
  const migrating = (raw.schemaVersion | 0) < PROJECT_SCHEMA;
  const repairs = [];
  const mapped = mapVds(raw, migrating, repairs);
  const st = defaultStateV6();
  st.globalOn = typeof raw.globalOn === 'boolean' ? raw.globalOn : true;
  st.symLink = raw.symLink === 'all' ? 'all' : 'vd';
  st.layout.sidebarW = clamp(Math.round(finite(obj(raw.layout).sidebarW) ? raw.layout.sidebarW : 300), 220, 520);
  st.layout.snapPx = clamp(Math.round(finite(obj(raw.layout).snapPx) ? raw.layout.snapPx : 8), 0, 24);
  st.vds = mapped.vds;
  const requestedActive = mapped.oldToNew[raw.activeVd] || raw.activeVd;
  st.activeVd = validSlotId(requestedActive) ? requestedActive : 'vd1';
  st.forms = {};
  for (const id of Object.keys(obj(raw.forms)).sort(byId)) {
    st.forms[id] = normalizeForm(id, raw.forms[id], st.activeVd, mapped.oldToNew, options, repairs);
    st.vds[st.forms[id].vd].enabled = true;
  }
  if (!Object.values(st.vds).some((v) => v.enabled)) st.vds.vd1.enabled = true;
  if (!st.vds[st.activeVd]?.enabled) {
    st.activeVd = vdOrder(st).find((id) => st.vds[id].enabled) || 'vd1';
    repairs.push(`[REPAIR] active-vd id=${st.activeVd}`);
  }
  const sourceZ = {};
  for (let slot = 1; slot <= VD_MAX; slot++) {
    const vid = slotId(slot);
    sourceZ[vid] = mapped.groups[slot - 1].flatMap((oldId) => arr(obj(obj(raw.vds)[oldId]).z));
  }
  repairZ(st, sourceZ, repairs);
  let nextForm = Math.max(1, obj(raw.seq).form | 0);
  for (const id of Object.keys(st.forms)) nextForm = Math.max(nextForm, idNum(id) + 1);
  st.seq.form = nextForm;
  st.seq.snapshot = Math.max(1, obj(raw.seq).snapshot | 0);
  st.snapshots = clone(obj(raw.snapshots));
  st.undo = isObject(raw.undo) ? clone(raw.undo) : null;
  const patch = exactPatch(raw0, st);
  const changed = Object.keys(patch).length > 0;
  return {
    st, patch,
    repairs: migrating ? [`[MIGRATE] v${raw.schemaVersion || 0}->${PROJECT_SCHEMA}`, ...repairs] : repairs,
    fatal: null, changed, dropped: [],
  };
}

// Design: D4.v6.repair-vs-fatal
export function reconcileV6(raw) { return reconcileInternal(raw); }

// Design: D4.v6.migration-v5
export function migrateV5(raw) { return reconcileInternal({ ...obj(raw), schemaVersion: 5 }); }

export function reconcile(raw, cat, bounds) { return reconcileInternal(raw, { cat, bounds }); }

export function migrate(raw, cat, bounds) {
  const result = reconcileInternal(raw, { cat, bounds });
  return { ...result, forms: result.st ? Object.keys(result.st.forms).length : 0, dropped: 0 };
}

function stateSnapshot(st) {
  return clone({ activeVd: st.activeVd, symLink: st.symLink, layout: st.layout, vds: st.vds, forms: st.forms });
}

// Design: D7.v6.slot-commands
export function activateSlotPatch(st0, slot) {
  const st = clone(st0);
  const id = slotId(slot | 0);
  if (!st.vds?.[id]) return null;
  if (!st.vds[id].enabled) {
    const enabled = vdOrder(st).filter((vid) => st.vds[vid].enabled);
    const nearest = enabled.sort((a, b) => idNum(a) - idNum(b))[0];
    const all = nearest ? st.vds[nearest].z.filter((fid) => st.forms[fid]?.allVd) : [];
    st.vds[id].enabled = true;
    st.vds[id].z = [...all];
  }
  st.activeVd = id;
  return exactPatch(st0, st);
}

// Design: D7.v6.slot-commands
export function resetVdPatch(st0, id) {
  if (!st0.vds?.[id]?.enabled) return null;
  const enabled = vdOrder(st0).filter((vid) => st0.vds[vid].enabled);
  if (enabled.length <= 1) return null;
  const st = clone(st0);
  st.undo = { reason: 'resetVd', snapshot: stateSnapshot(st0) };
  const owned = Object.keys(st.forms).filter((fid) => st.forms[fid].vd === id);
  for (const fid of owned) delete st.forms[fid];
  for (const vd of Object.values(st.vds)) vd.z = vd.z.filter((fid) => !owned.includes(fid));
  st.vds[id] = emptyVd(idNum(id), false, nextUniqueNumericLabel(st.vds, idNum(id), id));
  if (st.activeVd === id) st.activeVd = enabled.find((vid) => vid !== id);
  return exactPatch(st0, st);
}

// Design: D7.v6.slot-commands
export function cloneVdPatch(st0, sourceId, targetId) {
  if (!st0.vds?.[sourceId]?.enabled || !st0.vds?.[targetId] || st0.vds[targetId].enabled) return null;
  const st = clone(st0);
  const ids = st0.vds[sourceId].z.filter((id) => st0.forms[id]?.vd === sourceId && !st0.forms[id].allVd);
  const idMap = new Map();
  let next = Math.max(1, obj(st.seq).form | 0);
  for (const oldId of ids) {
    while (st.forms[`f${next}`]) next++;
    const newId = `f${next++}`;
    idMap.set(oldId, newId);
    st.forms[newId] = { ...clone(st0.forms[oldId]), vd: targetId, allVd: false };
  }
  const all = st0.vds[sourceId].z.filter((id) => st0.forms[id]?.allVd);
  st.vds[targetId].enabled = true;
  st.vds[targetId].z = st0.vds[sourceId].z.map((id) => idMap.get(id) || (all.includes(id) ? id : null)).filter(Boolean);
  st.activeVd = targetId;
  st.seq.form = next;
  return exactPatch(st0, st);
}

// Design: D7.v6.slot-commands
export function setFormVisiblePatch(st, id, visible) {
  if (!st.forms?.[id] || st.forms[id].visible === !!visible) return {};
  return { forms: { [id]: { visible: !!visible } } };
}

function formEffective(st, form) {
  return !!st.globalOn && form.visible !== false
    && (form.allVd || form.vd === st.activeVd);
}

// Design: D9.v6.form-series
export function zList(st0) {
  const st = obj(st0);
  const forms = obj(st.forms);
  const active = obj(obj(st.vds)[st.activeVd]);
  const effective = Object.keys(forms).filter((id) => formEffective(st, obj(forms[id])));
  const wanted = new Set(effective);
  const out = uniqueStrings(arr(active.z)).filter((id) => wanted.has(id));
  for (const id of effective.sort(byId)) if (!out.includes(id)) out.push(id);
  return out;
}

function desiredItem(st, id, order) {
  const form = obj(obj(st.forms)[id]);
  return {
    id,
    kind: form.screen,
    enabled: true,
    visible: true,
    props: {
      addonRaw: { body: clone(obj(form.body)), code: form.code ?? null, tf: form.tf ?? null },
      frame: {
        rect: clone(obj(form.rect)),
        winState: form.winState,
        title: form.title,
        shareGroup: form.shareGroup,
      },
    },
    order,
  };
}

// Design: D9.v6.form-series
export function effectiveForms(st) {
  return zList(st).map((id, order) => desiredItem(st, id, order));
}

function orderChange(before, after) {
  const oldZ = arr(obj(obj(before).vds)[obj(before).activeVd]?.z);
  const newZ = arr(obj(obj(after).vds)[obj(after).activeVd]?.z);
  if (JSON.stringify(oldZ) === JSON.stringify(newZ)) return { mode: 'keep', id: null };
  if (oldZ.length === newZ.length && newZ.length) {
    const id = newZ[newZ.length - 1];
    const oldRest = oldZ.filter((x) => x !== id);
    const newRest = newZ.slice(0, -1);
    if (oldZ.includes(id) && JSON.stringify(oldRest) === JSON.stringify(newRest)) return { mode: 'raise', id };
  }
  return { mode: 'rebuild', id: null };
}

// Design: D4.v6.write-queue
export function impactOfPatch(before0, path0, body0) {
  const before = obj(before0);
  const path = String(path0 || '').split('/').filter(Boolean);
  const body = obj(body0);
  const impact = { mode: 'delta', ids: [], order: { mode: 'keep', id: null } };
  const ids = new Set();
  const scope = () => { impact.mode = 'scope'; };
  const rebuild = () => { impact.order = { mode: 'auto', id: null }; };

  if (!path.length) {
    if ('schemaVersion' in body) scope();
    if ('activeVd' in body || 'globalOn' in body) { scope(); rebuild(); }
    for (const [id, value] of Object.entries(obj(body.forms))) {
      ids.add(id);
      if (value === DEL || !before.forms?.[id]) rebuild();
      else if (isObject(value) && Object.prototype.hasOwnProperty.call(value, 'allVd')) { scope(); rebuild(); }
    }
    for (const value of Object.values(obj(body.vds))) {
      if (!isObject(value)) continue;
      if (Object.prototype.hasOwnProperty.call(value, 'enabled')) scope();
      if (Object.prototype.hasOwnProperty.call(value, 'z')) rebuild();
    }
  } else if (path[0] === 'forms') {
    if (path[1]) {
      ids.add(path[1]);
      if (path[2] === 'allVd' || (!path[2] && Object.prototype.hasOwnProperty.call(body, 'allVd'))) { scope(); rebuild(); }
    } else {
      for (const [id, value] of Object.entries(body)) {
        ids.add(id);
        if (value === DEL || !before.forms?.[id]) rebuild();
        else if (isObject(value) && Object.prototype.hasOwnProperty.call(value, 'allVd')) { scope(); rebuild(); }
      }
    }
  } else if (path[0] === 'vds' && path[1]) {
    if (path[2] === 'enabled' || (!path[2] && Object.prototype.hasOwnProperty.call(body, 'enabled'))) scope();
    if (path[2] === 'z' || (!path[2] && Object.prototype.hasOwnProperty.call(body, 'z'))) rebuild();
  } else if (path[0] === 'activeVd' || path[0] === 'globalOn') {
    scope(); rebuild();
  }
  impact.ids = [...ids].sort(byId);
  return impact;
}

// Design: D7.v6.desired-diff
export function projectDeskChange(before0, after0, impact0) {
  const before = obj(before0);
  const after = obj(after0);
  const impact = obj(impact0);
  const requestedOrder = obj(impact.order);
  const order = requestedOrder.mode === 'auto' ? orderChange(before, after)
    : { mode: requestedOrder.mode || 'keep', id: requestedOrder.id ?? null };
  const beforeIds = new Set(zList(before));
  const afterItems = effectiveForms(after);
  const afterIds = new Set(afterItems.map((item) => item.id));
  const affected = impact.mode === 'scope'
    ? new Set([...Object.keys(obj(before.forms)), ...Object.keys(obj(after.forms))])
    : new Set(arr(impact.ids));
  if (order.mode === 'rebuild') {
    for (const id of beforeIds) affected.add(id);
    for (const id of afterIds) affected.add(id);
  }
  const selected = afterItems.filter((item) => impact.mode === 'initial' || affected.has(item.id));
  const absentIds = [...affected].filter((id) => !afterIds.has(id)).sort(byId).reverse();
  return { mode: impact.mode || 'delta', items: selected, absentIds, order };
}

export const __test = { exactPatch, normalRect, idNum, FORM_KEYS, ROOT_KEYS, VD_KEYS };

// Design: D7.v6.symbol-link
export function symbolPatch(st, sourceId, code, screenCatalog) {
  const source = st.forms[sourceId];
  if (!source || !/^\d{6}$/.test(code)) return null;
  const forms = { [sourceId]: { code } };
  if (source.link === 'pin') return { forms };
  const ids = Object.keys(st.forms).sort((a,b) => idNum(a)-idNum(b) || (a < b ? -1 : 1));
  for (const id of ids) {
    const target = st.forms[id];
    if (id === sourceId || !st.vds[target.vd]?.enabled || target.link !== 'follow' || target.shareGroup !== source.shareGroup) continue;
    if (st.symLink === 'vd' && target.vd !== source.vd) continue;
    if (!screenCatalog.meta(target.screen).needCode) continue;
    forms[id] = { code };
  }
  return { forms };
}
// Design: D7.v6.navigator
export function listForms(st, deskSnapshot, query, screenCatalog) {
  const mounted = new Map(deskSnapshot.map(row => [row.id, row]));
  const q = labelKey(query);
  return Object.entries(st.forms).filter(([,f]) => st.vds[f.vd]?.enabled).map(([id,f]) => {
    const meta = screenCatalog.meta(f.screen);
    const live = mounted.get(id);
    return {id, ...f, slot:st.vds[f.vd].slot, vdLabel:st.vds[f.vd].label,
      label:f.title || meta.label, no:meta.no,
      status:live?.error ? 'error' : !f.visible ? 'hidden' : f.winState === 'min' ? 'minimized' : live ? 'mounted' : 'inactive'};
  }).filter(f => labelKey([f.no,f.label,f.code,f.id,f.vdLabel].join(' ')).includes(q))
    .sort((a,b) => a.slot-b.slot || st.vds[a.vd].z.indexOf(a.id)-st.vds[b.vd].z.indexOf(b.id) || idNum(a.id)-idNum(b.id) || (a.id < b.id ? -1 : 1));
}

// Design: D7.v6.snapshot-import
export function saveSnapshotPatch(st, name) {
  name = String(name).trim();
  if (!name || [...name].length > 32 || Object.values(st.snapshots).some(s => labelKey(s.name) === labelKey(name))) return null;
  const id = 's' + st.seq.snapshot;
  return { snapshots: { [id]: { name, ...stateSnapshot(st) } }, seq: { snapshot: st.seq.snapshot + 1 } };
}
function restoreActive(st, snapshot, reason) {
  const next = { ...clone(st), ...stateSnapshot(snapshot) };
  next.seq.form = Math.max(st.seq.form, ...Object.keys(next.forms).map(id => idNum(id)+1));
  next.undo = reason ? { reason, snapshot:stateSnapshot(st) } : null;
  return exactPatch(st, next);
}
// Design: D7.v6.snapshot-import
export function restoreSnapshotPatch(st, id) {
  return st.snapshots[id] ? restoreActive(st, st.snapshots[id], 'restoreSnapshot') : null;
}
// Design: D7.v6.snapshot-import
export function undoPatch(st) { return st.undo ? restoreActive(st, st.undo.snapshot, null) : null; }
// Design: D7.v6.snapshot-import
export function exportWorkspace(st) {
  return { format:'kiwoom-auto-workspace', version:1, state:{ ...clone(st), undo:null } };
}
// Import validates stored geometry independently of the current viewport.
function packageBounds(st) {
  let w=1280,h=720;
  for(const f of Object.values(st.forms || {})) for(const r of [f.rect,f.prevRect]) {
    if(r && Number.isFinite(r.x+r.w) && Number.isFinite(r.y+r.h)){w=Math.max(w,r.x+r.w);h=Math.max(h,r.y+r.h);}
  }
  return {w,h};
}
// Design: D7.v6.snapshot-import
export function importWorkspacePatch(st, pkg) {
  if (!pkg || pkg.format !== 'kiwoom-auto-workspace' || pkg.version !== 1 || pkg.state?.schemaVersion !== PROJECT_SCHEMA) throw new Error('InvalidWorkspacePackage');
  const source = pkg.state;
  const result = reconcileInternal(source, {bounds:packageBounds(source)});
  if (!result.st || result.changed) throw new Error('InvalidWorkspaceState');
  const names = new Set();
  for (const [id,snapshot] of Object.entries(source.snapshots)) {
    if (!/^s[1-9][0-9]*$/.test(id) || !isObject(snapshot) || typeof snapshot.name !== 'string' || !snapshot.name.trim() || [...snapshot.name].length > 32 || names.has(labelKey(snapshot.name))) throw new Error('InvalidSnapshot');
    names.add(labelKey(snapshot.name));
    const candidate={...clone(source),...stateSnapshot(snapshot),snapshots:{},undo:null};
    if(reconcileInternal(candidate,{bounds:packageBounds(candidate)}).changed)throw new Error('InvalidSnapshotState');
  }
  const next = { ...clone(st), ...stateSnapshot(source), snapshots:clone(source.snapshots) };
  next.seq.form = Math.max(st.seq.form, source.seq.form, ...Object.keys(source.forms).map(id=>idNum(id)+1));
  next.seq.snapshot = Math.max(st.seq.snapshot, source.seq.snapshot, ...Object.keys(source.snapshots).map(id=>idNum(id)+1));
  next.undo = {reason:'importWorkspace',snapshot:stateSnapshot(st)};
  return exactPatch(st,next);
}
