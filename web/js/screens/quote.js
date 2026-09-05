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
    cin.maxLength = 8;
    const tbl = el('div', 'qf-tbl mono');
    root.append(cin, tbl);
    host.append(root);

    // Design: D7.v6.symbol-link
    cin.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); cin.onchange(); }
    };
    cin.onchange = () => {
      const v = cin.value.trim();
      if (/^\d{6}$/.test(v)) { if (v !== ctx.form().code) ctx.setCode(v); }
      else cin.value = ctx.form().code;
    };

    const h = { root, cin, timer: 0 };
    h.pull = async () => {
      const f = ctx.form();
      if (!f) return;
      try {
        const q = await fetch('/api/quote?code=' + encodeURIComponent(f.code)).then((r) => r.json());
        tbl.textContent = Object.entries(q).slice(0, 18)
          .map(([k, v]) => String(k).padEnd(16) + String(v)).join('\n');
      } catch (e) { tbl.textContent = 'ERR ' + e; }
    };
    h.pull();
    h.timer = setInterval(h.pull, 5000);
    h.stop = () => { clearInterval(h.timer); root.remove(); };
    return h;
  },

  update(h, form) { h.cin.value = form.code || ''; h.pull(); },
  unmount(h) { h.stop(); },
};
