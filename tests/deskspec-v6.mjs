import assert from 'node:assert/strict';
import fs from 'node:fs';
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

// [D3.v6.root-fields] A new workspace always has eight fixed slots.
const empty = ds.defaultStateV6();
assert.equal(empty.schemaVersion, 6);
assert.deepEqual(Object.keys(empty.vds), ['vd1', 'vd2', 'vd3', 'vd4', 'vd5', 'vd6', 'vd7', 'vd8']);
assert.equal(empty.vds.vd1.enabled, true);
assert.equal(Object.values(empty.vds).filter((v) => v.enabled).length, 1);
assert.equal(empty.seq.form, 1);

const canonical = JSON.parse(fs.readFileSync(new URL('../state/workspace.v6.fixture.json', import.meta.url), 'utf8'));
const canonicalResult = ds.reconcileV6(canonical);
assert.equal(canonicalResult.changed, false);
assert.deepEqual(canonicalResult.patch, {});

// [D3.v6.vd-fields] Labels are NFKC/trim/ASCII-case insensitive across inactive slots too.
empty.vds.vd4.label = 'ＡBC';
assert.equal(ds.labelKey('  Abc  '), 'abc');
assert.deepEqual(ds.validateVdLabel(empty, 'vd2', 'abc'), { ok: false, reason: 'duplicate', conflictSlot: 4 });
assert.equal(ds.validateVdLabel(empty, 'vd4', '새화면').ok, true);
assert.equal(ds.validateVdLabel(empty, 'vd4', '123456789').reason, 'invalid');

// [D4.v6.migration-v5] Gapped legacy IDs become fixed slots without losing forms.
const legacy = {
  schemaVersion: 5,
  globalOn: true,
  activeVd: 'vd7',
  symLink: 'vd',
  layout: { sidebarW: 300 },
  seq: { form: 11 },
  vds: {
    vd1: { label: 'VD1', order: 0, z: ['f1', 'f9'] },
    vd5: { label: 'VD5', order: 4, z: ['f5', 'f9'] },
    vd7: { label: '7', order: 5, z: ['f7', 'f9'] },
  },
  forms: {
    f1: { screen: 'alpha', vd: 'vd1', rect: { x: 1, y: 2, w: 300, h: 200 }, body: {} },
    f5: { screen: 'alpha', vd: 'vd5', rect: { x: 2, y: 3, w: 300, h: 200 }, body: {} },
    f7: { screen: 'alpha', vd: 'vd7', rect: { x: 3, y: 4, w: 300, h: 200 }, body: {} },
    f9: { screen: 'beta', vd: 'vd7', allVd: true, rect: { x: 4, y: 5, w: 300, h: 200 }, body: {} },
  },
};
const migrated = ds.migrateV5(legacy);
assert.equal(migrated.fatal, null);
assert.equal(migrated.st.activeVd, 'vd3');
assert.equal(migrated.st.forms.f5.vd, 'vd2');
assert.equal(migrated.st.forms.f7.vd, 'vd3');
assert.equal(migrated.st.forms.f9.vd, 'vd3');
assert.equal(migrated.st.vds.vd4.enabled, false);
assert.deepEqual(migrated.st.vds.vd1.z, ['f1', 'f9']);
assert.deepEqual(migrated.st.vds.vd2.z, ['f5', 'f9']);
assert.deepEqual(migrated.st.vds.vd3.z, ['f7', 'f9']);
assert.equal(new Set(Object.values(migrated.st.vds).map((v) => ds.labelKey(v.label))).size, 8);
assert.equal(migrated.st.seq.form, 11);
assert.deepEqual(merge(structuredClone(legacy), migrated.patch), migrated.st);

// [D4.v6.migration-v5] The ninth and later legacy VDs merge into slot 8 deterministically.
const many = { schemaVersion: 5, activeVd: 'old10', vds: {}, forms: {}, seq: {} };
for (let n = 1; n <= 10; n++) {
  const id = `old${n}`;
  many.vds[id] = { label: String(n), order: n, z: [`f${n}`] };
  many.forms[`f${n}`] = { screen: 'alpha', vd: id, rect: { x: 0, y: 0, w: 300, h: 200 }, body: {} };
}
const merged = ds.migrateV5(many);
assert.equal(merged.st.activeVd, 'vd8');
assert.deepEqual(['f8', 'f9', 'f10'].map((id) => merged.st.forms[id].vd), ['vd8', 'vd8', 'vd8']);
assert.deepEqual(merged.st.vds.vd8.z, ['f8', 'f9', 'f10']);
assert.ok(merged.repairs.some((line) => line.includes('vd-merge count=3')));

// [D4.v6.repair-vs-fatal] Fixed-slot corruption is repaired in one patch; future schema is fatal.
const damaged = ds.defaultStateV6();
damaged.activeVd = 'vd8';
damaged.vds.vd1.slot = 99;
damaged.vds.vd2.label = '1';
damaged.vds.vd2.enabled = false;
damaged.forms.f3 = { screen: 'alpha', vd: 'vd2', visible: true, rect: { x: -50, y: -40, w: 1, h: 1 }, body: {} };
damaged.vds.vd1.z = ['missing', 'f3', 'f3'];
const repaired = ds.reconcileV6(damaged);
assert.equal(repaired.fatal, null);
assert.equal(repaired.st.vds.vd1.slot, 1);
assert.notEqual(ds.labelKey(repaired.st.vds.vd1.label), ds.labelKey(repaired.st.vds.vd2.label));
assert.equal(repaired.st.vds.vd2.enabled, true);
assert.equal(repaired.st.activeVd, 'vd1');
assert.deepEqual(repaired.st.vds.vd1.z, []);
assert.deepEqual(repaired.st.vds.vd2.z, ['f3']);
assert.equal(repaired.st.forms.f3.rect.w, ds.MIN_W);
assert.deepEqual(merge(structuredClone(damaged), repaired.patch), repaired.st);
assert.equal(ds.reconcileV6({ schemaVersion: 7 }).fatal.code, 'FUTURE_SCHEMA');
assert.equal(ds.reconcileV6([]).fatal.code, 'ROOT_TYPE');

// [D7.v6.slot-commands] Activation, reset, clone, and visibility are pure patches.
const slotState = ds.defaultStateV6();
slotState.forms.f1 = { screen: 'alpha', vd: 'vd1', allVd: true, visible: true, rect: { x: 0, y: 0, w: 300, h: 200 }, body: {} };
slotState.forms.f2 = { screen: 'alpha', vd: 'vd1', allVd: false, visible: true, rect: { x: 0, y: 0, w: 300, h: 200 }, body: {} };
slotState.vds.vd1.z = ['f1', 'f2'];
slotState.seq.form = 3;
const activated = merge(structuredClone(slotState), ds.activateSlotPatch(slotState, 4));
assert.equal(activated.activeVd, 'vd4');
assert.equal(activated.vds.vd4.enabled, true);
assert.deepEqual(activated.vds.vd4.z, ['f1']);

const cloned = merge(structuredClone(slotState), ds.cloneVdPatch(slotState, 'vd1', 'vd3'));
assert.equal(cloned.activeVd, 'vd3');
assert.equal(cloned.vds.vd3.enabled, true);
assert.deepEqual(cloned.vds.vd3.z, ['f1', 'f3']);
assert.equal(cloned.forms.f3.vd, 'vd3');
assert.equal(cloned.forms.f3.allVd, false);
assert.equal(cloned.seq.form, 4);

const reset = merge(structuredClone(activated), ds.resetVdPatch(activated, 'vd4'));
assert.equal(reset.vds.vd4.enabled, false);
assert.deepEqual(reset.vds.vd4.z, []);
assert.equal(reset.undo.reason, 'resetVd');
assert.equal(ds.resetVdPatch(ds.defaultStateV6(), 'vd1'), null);
assert.deepEqual(ds.setFormVisiblePatch(slotState, 'f2', false), { forms: { f2: { visible: false } } });

// The current local workspace is only read; migration must retain every form.
const currentPath = new URL('../state/workspace.json', import.meta.url);
if (fs.existsSync(currentPath)) {
  const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  const currentResult = ds.reconcileV6(current);
  assert.equal(currentResult.fatal, null);
  assert.equal(Object.keys(currentResult.st.forms).length, Object.keys(current.forms || {}).length);
  assert.equal(Object.keys(currentResult.st.vds).length, 8);
}

console.log('[PASS] D3/D4/D7 STATE v6 migration, repair, and fixed-slot commands');
