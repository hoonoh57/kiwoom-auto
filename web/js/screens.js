/* screens.js - screen kind 단일 등록부.
   여기 한 블록에만 등록한다. 화면검색/퀵툴바/추가 메뉴는 이 카탈로그에서 파생된다. */

import { SCREEN as CHART } from './screens/chart.js';
import { SCREEN as QUOTE } from './screens/quote.js';
import { SCREEN as ORDER } from './screens/order.js';
import { SCREEN as LOGV } from './screens/log.js';

const reg = new Map();

export function register(kind, impl) { reg.set(kind, impl); }

register('chart', CHART);   // 0615
register('quote', QUOTE);   // 0101
register('order', ORDER);   // 8949
register('log', LOGV);      // 1001

const metaOf = (v) => ({
  no: v.no, label: v.label, keywords: v.keywords || [],
  quick: !!v.quick, single: !!v.single,
  needCode: !!v.needCode, needTf: !!v.needTf,
  defRect: v.defRect || { w: 720, h: 460 },
  minSize: v.minSize || { w: 240, h: 120 },
});

export function get(kind) { return reg.get(kind); }

export function catalog() {
  return [...reg.entries()].map(([kind, v]) => ({ kind, ...metaOf(v) }))
    .sort((a, b) => String(a.no).localeCompare(String(b.no)));
}

export function search(q0) {
  const q = String(q0 || '').trim().toLowerCase();
  if (!q) return [];
  const num = /^\d+$/.test(q);
  return catalog().filter((c) => (num
    ? String(c.no).startsWith(q)
    : c.label.toLowerCase().includes(q) || c.keywords.some((k) => String(k).toLowerCase().includes(q))));
}

export const spec = {
  has: (k) => reg.has(k),
  meta: (k) => metaOf(reg.get(k)),
  legacyKind: () => {
    for (const [k, v] of reg.entries()) if (v.legacy) return k;
    return [...reg.keys()][0];
  },
  title: (f) => {
    const v = reg.get(f.screen);
    if (!v) return f.screen;
    return f.title || `[${v.no}] ${v.label}`;
  },
  sub: (f) => {
    const v = reg.get(f.screen);
    if (!v) return '';
    return [v.needCode ? f.code : '', v.needTf ? f.tf : '', f.allVd ? 'ALL' : ''].filter(Boolean).join(' ');
  },
  defaultBody: (k, form) => {
    const v = reg.get(k);
    return v.defaultBody ? v.defaultBody(form) : {};
  },
  reconcileBody: (k, body, form) => {
    const v = reg.get(k);
    return v.reconcileBody ? v.reconcileBody(body, form) : body;
  },
  mount: (k, host, form, ctx) => reg.get(k).mount(host, form, ctx),
  update: (k, h, form, ctx) => { const v = reg.get(k); if (v.update) v.update(h, form, ctx); },
  resize: (k, h) => { const v = reg.get(k); if (v && h && v.resize) v.resize(h); },
  unmount: (k, h) => { const v = reg.get(k); if (v && v.unmount) v.unmount(h); },
};
