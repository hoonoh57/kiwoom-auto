/* app.js - 부팅 / 마이그레이션 / 상단바(VD·화면검색·퀵툴바) / 단일 쓰기 경로 */

import * as ds from './deskspec.js';
import * as screens from './screens.js';
import { createDesk } from './desk.js';
import * as bus from './bus.js';

const $ = (s) => document.querySelector(s);
let st = {};
let env = { tf: ['1m'], tfLabel: {} };
let desk = null;
let rid = 0;

/* ---- 단일 쓰기 경로: 서버 반영은 직렬 큐로만 나간다 ---- */
const jget = (p) => fetch('/api/node?path=' + encodeURIComponent(p)).then((r) => r.json());

let chain = Promise.resolve();
let rafId = 0;
function enqueue(fn) {
  chain = chain.then(fn, fn);
  return chain;
}

function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => { rafId = 0; render(); });
}

async function jpatch(p, b) {
  const r = await fetch('/api/node?path=' + encodeURIComponent(p), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${txt.slice(0, 160).replace(/\s+/g, ' ')}`);
  return txt;
}

function jdel(p) {
  return enqueue(async () => {
    try {
      const r = await fetch('/api/node?path=' + encodeURIComponent(p), { method: 'DELETE' });
      if (!r.ok) bus.push(`[DEL-FAIL] ${p} ${r.status}`);
    } catch (e) { bus.push('[DEL-ERR] ' + p + ' ' + e); }
  });
}

function nodeAt(root, path, create) {
  let cur = root;
  for (const k of String(path || '').split('/').filter(Boolean)) {
    if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) {
      if (!create) return null;
      cur[k] = {};
    }
    cur = cur[k];
  }
  return cur;
}

function mergeLocal(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v === ds.DEL) delete dst[k];
    else if (v && typeof v === 'object' && !Array.isArray(v)
             && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) mergeLocal(dst[k], v);
    else dst[k] = v;
  }
  return dst;
}

function patch(path, body) {
  const n = nodeAt(st, path, true);
  if (n) mergeLocal(n, body);
  scheduleRender();
  return enqueue(async () => {
    try { await jpatch(path, body); }
    catch (e) { bus.push(`[PATCH-FAIL] ${path || '/'} ${e.message}`); }
  });
}

const bounds = () => { const d = $('#desk'); return { w: d.clientWidth, h: d.clientHeight }; };

/* ---- 상단바 ---- */
function renderTop() {
  const key = JSON.stringify([ds.vdOrder(st).map((k) => [k, st.vds[k].label]), st.activeVd, st.symLink, st.globalOn]);
  if (key === renderTop.key) return;
  renderTop.key = key;

  const box = $('#vds');
  box.innerHTML = '';
  ds.vdOrder(st).forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'vdb' + (id === st.activeVd ? ' on' : '');
    b.textContent = st.vds[id].label;
    b.title = id + (i < ds.VD_HOTKEYS ? ` (Ctrl+${i + 1})` : '');
    b.onclick = () => patch('', { activeVd: id });
    b.oncontextmenu = (e) => { e.preventDefault(); vdMenu(id, e.clientX, e.clientY); };
    box.append(b);
  });
  const add = document.createElement('button');
  add.className = 'vdb add';
  add.textContent = '+';
  add.title = '가상화면 추가';
  add.onclick = addVd;
  box.append(add);

  const sl = $('#symlink');
  sl.textContent = st.symLink === 'all' ? '연동:전체' : '연동:VD';
  sl.onclick = () => patch('', { symLink: st.symLink === 'all' ? 'vd' : 'all' });

  const go = $('#globalOn');
  go.textContent = st.globalOn ? '애드온:ON' : '애드온:OFF';
  go.className = 'tagb' + (st.globalOn ? ' on' : '');
  go.onclick = () => patch('', { globalOn: !st.globalOn });
}

function render() {
  renderTop();
  if (!desk) return;
  const r = desk.apply();
  if (r.ops.length) bus.push(`[DESK] ${st.activeVd} live=${desk.mounted()} ops=${r.ops.length} ${r.ops.join(',')}`);
}

/* ---- 폼 조작 ---- */
function addForm(kind, seed) {
  const meta = screens.spec.meta(kind);
  if (meta.single) {
    const dup = Object.entries(st.forms).find(([, f]) => f.screen === kind && (f.vd === st.activeVd || f.allVd));
    if (dup) { bus.push('[FORM=] 이미 존재 ' + kind); desk.raise(dup[0]); return; }
  }
  const id = ds.nextFormId(st);
  const form = ds.defaultForm(st, kind, { ...(seed || {}), vd: st.activeVd }, screens.spec, bounds());
  const z = [...((st.vds[st.activeVd] || {}).z || []), id];
  patch('', { forms: { [id]: form }, vds: { [st.activeVd]: { z } }, seq: { form: +id.slice(1) } });
  bus.push(`[FORM+] ${id} ${kind} vd=${st.activeVd}`);
}

function closeForm(id) {
  const vds = {};
  for (const [vid, v] of Object.entries(st.vds)) {
    if ((v.z || []).includes(id)) vds[vid] = { z: v.z.filter((x) => x !== id) };
  }
  patch('', { forms: { [id]: ds.DEL }, vds });
  bus.push('[FORM-] ' + id);
}

/* ---- VD 조작 ---- */
function addVd() {
  if (ds.VD_MAX && Object.keys(st.vds).length >= ds.VD_MAX) { bus.push('[VD+] 상한 도달'); return; }
  const id = ds.nextVdId(st);
  const label = ds.nextVdLabel(st);
  patch('', { vds: { [id]: ds.defaultVd(label, ds.nextVdOrder(st)) }, activeVd: id });
  bus.push(`[VD+] ${id} label=${label}`);
}

async function delVd(id) {
  const ids = ds.vdOrder(st);
  if (ids.length <= 1) { bus.push('[VD-] 마지막 가상화면은 삭제할 수 없습니다'); return; }
  const own = Object.keys(st.forms).filter((fid) => st.forms[fid].vd === id);
  const ok = await askOk(`${st.vds[id].label} 삭제. 소속 자식폼 ${own.length}개도 함께 삭제합니다.`, '삭제');
  if (!ok) { bus.push('[VD-] 취소 ' + id); return; }
  const p = { vds: { [id]: ds.DEL }, forms: {} };
  for (const fid of own) p.forms[fid] = ds.DEL;
  for (const vid of ids) {
    if (vid === id) continue;
    p.vds[vid] = { z: (st.vds[vid].z || []).filter((x) => !own.includes(x)) };
  }
  if (st.activeVd === id) p.activeVd = ids.find((x) => x !== id);
  delete st.vds[id];
  await patch('', p);
  bus.push(`[VD-] ${id} forms=${own.length}`);
}

function vdMenu(id, x, y) {
  menuAt(x, y, [
    ['이름 변경', async () => {
      const v = await askText('가상화면 이름', st.vds[id].label, 8);
      if (!v) { bus.push('[VD~] 취소 ' + id); return; }
      patch('vds/' + id, { label: v });
      bus.push(`[VD~] ${id} label=${v}`);
    }],
    ['삭제', () => delVd(id)],
  ]);
}

/* ---- 자식폼 우클릭 메뉴 ---- */
function openMenu(id, x, y) {
  const f = st.forms[id];
  if (!f) return;
  const items = [
    [f.allVd ? '모든 가상화면에 보이기 해제' : '모든 가상화면에 보이기 (V)',
      () => patch('forms/' + id, { allVd: !f.allVd })],
  ];
  for (const vid of ds.vdOrder(st)) {
    if (vid === f.vd) continue;
    items.push(['이동 -> ' + st.vds[vid].label, () => moveForm(id, vid)]);
  }
  items.push(['닫기', () => closeForm(id)]);
  menuAt(x, y, items);
}

function moveForm(id, vid) {
  const vds = {};
  for (const [k, v] of Object.entries(st.vds)) {
    if (k === vid) vds[k] = { z: [...(v.z || []).filter((x) => x !== id), id] };
    else vds[k] = { z: (v.z || []).filter((x) => x !== id) };
  }
  patch('', { forms: { [id]: { vd: vid } }, vds });
}

function closeMenu() {
  const m = document.getElementById('ctx');
  if (m) m.remove();
  document.removeEventListener('pointerdown', onDocDown, true);
  window.removeEventListener('keydown', onMenuKey, true);
  window.removeEventListener('blur', closeMenu);
}

function onDocDown(e) {
  const m = document.getElementById('ctx');
  if (m && m.contains(e.target)) return;   // 메뉴 내부 클릭은 살려둔다
  closeMenu();
}

function onMenuKey(e) { if (e.key === 'Escape') closeMenu(); }

function menuAt(x, y, items) {
  closeMenu();
  const m = document.createElement('div');
  m.id = 'ctx';
  m.className = 'ctx';
  for (const [label, fn] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); fn(); });
    m.append(b);
  }
  document.body.append(m);
  m.style.left = Math.max(4, Math.min(x, window.innerWidth - m.offsetWidth - 4)) + 'px';
  m.style.top = Math.max(4, Math.min(y, window.innerHeight - m.offsetHeight - 4)) + 'px';
  setTimeout(() => {
    document.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('keydown', onMenuKey, true);
    window.addEventListener('blur', closeMenu);
  }, 0);
}

/* ---- 인앱 대화상자: native prompt/confirm 의존 제거 ---- */
function mkBtn(label, cls, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  if (cls) b.className = cls;
  b.textContent = label;
  b.onclick = fn;
  return b;
}

function modal(build) {
  return new Promise((resolve) => {
    closeMenu();
    const back = document.createElement('div');
    back.className = 'mback';
    const box = document.createElement('div');
    box.className = 'mbox';
    back.append(box);
    let done = false;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(null); }
    };
    function end(v) {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey, true);
      back.remove();
      resolve(v);
    }
    back.addEventListener('pointerdown', (e) => { if (e.target === back) end(null); });
    window.addEventListener('keydown', onKey, true);
    document.body.append(back);
    build(box, end);
  });
}

function askText(title, value, maxLen) {
  return modal((box, end) => {
    const t = document.createElement('div');
    t.className = 'mttl';
    t.textContent = title;
    const inp = document.createElement('input');
    inp.className = 'minp';
    inp.type = 'text';
    inp.value = value || '';
    inp.maxLength = maxLen || 32;
    const ok = () => end(inp.value.trim() || null);
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } };
    const row = document.createElement('div');
    row.className = 'mrow';
    row.append(mkBtn('취소', '', () => end(null)), mkBtn('확인', 'on', ok));
    box.append(t, inp, row);
    inp.focus();
    inp.select();
  });
}

function askOk(title, yesLabel) {
  return modal((box, end) => {
    const t = document.createElement('div');
    t.className = 'mttl';
    t.textContent = title;
    const row = document.createElement('div');
    row.className = 'mrow';
    const no = mkBtn('취소', '', () => end(false));
    row.append(no, mkBtn(yesLabel || '확인', 'sell', () => end(true)));
    box.append(t, row);
    no.focus();
  });
}

/* ---- 화면검색 / 퀵툴바 / 단축키 ---- */
function initSearch() {
  const inp = $('#search');
  const res = $('#sres');
  const hide = () => { res.style.display = 'none'; };
  const draw = () => {
    const list = screens.search(inp.value);
    res.innerHTML = '';
    for (const c of list) {
      const b = document.createElement('div');
      b.className = 'sitem';
      b.textContent = `[${c.no}] ${c.label}`;
      b.onclick = () => { addForm(c.kind); inp.value = ''; hide(); };
      res.append(b);
    }
    res.style.display = list.length ? 'block' : 'none';
  };
  inp.oninput = draw;
  inp.onkeydown = (e) => {
    if (e.key === 'Enter') {
      const l = screens.search(inp.value);
      if (l[0]) { addForm(l[0].kind); inp.value = ''; hide(); }
    } else if (e.key === 'Escape') { inp.value = ''; hide(); }
  };
  document.addEventListener('pointerdown', (e) => {
    if (e.target !== inp && !res.contains(e.target)) hide();
  });
}

function renderQuick() {
  const q = $('#quick');
  q.innerHTML = '';
  for (const c of screens.catalog()) {
    if (!c.quick) continue;
    const b = document.createElement('button');
    b.className = 'qb';
    b.textContent = c.label;
    b.title = `[${c.no}] ${c.label}`;
    b.onclick = () => addForm(c.kind);
    q.append(b);
  }
}

function initKeys() {
  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey || e.shiftKey) return;
    const n = +e.key;
    if (!(n >= 1 && n <= ds.VD_HOTKEYS)) return;
    const id = ds.vdOrder(st)[n - 1];
    if (!id) return;
    e.preventDefault();
    patch('', { activeVd: id });
  });
}

/* ---- 부팅 ---- */
async function boot() {
  try { env = await fetch('/api/health').then((r) => r.json()); } catch (e) { bus.push('[HEALTH] ' + e); }
  $('#mode').textContent = `${env.mode || '?'} ${env.paper ? '모의' : '실전'}`;
  bus.sub((line) => { $('#status').textContent = line; });

  let raw = await jget('');
  if ((raw.schemaVersion | 0) < ds.PROJECT_SCHEMA) {
    const m = ds.migrate(raw, screens.spec, bounds());
    if (m.patch) {
      await jpatch('', m.patch);
      bus.push(`[MIGRATE] v${raw.schemaVersion || 0}->${ds.PROJECT_SCHEMA} forms=${m.forms} dropped=${m.dropped}`);
    }
    raw = m.st;
  }
  const rc = ds.reconcile(raw, screens.spec, bounds());
  st = rc.st;
  if (rc.changed) {
    await jpatch('', rc.patch);
    bus.push('[RECONCILE] ' + (rc.dropped.length ? 'dropped=' + rc.dropped.join(',') : 'fixed'));
  }

  desk = createDesk($('#desk'), $('#tabs'), screens.spec, {
    env, getState: () => st, patch, close: closeForm, menu: openMenu, log: bus.push,
  });

  renderQuick();
  initSearch();
  initKeys();
  render();

  window.addEventListener('resize', () => { clearTimeout(rid); rid = setTimeout(render, 150); });
  if (!Object.keys(st.forms).length) addForm(screens.spec.legacyKind());
}

boot().catch((e) => bus.push('[BOOT-FAIL] ' + e));
