/* deskspec.js - STATE 스펙 (schemaVersion 5)
   순수 모듈. DOM/네트워크/화면종류 이름을 모른다.
   cat = screens.spec 어댑터 { has, meta, legacyKind, defaultBody, reconcileBody } */

export const PROJECT_SCHEMA = 5;
export const VD_MAX = 0;        // 0 = 무제한 (Q1)
export const VD_HOTKEYS = 8;    // Ctrl+1..8 만 부여
export const GRID = 24;
export const MIN_W = 240;
export const MIN_H = 120;
export const DEF_CODE = '005930';
export const DEF_TF = '1m';
export const DEL = '__delete__';

const ROOT_KEYS = ['schemaVersion', 'globalOn', 'activeVd', 'symLink', 'layout', 'seq', 'vds', 'forms'];
const VD_KEYS = ['label', 'order', 'z'];

const isNum = (v) => typeof v === 'number' && isFinite(v);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
const sstr = (v, d) => (typeof v === 'string' && v ? v : d);
const idNum = (s) => { const m = /(\d+)$/.exec(s || ''); return m ? +m[1] : 0; };
const byIdNum = (a, b) => idNum(a) - idNum(b);

function delExtra(node, keep) {
  const out = {};
  for (const k of Object.keys(obj(node))) if (!keep.includes(k)) out[k] = DEL;
  return out;
}

export function defaultVd(label, order) {
  return { label: String(label), order: order | 0, z: [] };
}

export function defaultProject() {
  return {
    schemaVersion: PROJECT_SCHEMA,
    globalOn: true,
    activeVd: 'vd1',
    symLink: 'vd',
    layout: { sidebarW: 300 },
    seq: { form: 0 },
    vds: { vd1: defaultVd('1', 0) },
    forms: {},
  };
}

export function vdOrder(st) {
  const vds = obj(st.vds);
  return Object.keys(vds).sort((a, b) => (vds[a].order | 0) - (vds[b].order | 0) || byIdNum(a, b));
}

export function nextVdId(st) {
  let n = 0;
  for (const k of Object.keys(obj(st.vds))) n = Math.max(n, idNum(k));
  return 'vd' + (n + 1);
}

export function nextFormId(st) {
  let n = obj(st.seq).form | 0;
  for (const k of Object.keys(obj(st.forms))) n = Math.max(n, idNum(k));
  return 'f' + (n + 1);
}

function normRect(r0, meta, b) {
  const r = obj(r0);
  const mw = Math.max(MIN_W, obj(meta.minSize).w || MIN_W);
  const mh = Math.max(MIN_H, obj(meta.minSize).h || MIN_H);
  const bw = Math.max(mw + 8, b.w || 1280);
  const bh = Math.max(mh + 8, b.h || 720);
  const w = clamp(isNum(r.w) ? r.w : obj(meta.defRect).w || 720, mw, bw);
  const h = clamp(isNum(r.h) ? r.h : obj(meta.defRect).h || 460, mh, bh);
  const x = clamp(isNum(r.x) ? r.x : GRID, 0, Math.max(0, bw - w));
  const y = clamp(isNum(r.y) ? r.y : GRID, 0, Math.max(0, bh - h));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export function cascadeRect(st, vd, meta, bounds) {
  const b = obj(bounds);
  const forms = obj(st.forms);
  const step = Object.keys(forms).filter((id) => forms[id] && forms[id].vd === vd).length % 8;
  const base = normRect({}, meta, b);
  return normRect({ x: GRID / 2 + step * GRID, y: GRID / 2 + step * GRID, w: base.w, h: base.h }, meta, b);
}

export function defaultForm(st, kind, seed0, cat, bounds) {
  const seed = obj(seed0);
  const meta = cat.meta(kind);
  const vd = sstr(seed.vd, sstr(st.activeVd, 'vd1'));
  const rect = seed.rect ? normRect(seed.rect, meta, obj(bounds)) : cascadeRect(st, vd, meta, bounds);
  const form = {
    screen: kind,
    vd,
    allVd: !!seed.allVd,
    title: sstr(seed.title, null),
    code: meta.needCode ? sstr(seed.code, DEF_CODE) : null,
    tf: meta.needTf ? sstr(seed.tf, DEF_TF) : null,
    rect,
    winState: 'normal',
    prevRect: { ...rect },
    body: {},
  };
  form.body = cat.defaultBody(kind, form);
  return form;
}

/* ---- 단일 복원 경로: reconcile ---- */
export function reconcile(st0, cat, bounds) {
  const before = JSON.stringify(obj(st0));
  const st = JSON.parse(before);
  const b = obj(bounds);
  const dropped = [];

  st.schemaVersion = PROJECT_SCHEMA;
  if (typeof st.globalOn !== 'boolean') st.globalOn = true;
  st.symLink = st.symLink === 'all' ? 'all' : 'vd';
  st.layout = obj(st.layout);
  if (!isNum(st.layout.sidebarW)) st.layout.sidebarW = 300;
  st.seq = obj(st.seq);
  if (!isNum(st.seq.form)) st.seq.form = 0;
  st.vds = obj(st.vds);
  st.forms = obj(st.forms);
  if (!Object.keys(st.vds).length) st.vds = { vd1: defaultVd('1', 0) };

  let i = 0;
  for (const id of Object.keys(st.vds).sort(byIdNum)) {
    const v = obj(st.vds[id]);
    v.label = sstr(v.label, String(i + 1));
    v.order = isNum(v.order) ? v.order : i;
    v.z = arr(v.z).filter((x) => typeof x === 'string');
    for (const k of Object.keys(v)) if (!VD_KEYS.includes(k)) delete v[k];
    st.vds[id] = v;
    i++;
  }
  if (!st.vds[st.activeVd]) st.activeVd = vdOrder(st)[0];

  for (const id of Object.keys(st.forms).sort(byIdNum)) {
    const f = obj(st.forms[id]);
    if (!f.screen || !cat.has(f.screen)) { dropped.push(id); delete st.forms[id]; continue; }
    const meta = cat.meta(f.screen);
    if (!st.vds[f.vd]) f.vd = st.activeVd;
    f.allVd = !!f.allVd;
    f.title = sstr(f.title, null);
    f.code = meta.needCode ? sstr(f.code, DEF_CODE) : null;
    f.tf = meta.needTf ? sstr(f.tf, DEF_TF) : null;
    f.rect = normRect(f.rect, meta, b);
    f.prevRect = normRect(f.prevRect || f.rect, meta, b);
    f.winState = ['normal', 'min', 'max'].includes(f.winState) ? f.winState : 'normal';
    f.body = cat.reconcileBody(f.screen, obj(f.body), f);
    st.forms[id] = f;
  }

  // z = (소속 폼) U (allVd 폼). 모든 VD가 동일 규칙.
  const all = Object.keys(st.forms).sort(byIdNum);
  for (const vid of Object.keys(st.vds)) {
    const v = st.vds[vid];
    const vis = (id) => st.forms[id] && (st.forms[id].vd === vid || st.forms[id].allVd);
    v.z = v.z.filter((id, k) => vis(id) && v.z.indexOf(id) === k);
    for (const id of all) if (vis(id) && !v.z.includes(id)) v.z.push(id);
    const maxed = v.z.filter((id) => st.forms[id].winState === 'max');
    for (const id of maxed.slice(0, -1)) {
      const f = st.forms[id];
      f.winState = 'normal';
      f.rect = { ...f.prevRect };
    }
  }

  let mx = st.seq.form | 0;
  for (const k of Object.keys(st.forms)) mx = Math.max(mx, idNum(k));
  st.seq.form = mx;

  const changed = JSON.stringify(st) !== before;
  const patch = {};
  for (const k of ROOT_KEYS) patch[k] = st[k];
  patch.forms = { ...st.forms };
  for (const id of dropped) patch.forms[id] = DEL;
  Object.assign(patch, delExtra(st0, ROOT_KEYS));
  return { st, patch, changed, dropped };
}

/* ---- 마이그레이션 4 -> 5 ---- */
export function migrate(raw0, cat, bounds) {
  const raw = obj(raw0);
  if ((raw.schemaVersion | 0) >= PROJECT_SCHEMA) {
    return { st: raw, patch: null, forms: 0, dropped: 0 };
  }
  const b = obj(bounds);
  const kind = cat.legacyKind();
  const meta = cat.meta(kind);
  const st = defaultProject();
  st.globalOn = typeof raw.globalOn === 'boolean' ? raw.globalOn : true;
  st.vds = {};
  st.forms = {};

  let order = 0;
  for (const id of Object.keys(obj(raw.vds)).sort(byIdNum)) {
    st.vds[id] = defaultVd(sstr(obj(raw.vds[id]).label, String(order + 1)), order);
    order++;
  }
  if (!Object.keys(st.vds).length) st.vds = { vd1: defaultVd('1', 0) };
  const oldActive = sstr(obj(raw.active).vd, '');
  st.activeVd = st.vds[oldActive] ? oldActive : vdOrder(st)[0];

  const profiles = obj(raw.profiles);
  let n = 0;
  let dropped = 0;
  for (const key of Object.keys(profiles).sort()) {
    const prof = obj(profiles[key]);
    if (!arr(prof.order).length) { dropped++; continue; }
    const seg = String(key).split('|');
    const vd = st.vds[seg[0]] ? seg[0] : st.activeVd;
    const id = 'f' + (++n);
    const rect = cascadeRect(st, vd, meta, b);
    const form = {
      screen: kind, vd, allVd: false, title: null,
      code: sstr(seg[1], DEF_CODE), tf: sstr(seg[2], DEF_TF),
      rect, winState: 'normal', prevRect: { ...rect }, body: {},
    };
    form.body = cat.reconcileBody(kind, prof, form);
    st.forms[id] = form;
    st.vds[vd].z.push(id);
  }
  st.seq.form = n;

  const patch = {};
  for (const k of ROOT_KEYS) patch[k] = st[k];
  Object.assign(patch, delExtra(raw, ROOT_KEYS));
  patch.vds = { ...st.vds };
  for (const vid of Object.keys(obj(raw.vds))) {
    patch.vds[vid] = { ...(st.vds[vid] || defaultVd('1', 0)), ...delExtra(obj(raw.vds)[vid], VD_KEYS) };
  }
  return { st, patch, forms: n, dropped };
}
