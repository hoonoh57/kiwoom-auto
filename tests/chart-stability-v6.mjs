// Design: D5.v6.chart-range, D5.v6.market-cache
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('web/js/screens/chart.js', 'utf8');
let now = 0, seq = 0, jobs = new Map(), writes = [], spacing = 9, callback;
const events = {};
const scheduler = { set(fn, ms) { const id = ++seq; jobs.set(id, { fn, at: now + ms }); return id; }, clear(id) { jobs.delete(id); } };
function advance(ms) {
  const end = now + ms;
  while (true) {
    const next = [...jobs].filter(([, j]) => j.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
    if (!next) break;
    now = next[1].at; jobs.delete(next[0]); next[1].fn();
  }
  now = end;
}
const scope = { ctx: { scheduler, form: () => ({ body: { view: { barSpacing: 8 } } }), patchBody: v => writes.push(v) }, h: {},
  obj: v => v || {}, engine: { getBarSpacing: () => spacing, onRangeChange: fn => callback = fn },
  cwrap: { addEventListener: (type, fn) => events[type] = fn } };
const range = source.slice(source.indexOf('    // Design: D5.v6.chart-range'), source.indexOf('    h.resub ='));
vm.runInNewContext(range, scope);
// Program callbacks and synthetic inputs never persist.
callback(); advance(2000); assert.equal(writes.length, 0);
events.wheel({ type:'wheel', isTrusted:false }); callback(); advance(2000); assert.equal(writes.length,0);
events.pointerdown({ type:'pointerdown', isTrusted:true, isPrimary:false, button:0 }); callback(); advance(2000); assert.equal(writes.length,0);
events.wheel({ type:'wheel', isTrusted:true }); callback(); advance(799); assert.equal(writes.length,0);
advance(1); assert.equal(writes.length,1);
callback(); advance(2000); assert.equal(writes.length,1);
events.wheel({ type:'wheel', isTrusted:true }); advance(1500); callback(); advance(800); assert.equal(writes.length,1);
events.wheel({ type:'wheel', isTrusted:true }); callback(); advance(700); callback(); advance(800); assert.equal(writes.length,1);

let polls, calls = 0;
const market = source.slice(source.indexOf('const feeds ='), source.indexOf('/* ---- body'));
const cache = vm.runInNewContext(market + '\n({subscribe,pull,feeds})', {
  Map, Set, encodeURIComponent,
  setInterval: fn => polls = fn,
  fetch: async url => { calls++; return { json: async () => url.includes('/bars') ? {bars:Array.from({length:1300},(_,time)=>({time})),barsHash:'x'} : {} }; }
});
let received;
const off=cache.subscribe('005930','1m', d => received=d);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(received.bars.length,1200);
off(); const before=calls; polls(); assert.equal(calls,before);
const again=cache.subscribe('005930','1m',()=>{}); assert.equal(calls,before); again();
for(let i=0;i<40;i++) cache.subscribe(String(i).padStart(6,'0'),'1m',()=>{})();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(cache.feeds.size,32);
assert.equal(cache.feeds.has('005930|1m'),false);
assert.equal(cache.feeds.has('000039|1m'),true);
console.log('[PASS] D5 range input gate and market cache retention');
