// Design: D11.project-envelope-b.vectors, D10.project-envelope-b.error-order
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateProjectEnvelopeJson as validate } from '../web/js/project-state.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/project-envelope-b.contract.json', import.meta.url), 'utf8'));
for (const test of fixture.cases) {
  const order = [];
  const result = validate(test.text, (workspace, id) => {
    order.push(id);
    if (test.callback === 'mutate') {
      workspace.marker = 'changed';
      workspace.opaque.items.length = 0;
    }
    if (test.callback === 'reject-p2') return id !== 'p2';
    if (test.callback === 'async') return Promise.resolve(true);
    return true;
  });
  assert.deepEqual(result, test.expected, test.id);
  assert.equal(order.length, test.callbackCalls, test.id);
  assert.deepEqual(order, test.callbackOrder, test.id);
}
const base = JSON.parse(fixture.cases[0].text);
const error = (text, code, path = '', callback = () => true) => {
  assert.deepEqual(validate(text, callback), { ok: false, code, path });
};
const invalidDoc = (change, code, path = '') => {
  const root = structuredClone(base);
  change(root);
  let calls = 0;
  error(JSON.stringify(root), code, path, () => { calls++; return true; });
  assert.equal(calls, 0);
};
error(null, 'INVALID_ARGUMENT');
error('{', 'INVALID_ARGUMENT', '', null);
for (const text of ['{', '{"value":1e999}']) error(text, 'INVALID_JSON');
for (const text of ['null', '[]', '1', 'true']) error(text, 'ROOT_TYPE');
error(JSON.stringify(base.projects.p1.workspace), 'ROOT_KEYS');
invalidDoc(r => { r.schemaVersion = 6; }, 'ROOT_VERSION', '/schemaVersion');
invalidDoc(r => { r.schemaVersion = 6; r.extra = 1; }, 'ROOT_KEYS');
for (const seq of [null, 1, 2.5, '2', 9007199254740992]) {
  invalidDoc(r => { r.projectSeq = seq; }, 'PROJECT_SEQ', '/projectSeq');
}
for (const id of ['p0', 'p01', 'p1/x', 'p1\n', 'p9007199254740992', 1]) {
  invalidDoc(r => { r.activeProjectId = id; }, 'PROJECT_ID', '/activeProjectId');
}
invalidDoc(r => { r.projectOrder = []; }, 'PROJECT_ORDER', '/projectOrder');
invalidDoc(r => { r.projectOrder = ['p01']; }, 'PROJECT_ID', '/projectOrder/0');
invalidDoc(r => { r.projects.p2 = r.projects.p1; }, 'PROJECT_MEMBERS', '/projects');
invalidDoc(r => { r.projectOrder = ['p2']; r.projects.p2 = r.projects.p1; delete r.projects.p1; }, 'PROJECT_SEQ', '/projectSeq');
invalidDoc(r => { r.projects.p1.extra = true; }, 'PROJECT_SHAPE', '/projects/p1');
for (const name of ['', ' leading', 'trailing ', '😀'.repeat(33), 1]) {
  invalidDoc(r => { r.projects.p1.name = name; }, 'PROJECT_NAME', '/projects/p1/name');
}
const unicode = structuredClone(base);
unicode.projects.p1.name = '😀'.repeat(32);
assert.equal(validate(JSON.stringify(unicode), () => true).ok, true);
invalidDoc(r => {
  r.projects.p1.name = 'ＡBC';
  r.projects.p2 = { ...r.projects.p1, name: 'abc' };
  r.projectOrder.push('p2'); r.projectSeq = 3;
}, 'PROJECT_NAME_DUPLICATE', '/projects/p2/name');
invalidDoc(r => { r.projects.p1.enabled = 1; }, 'PROJECT_ENABLED', '/projects/p1/enabled');
invalidDoc(r => { r.projects.p1.props.extra = true; }, 'PROJECT_PROPS', '/projects/p1/props');
for (const ref of ['', 'x\n', 'x'.repeat(65), '../x', 1]) {
  invalidDoc(r => { r.projects.p1.props.connectionRef = ref; }, 'CONNECTION_REF', '/projects/p1/props/connectionRef');
}
invalidDoc(r => { r.projects.p1.props.automationEnabled = 1; }, 'FLAG_TYPE', '/projects/p1/props/automationEnabled');
invalidDoc(r => { r.projects.p1.workspace = []; }, 'WORKSPACE_VERSION', '/projects/p1/workspace');
invalidDoc(r => { r.activeProjectId = 'p9'; }, 'ACTIVE_PROJECT', '/activeProjectId');
// All projects must pass structure before any workspace callback runs.
invalidDoc(r => {
  r.projectSeq = 3; r.projectOrder.push('p2');
  r.projects.p2 = { ...r.projects.p1, name: 'Second', workspace: null };
}, 'WORKSPACE_VERSION', '/projects/p2/workspace');
for (const callback of [() => false, () => 1, () => undefined, () => { throw Error('secret'); }]) {
  error(fixture.cases[0].text, 'WORKSPACE_INVALID', '/projects/p1/workspace', callback);
}
// Canonical v7 retention includes every nested v6 field; callback cannot change output.
const canonical = fs.readFileSync(new URL('../state/workspace.v7.fixture.json', import.meta.url), 'utf8');
const parsed = JSON.parse(canonical);
assert.deepEqual(validate(canonical, workspace => {
  for (const key of Object.keys(workspace)) delete workspace[key];
  return true;
}), { ok: true, value: parsed });
const a = validate(canonical, () => true), b = validate(canonical, () => true);
assert.notEqual(a.value.projects.p1.workspace, b.value.projects.p1.workspace);
// The same algorithm accepts 1/10/1000 projects, one callback per project.
for (const count of [1, 10, 1000]) {
  const root = { ...base, projectSeq: count + 1, projectOrder: [], projects: {} };
  for (let i = 1; i <= count; i++) {
    root.projectOrder.push(`p${i}`);
    root.projects[`p${i}`] = { ...base.projects.p1, name: `Project ${i}` };
  }
  let calls = 0;
  assert.equal(validate(JSON.stringify(root), () => { calls++; return true; }).ok, true);
  assert.equal(calls, count);
}
console.log('[PASS] D11.project-envelope-b vectors, precedence, preservation and scale');
