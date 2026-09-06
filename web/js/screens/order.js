// Design: D3.market-symbol-d.types
/* screens/order.js - screen kind 'order' [8949]. */

import * as bus from '../bus.js';

const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

export const SCREEN = {
  no: '8949',
  label: '주식미니주문',
  keywords: ['주문', '매수', '매도', 'order', '잔고'],
  quick: true,
  needCode: true,
  needTf: true,
  defRect: { w: 320, h: 300 },
  minSize: { w: 260, h: 200 },

  defaultBody: () => ({ qty: 1, market: true }),
  reconcileBody: (b0) => {
    const b = b0 && typeof b0 === 'object' ? b0 : {};
    return { qty: Math.max(1, (b.qty | 0) || 1), market: b.market !== false };
  },

  mount(host, form, ctx) {
    const root = el('div', 'of');
    const cin = el('input', 'of-code');
    cin.value = form.code || '';
    cin.maxLength = 9;
    const qty = el('input', 'of-qty');
    qty.type = 'number';
    qty.min = 1;
    qty.value = form.body.qty;
    const mktw = el('label', 'of-mkt');
    const mkt = el('input');
    mkt.type = 'checkbox';
    mkt.checked = form.body.market !== false;
    mktw.append(mkt, document.createTextNode(' 시장가'));
    const row = el('div', 'of-row');
    const buy = el('button', 'buy');
    buy.textContent = '매수';
    const sell = el('button', 'sell');
    sell.textContent = '매도';
    row.append(buy, sell);
    const balb = el('button', 'of-bal');
    balb.textContent = '잔고 조회';
    const out = el('div', 'of-out mono');
    root.append(cin, qty, mktw, row, balb, out);
    host.append(root);

    // Design: D7.v6.symbol-link
    cin.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); cin.onchange(); }
    };
    cin.onchange = () => {
      const v = cin.value.trim();
      if (/^[0-9]{6}(?:_(?:AL|NX))?$(?![\s\S])/.test(v)) { if (v !== ctx.form().code) ctx.setCode(v); }
      else cin.value = ctx.form().code;
    };
    qty.onchange = () => ctx.patchBody({ qty: Math.max(1, Math.round(+qty.value) || 1) });
    mkt.onchange = () => ctx.patchBody({ market: mkt.checked });

    async function send(side) {
      const f = ctx.form();
      if (!f) return;
      const body = { code: f.code, side, qty: Math.max(1, f.body.qty | 0),
                     price: 0, tf: f.tf || '1m' };
      try {
        const r = await fetch('/api/order', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json();
        const msg = `[ORDER] ${side} ${body.code} x${body.qty} -> ${r.status} ${JSON.stringify(j).slice(0, 120)}`;
        out.textContent = msg;
        bus.push(msg);
      } catch (e) { out.textContent = 'ERR ' + e; bus.push('[ORDER-FAIL] ' + e); }
    }
    buy.onclick = () => send('BUY');
    sell.onclick = () => send('SELL');
    balb.onclick = async () => {
      try {
        const j = await fetch('/api/balance').then((r) => r.json());
        out.textContent = JSON.stringify(j, null, 1).slice(0, 1200);
      } catch (e) { out.textContent = 'ERR ' + e; }
    };

    const h = { root, cin, qty, mkt };
    h.stop = () => root.remove();
    return h;
  },

  update(h, form) {
    h.cin.value = form.code || '';
    if (+h.qty.value !== (form.body.qty | 0)) h.qty.value = form.body.qty;
    h.mkt.checked = form.body.market !== false;
  },
  unmount(h) { h.stop(); },
};
