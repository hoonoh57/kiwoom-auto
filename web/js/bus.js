/* bus.js - 프로세스 내 로그 버스. 상태를 저장하지 않는다. */

const subs = new Set();
const lines = [];

export function push(msg) {
  const s = new Date().toTimeString().slice(0, 8) + ' ' + String(msg);
  lines.push(s);
  if (lines.length > 500) lines.shift();
  for (const fn of subs) { try { fn(s); } catch (e) { /* 구독자 오류 무시 */ } }
  return s;
}

export function tail(n) { return lines.slice(-(n || 200)); }

export function sub(fn) { subs.add(fn); return () => subs.delete(fn); }
