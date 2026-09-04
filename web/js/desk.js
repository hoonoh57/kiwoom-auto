/* desk.js - BRIDGE: 폼 단위 diff(ensure/update/remove) + z-order + geometry.
   화면종류 이름을 모른다. cat 어댑터와 needCode 플래그만 본다. */

import { createFrame } from './frame.js';

function hash(o) {
  const s = JSON.stringify(o);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h.toString(16);
}

const idNum = (s) => { const m = /(\d+)$/.exec(s || ''); return m ? +m[1] : 0; };

export function createDesk(canvas, tabbar, cat, io) {
  const live = new Map();
  let tabHash = '';

  const bounds = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });
  const rectOf = (f, b) => (f.winState === 'max' ? { x: 0, y: 0, w: b.w, h: b.h } : f.rect);

  // 가시성은 forms에서 계산한다. z는 순서 힌트로만 쓴다.
  function zList(st) {
    const vid = st.activeVd;
    if (!st.vds[vid]) return [];
    const z = (st.vds[vid].z || []);
    const rank = (id) => { const i = z.indexOf(id); return i < 0 ? 1e9 + idNum(id) : i; };
    return Object.keys(st.forms)
      .filter((id) => st.forms[id].vd === vid || st.forms[id].allVd)
      .sort((a, b) => rank(a) - rank(b));
  }

  function raise(id) {
    const st = io.getState();
    const v = st.vds[st.activeVd];
    if (!v) return;
    const z = v.z || [];
    if (z[z.length - 1] === id) return;
    io.patch('vds/' + st.activeVd, { z: [...z.filter((x) => x !== id), id] });
  }

  function toggleMax(id) {
    const st = io.getState();
    const f = st.forms[id];
    if (!f) return;
    if (f.winState === 'max') io.patch('forms/' + id, { winState: 'normal', rect: { ...f.prevRect } });
    else io.patch('forms/' + id, { winState: 'max', prevRect: { ...f.rect } });
  }

  function setCode(srcId, code) {
    const st = io.getState();
    const src = st.forms[srcId];
    if (!src) return;
    const p = {};
    for (const [id, f] of Object.entries(st.forms)) {
      if (!cat.meta(f.screen).needCode) continue;
      const linked = st.symLink === 'all' || f.vd === src.vd || f.allVd;
      if (id === srcId || linked) p[id] = { code };
    }
    io.patch('forms', p);
  }

  function ctxFor(id) {
    return {
      id,
      env: io.env,
      globalOn: () => !!io.getState().globalOn,
      form: () => io.getState().forms[id] || null,
      patchForm: (p) => io.patch('forms/' + id, p),
      patchBody: (p) => io.patch('forms/' + id + '/body', p),
      setCode: (code) => setCode(id, code),
      log: io.log,
    };
  }

  function ensure(id, f, b) {
    const meta = cat.meta(f.screen);
    const frame = createFrame(canvas, {
      minSize: meta.minSize,
      on: {
        focus: () => raise(id),
        geo: (r) => io.patch('forms/' + id, { rect: r, prevRect: r }),
        min: () => io.patch('forms/' + id, { winState: 'min' }),
        max: () => toggleMax(id),
        close: () => io.close(id),
        menu: (x, y) => io.menu(id, x, y),
        live: () => { const c = live.get(id); if (c) cat.resize(c.kind, c.handle); },
      },
    });
    frame.setRect(rectOf(f, b));
    const handle = cat.mount(f.screen, frame.body, f, ctxFor(id));
    return { kind: f.screen, frame, handle, dataHash: '', geoHash: '' };
  }

  function renderTabs(st, ids) {
    const mins = ids.filter((id) => st.forms[id].winState === 'min');
    const h = hash(mins.map((id) => [id, cat.title(st.forms[id])]));
    if (h === tabHash) return;
    tabHash = h;
    tabbar.innerHTML = '';
    for (const id of mins) {
      const b = document.createElement('button');
      b.className = 'tab';
      b.type = 'button';
      b.textContent = cat.title(st.forms[id]);
      b.onclick = () => { io.patch('forms/' + id, { winState: 'normal' }); raise(id); };
      tabbar.append(b);
    }
  }

  function apply() {
    const st = io.getState();
    if (!st || !st.forms || !st.vds) return { ops: [] };
    const b = bounds();
    const ids = zList(st);
    const want = new Set(ids);
    const ops = [];

    for (const [id, cur] of [...live.entries()]) {
      const f = st.forms[id];
      if (want.has(id) && f && cur.kind === f.screen) continue;
      live.delete(id);   // 먼저 지운다: 이후 예외가 나도 재시도 루프에 빠지지 않는다
      try { cat.unmount(cur.kind, cur.handle); } catch (e) { io.log('[DESK!] unmount ' + id + ' ' + e); }
      try { cur.frame.destroy(); } catch (e) { io.log('[DESK!] destroy ' + id + ' ' + e); }
      ops.push('-' + id);
    }

    ids.forEach((id, i) => {
      const f = st.forms[id];
      let cur = live.get(id);
      let fresh = false;
      if (!cur) { cur = ensure(id, f, b); live.set(id, cur); ops.push('+' + id); fresh = true; }
      const dh = hash({ c: f.code, t: f.tf, y: f.body, n: f.title, a: f.allVd, g: st.globalOn });
      const gh = hash({ r: rectOf(f, b), s: f.winState, z: i });
      if (cur.dataHash !== dh) {
        cur.frame.setTitle(cat.title(f), cat.sub(f));
        cat.update(f.screen, cur.handle, f, ctxFor(id));
        cur.dataHash = dh;
        if (!fresh) ops.push('~' + id);
      }
      if (cur.geoHash !== gh) {
        const rs = JSON.stringify(rectOf(f, b));
        const why = [];
        if (cur.gr !== rs) why.push('r');
        if (cur.gs !== f.winState) why.push('s');
        if (cur.gi !== i) why.push('z');
        cur.gr = rs; cur.gs = f.winState; cur.gi = i;
        cur.frame.setRect(rectOf(f, b));
        cur.frame.setState(f.winState);
        cur.frame.setZ(i);
        cat.resize(f.screen, cur.handle);
        cur.geoHash = gh;
        if (!fresh) ops.push('g' + id + '[' + why.join('') + ']');
      }
      cur.frame.setActive(i === ids.length - 1 && f.winState !== 'min');
    });

    renderTabs(st, ids);
    return { ops };
  }

  return { apply, raise, toggleMax, setCode, mounted: () => live.size };
}
