import * as addons from './addons.js';

const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c;
  if (x !== undefined) n.textContent = x; return n; };

export function renderTree(root, profile, panes, cb) {
  root.innerHTML = '';
  const open = (profile.ui && profile.ui.open) || {};
  const isOpen = (k, d) => (open[k] === undefined ? d : open[k]);

  for (const pane of panes) {
    const node = el('div', 'node');
    const row = el('div', 'nrow');
    const po = isOpen(pane.id, pane.id === 'main');
    const tw = el('span', 'tw', po ? '▾' : '▸');
    tw.onclick = () => cb.toggleOpen(pane.id, !po);
    const ids = profile.order.filter((i) => profile.items[i] &&
      (profile.items[i].props.paneId || 'main') === pane.id);
    row.append(tw, el('span', 'nlab pane', `${pane.label || pane.id}`),
               el('span', 'nsub', `${ids.length}`));
    if (pane.id !== 'main') {
      const d = el('button', 'del', '✕');
      d.title = '페인 삭제';
      d.onclick = () => cb.deletePane(pane.id);
      row.append(d);
    }
    node.append(row);

    if (po) {
      const ch = el('div', 'children');

      const hr = el('div', 'prow');
      const rg = el('input'); rg.type = 'range'; rg.min = 30; rg.max = 600;
      rg.step = 5; rg.value = pane.h;
      const hv = el('span', 'hval', pane.h + 'px');
      rg.oninput = () => { hv.textContent = rg.value + 'px'; cb.previewHeight(pane.id, +rg.value); };
      rg.onchange = () => cb.commitHeight(pane.id, +rg.value);
      rg.dataset.paneId = pane.id;
      hr.append(el('span', 'pk', '높이'), (() => { const w = el('span', 'pv'); w.append(rg); return w; })(), hv);
      ch.append(hr);

      for (const id of ids) {
        const it = profile.items[id];
        const m = addons.meta(it.kind);
        if (!m) continue;
        const inode = el('div', 'node');
        const irow = el('div', 'nrow');
        const io = isOpen(id, false);
        const itw = el('span', m.schema.length ? 'tw' : 'tw pad', m.schema.length ? (io ? '▾' : '▸') : '·');
        if (m.schema.length) itw.onclick = () => cb.toggleOpen(id, !io);
        const cx = el('input'); cx.type = 'checkbox';
        cx.checked = !!(it.enabled && it.visible);
        cx.onchange = () => cb.toggleItem(id, cx.checked);
        const summary = m.summary ? m.summary(it) : m.label;
        irow.append(itw, cx, el('span', 'nlab item', `${id}`), el('span', 'nsub', summary));
        const dl = el('button', 'del', '✕');
        dl.title = '애드온 삭제';
        dl.onclick = () => cb.deleteItem(id);
        irow.append(dl);
        inode.append(irow);

        if (io && m.schema.length) {
          const pch = el('div', 'children');
          for (const f of m.schema) {
            const pr = el('div', 'prow');
            const wrap = el('span', 'pv');
            const cv = it.props[f.k] === undefined ? f.def : it.props[f.k];
            const inp = el(f.t === 'select' ? 'select' : 'input');
            if (f.t === 'select') {
              for (const pair of f.options || []) {
                const o = el('option', null, pair[1]);
                o.value = pair[0];
                inp.append(o);
              }
              inp.value = cv;
            } else if (f.t === 'color') { inp.type = 'color'; inp.value = cv; }
            else if (f.t === 'text') {
              inp.type = 'text'; inp.value = cv || '';
              if (f.pattern) inp.pattern = f.pattern;
              if (f.maxLength) inp.maxLength = f.maxLength;
            } else { inp.type = 'number'; inp.value = cv; inp.min = f.min; inp.max = f.max; }
            const send = () => {
              let v = (f.t === 'color' || f.t === 'text' || f.t === 'select')
                ? inp.value : Math.round(+inp.value);
              if (f.t === 'text' && f.pattern && !(new RegExp(f.pattern)).test(v)) {
                inp.reportValidity();
                return;
              }
              if (!['color', 'text', 'select'].includes(f.t)) {
                if (!isFinite(v)) return;
                v = Math.min(f.max, Math.max(f.min, v));
                inp.value = v;
              }
              const patch = f.patch ? f.patch(v, { id, props: it.props }) : { [f.k]: v };
              cb.patchProps(id, patch);
            };
            inp.onchange = send;
            wrap.append(inp);
            pr.append(el('span', 'pk', f.label), wrap);
            pch.append(pr);
          }
          inode.append(pch);
        }
        ch.append(inode);
      }
      node.append(ch);
    }
    root.append(node);
  }
}

export function renderAddBar(root, panes, cb) {
  root.innerHTML = '';
  const sel = el('select');
  sel.append(el('option', null, '+ 추가'));
  for (const c of addons.catalog()) {
    const o = el('option', null, c.label);
    o.value = c.kind;
    sel.append(o);
  }
  sel.onchange = () => {
    const kind = sel.value;
    sel.selectedIndex = 0;
    if (!kind || kind === '+ 추가') return;
    const meta = addons.meta(kind);
    if (!meta || !meta.configureOnAdd) { cb.addItem(kind); return; }
    const old = root.querySelector('.addcfg');
    if (old) old.remove();
    const draft = cb.prepareItem(kind);
    const box = el('div', 'addcfg');
    box.append(el('div', 'addcfg-title', `${meta.label} 추가`));
    const controls = [];
    for (const f of meta.schema.filter((x) => x.create)) {
      const row = el('label', 'addcfg-row');
      const input = el(f.t === 'select' ? 'select' : 'input');
      const value = draft.props[f.k] === undefined ? f.def : draft.props[f.k];
      if (f.t === 'select') {
        for (const pair of f.options || []) {
          const o = el('option', null, pair[1]);
          o.value = pair[0];
          input.append(o);
        }
        input.value = value;
      } else {
        input.type = f.t === 'text' ? 'text' : 'number';
        input.value = value || '';
        if (f.pattern) input.pattern = f.pattern;
        if (f.maxLength) input.maxLength = f.maxLength;
      }
      row.append(el('span', null, f.label), input);
      box.append(row);
      controls.push([f, input]);
    }
    const actions = el('div', 'addcfg-actions');
    const cancel = el('button', null, '취소');
    cancel.type = 'button';
    cancel.onclick = () => box.remove();
    const add = el('button', 'on', '추가');
    add.type = 'button';
    add.onclick = () => {
      const values = {};
      for (const [f, input] of controls) {
        input.setCustomValidity('');
        if (!input.checkValidity()) { input.reportValidity(); return; }
        const value = ['text', 'select', 'color'].includes(f.t) ? input.value : Math.round(+input.value);
        values[f.k] = value;
      }
      const base = { ...draft.props, ...values };
      const derived = {};
      for (const [f, input] of controls) {
        const patch = f.patch
          ? f.patch(values[f.k], { id: draft.id, props: base, values })
          : { [f.k]: values[f.k] };
        for (const [k, value] of Object.entries(patch)) {
          if (Object.hasOwn(derived, k) && !Object.is(derived[k], value)) {
            input.setCustomValidity(`설정 규칙이 ${k} 값을 충돌시킵니다.`);
            input.reportValidity();
            return;
          }
          derived[k] = value;
        }
      }
      const props = { ...base, ...derived };
      cb.addItem(kind, { id: draft.id, props });
      box.remove();
    };
    actions.append(cancel, add);
    box.append(actions);
    root.append(box);
    const first = controls[0] && controls[0][1];
    if (first) { first.focus(); first.select && first.select(); }
  };
  root.append(sel);
}

export function syncHeightInputs(root, panes) {
  for (const p of panes) {
    const rg = root.querySelector(`input[type=range][data-pane-id="${p.id}"]`);
    if (rg && +rg.value !== p.h) {
      rg.value = p.h;
      const hv = rg.parentElement.nextElementSibling;
      if (hv) hv.textContent = p.h + 'px';
    }
  }
}
