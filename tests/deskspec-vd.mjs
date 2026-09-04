import assert from 'node:assert/strict';
import * as ds from '../web/js/deskspec.js';

const alloc = { vds: {
  vd1: { label: 'VD1', order: 0, z: [] },
  vd5: { label: 'VD5', order: 4, z: [] },
  vd7: { label: ' 7 ', order: 4, z: [] },
} };
assert.equal(ds.nextVdId(alloc), 'vd8');
assert.equal(ds.nextVdLabel(alloc), '8');
assert.equal(ds.nextVdOrder(alloc), 5);
assert.equal(ds.hasVdLabel(alloc, '7', null), true);
assert.equal(ds.hasVdLabel(alloc, ' VD5 ', 'vd7'), true);
assert.equal(ds.hasVdLabel(alloc, 'VD5', 'vd5'), false);

const raw = {
  schemaVersion: 5, globalOn: true, activeVd: 'vd8', symLink: 'vd',
  layout: { sidebarW: 300 }, seq: { form: 0 }, forms: {},
  vds: {
    vd1: { label: 'VD1', order: 0, z: [] },
    vd5: { label: 'VD5', order: 4, z: [] },
    vd7: { label: ' 7 ', order: 5, z: [] },
    vd8: { label: 'VD5', order: 6, z: [] },
  },
};
const cat = { has: () => false };
const fixed = ds.reconcile(raw, cat, { w: 1280, h: 720 });
assert.equal(fixed.changed, true);
assert.deepEqual(ds.vdOrder(fixed.st), ['vd1', 'vd5', 'vd7', 'vd8']);
assert.deepEqual(ds.vdOrder(fixed.st).map((id) => fixed.st.vds[id].order), [0, 1, 2, 3]);
assert.deepEqual(ds.vdOrder(fixed.st).map((id) => fixed.st.vds[id].label), ['VD1', 'VD5', '7', '8']);

console.log('[PASS] VD id/order/label allocation and reconciliation');
