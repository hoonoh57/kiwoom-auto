/* frame.js - ENGINE: 자식폼 DOM primitive.
   화면종류/상태저장/네트워크를 모른다. 좌표 계산과 이벤트 통보만 한다. */

// Design: D6.v6.frame-api
const handles = new WeakMap();
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

function buildFrame(host, opt0) {
  const opt = opt0 || {};
  const on = opt.on || {};
  const min = { w: (opt.minSize && opt.minSize.w) || 240, h: (opt.minSize && opt.minSize.h) || 120 };

  let cancelDrag = () => {};
  const root = el('div', 'frm');
  root.dataset.state = 'normal';
  const bar = el('div', 'frm-bar');
  const ttl = el('span', 'frm-ttl');
  const sub = el('span', 'frm-sub');
  const btns = el('span', 'frm-btns');
  const mk = (txt, cls, fn, tip) => {
    const b = el('button', 'frm-b' + (cls ? ' ' + cls : ''));
    b.textContent = txt;
    b.title = tip || '';
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => { e.stopPropagation(); if (fn) fn(); });
    return b;
  };
  btns.append(
    mk('\u2013', '', () => on.min && on.min(), '최소화'),
    mk('\u25a1', '', () => on.max && on.max(), '최대화 / 이전크기'),
    mk('\u2715', 'cls', () => on.close && on.close(), '닫기'),
  );
  bar.append(ttl, sub, btns);
  const body = el('div', 'frm-body');
  root.append(bar, body);
  for (const d of DIRS) {
    const g = el('div', 'frm-rz rz-' + d);
    g.dataset.dir = d;
    root.append(g);
  }
  host.append(root);

  let rect = { x: 0, y: 0, w: min.w, h: min.h };
  const put = () => {
    root.style.left = rect.x + 'px';
    root.style.top = rect.y + 'px';
    root.style.width = rect.w + 'px';
    root.style.height = rect.h + 'px';
  };

  root.addEventListener('pointerdown', (e) => { if (on.focus) on.focus(e); }, true);
  bar.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (on.menu) on.menu(e.clientX, e.clientY);
  });
  bar.addEventListener('dblclick', () => on.max && on.max());

  function begin(e, mode, dir) {
    if (root.dataset.state === 'max' || e.button !== 0) return;
    e.preventDefault();
    cancelDrag();
    const s = { x: e.clientX, y: e.clientY, r: { ...rect } };
    const bw = host.clientWidth;
    const bh = host.clientHeight;
    const move = (ev) => {
      const dx = ev.clientX - s.x;
      const dy = ev.clientY - s.y;
      const r = { ...s.r };
      if (mode === 'move') {
        r.x = Math.min(Math.max(0, s.r.x + dx), Math.max(0, bw - r.w));
        r.y = Math.min(Math.max(0, s.r.y + dy), Math.max(0, bh - r.h));
      } else {
        if (dir.includes('e')) r.w = Math.max(min.w, Math.min(s.r.w + dx, bw - s.r.x));
        if (dir.includes('s')) r.h = Math.max(min.h, Math.min(s.r.h + dy, bh - s.r.y));
        if (dir.includes('w')) { const nw = Math.max(min.w, Math.min(s.r.w - dx, s.r.x + s.r.w)); r.x = Math.max(0, s.r.x + (s.r.w - nw)); r.w = nw; }
        if (dir.includes('n')) { const nh = Math.max(min.h, Math.min(s.r.h - dy, s.r.y + s.r.h)); r.y = Math.max(0, s.r.y + (s.r.h - nh)); r.h = nh; }
      }
      rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
      put();
      if (on.live) on.live();
    };
    cancelDrag = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancelDrag);
    };
    const up = () => {
      cancelDrag();
      if (on.geo) on.geo({ ...rect });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancelDrag);
  }

  bar.addEventListener('pointerdown', (e) => begin(e, 'move'));
  for (const g of root.querySelectorAll('.frm-rz')) {
    g.addEventListener('pointerdown', (e) => begin(e, 'rz', g.dataset.dir));
  }

  return {
    el: root,
    body,
    setTitle(t, s) { ttl.textContent = t || ''; sub.textContent = s || ''; },
    setRect(r) { rect = { x: r.x | 0, y: r.y | 0, w: r.w | 0, h: r.h | 0 }; put(); },
    getRect() { return { ...rect }; },
    setState(s) { root.dataset.state = s || 'normal'; },
    setZ(i) { root.style.zIndex = String(10 + (i | 0)); },
    setActive(b) { root.classList.toggle('act', !!b); },
    destroy() { cancelDrag(); root.remove(); },
  };
}

function valid(handle) {
  const value = handles.get(handle);
  if (!value || value.destroyed) throw new Error(`InvalidFrameHandle(${handle?.id})`);
  return value;
}

// Design: D6.v6.frame-api
export function createFrame(host, id, rect, on = {}) {
  const inner = buildFrame(host, { on: { ...on, menu: (x, y) => on.menu?.({ x, y }) } });
  const handle = Object.freeze({ id });
  handles.set(handle, { inner, destroyed: false });
  inner.setRect(rect);
  return handle;
}

// Design: D6.v6.frame-api
export function setFrameRect(handle, rect) { valid(handle).inner.setRect(rect); }
// Design: D6.v6.frame-api
export function setFrameZ(handle, zIndex) { valid(handle).inner.setZ(zIndex); }
// Design: D6.v6.frame-api
export function setFrameVisible(handle, visible) { valid(handle).inner.el.style.display = visible ? '' : 'none'; }
// Design: D6.v6.frame-api
export function setFrameTitle(handle, text, shareGroup) { valid(handle).inner.setTitle(text, String(shareGroup ?? '')); }
// Design: D6.v6.frame-api
export function setFrameState(handle, state, bounds) {
  const { inner } = valid(handle);
  inner.setState(state);
  if (state === 'max' && bounds) inner.setRect(bounds);
}
// Design: D6.v6.frame-api
export function getContentHost(handle) { return valid(handle).inner.body; }
// Design: D6.v6.frame-api
export function destroyFrame(handle) {
  const value = valid(handle);
  value.destroyed = true;
  value.inner.destroy();
}

// Design: D6.v6.frame-api
export function snapRect(candidate, bounds, peerRects, threshold) {
  let dx = 0, dy = 0, bestX = Infinity, bestY = Infinity;
  let targetX = Infinity, targetY = Infinity, edgeX = 2, edgeY = 2;
  for (let i = -1; i < peerRects.length; i++) {
    const peer = i === -1 ? bounds : peerRects[i];
    for (let target = 0; target < 2; target++) {
      const tx = peer.x + target * peer.w, ty = peer.y + target * peer.h;
      for (let edge = 0; edge < 2; edge++) {
        const x = tx - candidate.x - edge * candidate.w;
        const y = ty - candidate.y - edge * candidate.h;
        const ax = Math.abs(x), ay = Math.abs(y);
        if (ax <= threshold && (ax < bestX || (ax === bestX && (tx < targetX || (tx === targetX && edge < edgeX))))) {
          dx = x; bestX = ax; targetX = tx; edgeX = edge;
        }
        if (ay <= threshold && (ay < bestY || (ay === bestY && (ty < targetY || (ty === targetY && edge < edgeY))))) {
          dy = y; bestY = ay; targetY = ty; edgeY = edge;
        }
      }
    }
  }
  return { x: candidate.x + dx, y: candidate.y + dy, w: candidate.w, h: candidate.h };
}

// Design: D6.v6.frame-api
export function observeResize(element, callback) {
  const handle = { active: true, queued: false, size: { width: -1, height: -1 }, observer: null };
  handle.observer = new ResizeObserver((entries) => {
    if (!handle.active) return;
    for (const entry of entries) {
      const width = Math.round(entry.contentRect.width), height = Math.round(entry.contentRect.height);
      if (width === handle.size.width && height === handle.size.height) continue;
      handle.size.width = width; handle.size.height = height;
      if (handle.queued) continue;
      handle.queued = true;
      queueMicrotask(() => {
        handle.queued = false;
        if (handle.active) callback({ width: handle.size.width, height: handle.size.height });
      });
    }
  });
  handle.observer.observe(element);
  return handle;
}

// Design: D6.v6.frame-api
export function disconnectResize(handle) {
  handle.active = false;
  handle.observer.disconnect();
}
