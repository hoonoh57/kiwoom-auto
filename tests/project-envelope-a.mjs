// Design: D11.project-envelope-a.vectors, D12.project-envelope-a.cost
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROJECT_SCHEMA, wrapWorkspaceJson, projectWorkspacePath, selectProject } from '../web/js/project-state.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/project-envelope-a.contract.json', import.meta.url), 'utf8'));
const text = JSON.stringify(fixture.workspace);
const expectError = (fn, code) => assert.throws(fn, { name: 'ProjectStateError', code, message: code });
assert.equal(PROJECT_SCHEMA, 7);

// PEA1/2: retain unknown and disabled settings; validator receives an isolated graph.
let calls = 0;
const first = wrapWorkspaceJson(text, value => { calls++; return true; });
assert.equal(calls, 1);
assert.deepEqual(first, fixture.envelope);
const second = wrapWorkspaceJson(text, value => {
  value.marker = 'changed';
  value.opaque.items[0].props.n = 99;
  return true;
});
assert.deepEqual(second, fixture.envelope);
assert.notEqual(first, second);
assert.notEqual(first.projects.p1.workspace, second.projects.p1.workspace);
assert.notEqual(first.projects.p1.workspace.opaque.items, second.projects.p1.workspace.opaque.items);

// PEA3/4/11: parse/version errors never reach the validator.
for (const vector of fixture.errorVectors) {
  calls = 0;
  expectError(() => wrapWorkspaceJson(vector.text, () => { calls++; return true; }), vector.code);
  assert.equal(calls, vector.callbackCount);
}
expectError(() => wrapWorkspaceJson(7, () => true), 'INVALID_ARGUMENT');
expectError(() => wrapWorkspaceJson('{', null), 'INVALID_ARGUMENT');
for (const input of ['null', '[]', 'true', '7', '{"schemaVersion":"6"}']) {
  expectError(() => wrapWorkspaceJson(input, () => true), 'WORKSPACE_VERSION');
}

// PEA5/12: validation must explicitly, synchronously return true.
for (const validator of [() => false, () => 1, () => undefined, () => Promise.resolve(true), () => { throw new Error('private'); }]) {
  expectError(() => wrapWorkspaceJson(text, validator), 'WORKSPACE_INVALID');
}

// PEA6: IDs cannot inject node path segments or lose numeric identity.
assert.equal(projectWorkspacePath('p12'), 'projects/p12/workspace');
assert.equal(projectWorkspacePath('p9007199254740991'), 'projects/p9007199254740991/workspace');
for (const id of ['p01', 'p0', 'p1/x', '../p1', 'p1%2Fx', '__proto__', 'p9007199254740992', 1, null]) {
  expectError(() => projectWorkspacePath(id), 'INVALID_PROJECT_ID');
}

// PEA7/8: selection changes one desired field, never the workspace graphs.
assert.equal(selectProject(first, 'p1'), first);
const root = structuredClone(first);
root.projects.p2 = { name: '두 번째', enabled: true, props: { ...root.projects.p1.props }, workspace: structuredClone(fixture.workspace) };
root.projectSeq = 3;
root.projectOrder.push('p2');
const before = JSON.stringify(root);
const selected = selectProject(root, 'p2');
assert.notEqual(selected, root);
assert.equal(selected.activeProjectId, 'p2');
assert.equal(selected.projects, root.projects);
assert.equal(selected.projectOrder, root.projectOrder);
assert.equal(selected.projects.p2.workspace, root.projects.p2.workspace);
assert.equal(JSON.stringify(root), before);

// PEA9/10: guard order is deterministic.
root.projects.p2.enabled = false;
expectError(() => selectProject(root, 'p2'), 'PROJECT_DISABLED');
expectError(() => selectProject(root, 'p9'), 'PROJECT_NOT_FOUND');
expectError(() => selectProject(null, 'invalid'), 'ROOT_INVALID');
expectError(() => selectProject(root, 'invalid'), 'INVALID_PROJECT_ID');

// N=1000: selection must not enumerate other projects or read their values.
const many = {};
for (let n = 1; n <= 1000; n++) many[`p${n}`] = { enabled: true };
const watched = new Proxy(many, {
  ownKeys() { throw new Error('Full project scan'); },
  get(target, key) {
    assert.equal(key, 'p1000');
    return target[key];
  },
});
const big = { ...first, projects: watched };
assert.equal(selectProject(big, 'p1000').activeProjectId, 'p1000');

// Canonical legacy contents must be preserved without applying a new UI schema.
const v6 = fs.readFileSync(new URL('../state/workspace.v6.fixture.json', import.meta.url), 'utf8');
const v7 = JSON.parse(fs.readFileSync(new URL('../state/workspace.v7.fixture.json', import.meta.url), 'utf8'));
assert.deepEqual(wrapWorkspaceJson(v6, () => true), v7);
console.log('[PASS] D11.project-envelope-a PEA1-PEA12 and N=1000 selection locality');
