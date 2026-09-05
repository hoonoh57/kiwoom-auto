import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalHash, createDesk } from '../web/js/desk.js';
import { referenceHash, vectors } from './reference/canonical-hash.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/desk-traces.v6.json', import.meta.url), 'utf8'));

// [D8.v6.canonical-hash] Product and independent reference agree with literal vectors.
for (const [name, value] of Object.entries(vectors)) {
  assert.equal(referenceHash(value), fixture.hashVectors[name]);
  assert.equal(canonicalHash(value), fixture.hashVectors[name]);
}
assert.equal(canonicalHash({ b: 2, a: 1 }), canonicalHash({ a: 1, b: 2 }));
assert.equal(canonicalHash(-0), canonicalHash(0));
assert.notEqual(canonicalHash(vectors.P1), canonicalHash(vectors.P1Code));
assert.throws(() => canonicalHash({ bad: NaN }), { name: 'CanonicalValueError' });
assert.throws(() => canonicalHash({ bad: undefined }), { name: 'CanonicalValueError' });
assert.throws(() => canonicalHash(Array(1)), { name: 'CanonicalValueError' });

function harness({ throwRemove = false } = {}) {
  const calls = [];
  const logs = [];
  const recorded = [];
  const frame = {
    createFrame: (_host, id, rect, on) => ({ id, rect, on, body: { id } }),
    setFrameRect: (h, value) => { h.rect = value; calls.push(['setFrameRect', h.id]); },
    setFrameState: (h, value) => { h.state = value; calls.push(['setFrameState', h.id]); },
    setFrameZ: (h, value) => { h.z = value; calls.push(['setFrameZ', h.id, value]); },
    setFrameVisible: (h, value) => { h.visible = value; calls.push(['setFrameVisible', h.id, value]); },
    setFrameTitle: (h, value) => { h.title = value; calls.push(['setFrameTitle', h.id]); },
    getContentHost: (h) => h.body,
    destroyFrame: (h) => { calls.push(['destroyFrame', h.id]); },
  };
  const catalog = {
    normalize: (_kind, raw) => structuredClone(raw),
    ensure: (_kind, _ctx, id, props) => { calls.push(['ensure', id]); return { id, props }; },
    update: (_kind, _ctx, handle, _prev, next) => { handle.props = next; calls.push(['update', handle.id]); },
    remove: (_kind, _ctx, handle) => {
      calls.push(['remove', handle.id]);
      if (throwRemove) throw new Error('remove-failed');
    },
  };
  const desk = createDesk({ host: {}, catalog, frame, patch: () => {}, log: (line) => logs.push(line), recorder: (e) => recorded.push(e) });
  return { desk, calls, logs, recorded };
}

function item(id, order = 0, raw = vectors.P1, rect = { x: 0, y: 0, w: 100, h: 100 }, kind = 'chart') {
  return {
    id, kind, enabled: true, visible: true, order,
    props: { addonRaw: structuredClone(raw), frame: { rect, winState: 'normal', title: null, shareGroup: 'all' } },
  };
}

// [D11.v6.arch-traces T1/T7/T8/T11] Idempotence and hash/geometry separation.
const one = harness();
let result = one.desk.apply({ mode: 'initial', items: [item('f1')], absentIds: [], order: { mode: 'rebuild', id: null } });
assert.deepEqual(result.events, fixture.semantic.T1);
one.calls.length = 0;
result = one.desk.apply({ mode: 'delta', items: [item('f1')], absentIds: [], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events, []);
assert.deepEqual(one.calls, []);

result = one.desk.apply({ mode: 'delta', items: [item('f1', 0, vectors.P1, { x: 8, y: 0, w: 100, h: 100 })], absentIds: [], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events.map(({ seq: _seq, ...event }) => event), fixture.semantic.T8.map(({ seq: _seq, ...event }) => event));
assert.deepEqual(one.calls.map((call) => call[0]), ['setFrameRect', 'setFrameState']);

one.calls.length = 0;
result = one.desk.apply({ mode: 'delta', items: [item('f1', 0, vectors.P1Body, { x: 8, y: 0, w: 100, h: 100 })], absentIds: [], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events.map(({ seq: _seq, ...event }) => event), fixture.semantic.T11.map(({ seq: _seq, ...event }) => event));
assert.deepEqual(one.calls, [['update', 'f1']]);

// [D11.v6.arch-traces T3/T4/T6/T10] Remove/re-enable, fresh replay, and a new kind stay generic.
const cycle = harness();
cycle.desk.apply({ mode: 'initial', items: [item('f500')], absentIds: [], order: { mode: 'rebuild', id: null } });
result = cycle.desk.apply({ mode: 'delta', items: [], absentIds: ['f500'], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events.map((e) => [e.op, e.id]), [['remove', 'f500']]);
result = cycle.desk.apply({ mode: 'delta', items: [item('f500')], absentIds: [], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events.map((e) => [e.op, e.id]), [['ensure', 'f500']]);
const fresh = harness();
result = fresh.desk.apply({ mode: 'initial', items: [item('f1')], absentIds: [], order: { mode: 'rebuild', id: null } });
assert.deepEqual(result.events, fixture.semantic.T1);
result = fresh.desk.apply({ mode: 'delta', items: [item('f2', 1, vectors.P1, undefined, 'new-kind')], absentIds: [], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events.map((e) => [e.op, e.kind]), [['ensure', 'new-kind']]);

// [D11.v6.arch-traces T2/T5/T9] N=1000 is deterministic and second apply is operation-free.
const bulk = harness();
const thousand = Array.from({ length: 1000 }, (_, index) => item(`f${index + 1}`, index));
result = bulk.desk.apply({ mode: 'initial', items: thousand, absentIds: [], order: { mode: 'rebuild', id: null } });
assert.equal(result.events.length, 1000);
assert.deepEqual(result.events.slice(0, 3).map((e) => e.id), ['f1', 'f2', 'f3']);
bulk.calls.length = 0;
result = bulk.desk.apply({ mode: 'delta', items: [], absentIds: [], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events, []);
assert.deepEqual(bulk.calls, []);
result = bulk.desk.apply({
  mode: 'delta', items: [item('f500', 499, vectors.P1Body)], absentIds: [], order: { mode: 'keep', id: null },
});
assert.deepEqual(result.events.map((e) => [e.op, e.id]), [['update', 'f500']]);
for (const count of [1, 10]) {
  const sized = harness();
  const items = Array.from({ length: count }, (_, index) => item(`f${index + 1}`, index));
  assert.equal(sized.desk.apply({ mode: 'initial', items, absentIds: [], order: { mode: 'rebuild', id: null } }).events.length, count);
}
result = bulk.desk.apply({ mode: 'scope', items: [], absentIds: thousand.map((x) => x.id), order: { mode: 'rebuild', id: null } });
assert.equal(result.events.length, 1000);
assert.deepEqual(result.events.slice(0, 3).map((e) => e.id), ['f1000', 'f999', 'f998']);
assert.equal(bulk.desk.mounted(), 0);

// [D7.v6.z-list] A raise changes only one z style and emits one semantic update.
const raised = harness();
raised.desk.apply({ mode: 'initial', items: [item('f1', 0), item('f2', 1)], absentIds: [], order: { mode: 'rebuild', id: null } });
raised.calls.length = 0;
result = raised.desk.apply({ mode: 'delta', items: [], absentIds: [], order: { mode: 'raise', id: 'f1' } });
assert.deepEqual(raised.calls, [['setFrameZ', 'f1', 2]]);
assert.deepEqual(result.events.map((e) => [e.op, e.id]), [['update', 'f1']]);

// [D10.v6.boundaries] Removal deletes live authority before a failing add-on remove.
const failing = harness({ throwRemove: true });
failing.desk.apply({ mode: 'initial', items: [item('f1')], absentIds: [], order: { mode: 'rebuild', id: null } });
result = failing.desk.apply({ mode: 'delta', items: [], absentIds: ['f1'], order: { mode: 'keep', id: null } });
assert.equal(result.events.length, 1);
assert.equal(failing.desk.mounted(), 0);
assert.ok(failing.logs.some((line) => line.includes('[DESK!] remove f1')));
result = failing.desk.apply({ mode: 'delta', items: [], absentIds: ['f1'], order: { mode: 'keep', id: null } });
assert.deepEqual(result.events, []);

console.log('[PASS] D7/D8/D11 generic desk bridge traces and locality');
