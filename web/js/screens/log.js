/* screens/log.js - screen kind 'log' [1001]. */

import * as bus from '../bus.js';

const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

export const SCREEN = {
  no: '1001',
  label: '로그',
  keywords: ['로그', 'log', '이력'],
  quick: true,
  single: true,
  needCode: false,
  needTf: false,
  defRect: { w: 520, h: 240 },
  minSize: { w: 300, h: 140 },

  defaultBody: () => ({}),
  reconcileBody: (b) => (b && typeof b === 'object' ? b : {}),

  mount(host) {
    const pre = el('div', 'lf mono');
    pre.textContent = bus.tail(200).join('\n');
    host.append(pre);
    const off = bus.sub((line) => {
      pre.textContent += (pre.textContent ? '\n' : '') + line;
      pre.scrollTop = pre.scrollHeight;
    });
    return { pre, stop: () => { off(); pre.remove(); } };
  },
  unmount(h) { h.stop(); },
};
