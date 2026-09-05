import assert from 'node:assert/strict';
import * as ds from '../web/js/deskspec.js';

function merge(dst, src) {
  for (const [key, value] of Object.entries(src)) {
    if (value === ds.DEL) delete dst[key];
    else if (value && typeof value === 'object' && !Array.isArray(value)
             && dst[key] && typeof dst[key] === 'object' && !Array.isArray(dst[key])) merge(dst[key], value);
    else dst[key] = structuredClone(value);
  }
  return dst;
}

function form(vd, allVd = false) {
  return {
    screen: 'alpha', vd, allVd, visible: true, title: null,
    code: '005930', tf: '1m', link: 'follow', shareGroup: 'all',
    rect: { x: 0, y: 0, w: 300, h: 200 }, winState: 'normal',
    prevRect: { x: 0, y: 0, w: 300, h: 200 }, body: {},
  };
}

const st = ds.defaultStateV6();
st.vds.vd2.enabled = true;
st.forms = { f1: form('vd1'), f2: form('vd2'), f3: form('vd2', true) };
st.vds.vd1.z = ['f3', 'f1'];
st.vds.vd2.z = ['f2', 'f3'];
st.seq.form = 4;

// [D9.v6.form-series] allVd participates in the active VD's ordinary z space.
assert.deepEqual(ds.zList(st), ['f3', 'f1']);
const effective = ds.effectiveForms(st);
assert.deepEqual(effective.map((x) => [x.id, x.order]), [['f3', 0], ['f1', 1]]);
assert.deepEqual(Object.keys(effective[0].props.addonRaw).sort(), ['body', 'code', 'tf']);
assert.equal('title' in effective[0].props.addonRaw, false);

// [D7.v6.desired-diff] One body change remains a one-ID delta.
const bodyPatch = { forms: { f1: { body: { changed: true } } } };
const bodyAfter = merge(structuredClone(st), bodyPatch);
const bodyImpact = ds.impactOfPatch(st, '', bodyPatch);
const bodyChange = ds.projectDeskChange(st, bodyAfter, bodyImpact);
assert.equal(bodyChange.mode, 'delta');
assert.deepEqual(bodyChange.items.map((x) => x.id), ['f1']);
assert.deepEqual(bodyChange.absentIds, []);
assert.deepEqual(bodyChange.order, { mode: 'keep', id: null });

// [D7.v6.desired-diff] Active-slot changes are scope changes with a full order rebuild.
const switched = merge(structuredClone(st), { activeVd: 'vd2' });
const switchChange = ds.projectDeskChange(st, switched, ds.impactOfPatch(st, '', { activeVd: 'vd2' }));
assert.equal(switchChange.mode, 'scope');
assert.deepEqual(switchChange.items.map((x) => x.id), ['f2', 'f3']);
assert.deepEqual(switchChange.absentIds, ['f1']);
assert.deepEqual(switchChange.order, { mode: 'rebuild', id: null });

// [D7.v6.z-list] A pure move-to-end is represented as one raise.
const raisedPatch = { vds: { vd1: { z: ['f1', 'f3'] } } };
const raised = merge(structuredClone(st), raisedPatch);
const raiseChange = ds.projectDeskChange(st, raised, ds.impactOfPatch(st, '', raisedPatch));
assert.deepEqual(raiseChange.order, { mode: 'raise', id: 'f3' });
assert.deepEqual(raiseChange.items, []);

// [D9.v6.form-series] Global OFF removes exactly the previously effective set.
const off = merge(structuredClone(st), { globalOn: false });
const offChange = ds.projectDeskChange(st, off, ds.impactOfPatch(st, '', { globalOn: false }));
assert.deepEqual(offChange.items, []);
assert.deepEqual(offChange.absentIds, ['f3', 'f2', 'f1']);

console.log('[PASS] D7/D9 STATE projection emits feature-blind change-sets');
