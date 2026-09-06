// Design: D3.market-symbol-d.types
/* screens/quote.js - screen kind 'quote' [0101]. */

const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

export const SCREEN = {
  no: '0101',
  label: '현재가',
  keywords: ['현재가', '시세', 'quote', '종목'],
  quick: true,
  needCode: true,
  needTf: false,
  defRect: { w: 340, h: 300 },
  minSize: { w: 260, h: 160 },

  defaultBody: () => ({}),
  reconcileBody: (b) => (b && typeof b === 'object' ? b : {}),

  mount(host, form, ctx) {
    const root = el('div', 'qf');
    const cin = el('input', 'qf-code');
    cin.value = form.code || '';
    cin.maxLength = 9;
    const tbl = el('div', 'qf-tbl mono');
    root.append(cin, tbl);
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

    const h = { root, cin, timer: 0, stopped: false };
    h.pull = async () => {
      const f = ctx.form();
      if (!f || h.stopped) return;
      const code = f.code;
      try {
        const q = await fetch('/api/quote?code=' + encodeURIComponent(f.code)).then((r) => r.json());
        if (h.stopped || ctx.form()?.code !== code) return;
        tbl.textContent = Object.entries(q).slice(0, 18)
          .map(([k, v]) => String(k).padEnd(16) + String(v)).join('\n');
      } catch (e) { if (!h.stopped && ctx.form()?.code === code) tbl.textContent = 'ERR ' + e; }
    };
    h.pull();
    h.timer = setInterval(h.pull, 5000);
    h.stop = () => { h.stopped = true; clearInterval(h.timer); root.remove(); };
    return h;
  },

  update(h, form) { h.cin.value = form.code || ''; h.pull(); },
  unmount(h) { h.stop(); },
};
