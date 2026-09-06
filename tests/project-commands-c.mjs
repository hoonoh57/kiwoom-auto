// Design: D11.project-commands-c.vectors, D12.project-commands-c.cost
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createProject, renameProject, setProjectEnabled, deleteProject, validateProjectEnvelopeJson } from '../web/js/project-state.js';
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/project-commands-c.contract.json', import.meta.url), 'utf8'));
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
}
for (const test of fixture.cases) {
  const root = freeze(structuredClone(test.root));
  let calls = 0;
  const callback = mode => workspace => { calls++; workspace.marker = 'changed'; return mode === 'accept'; };
  const run = () => {
    const a = test.args;
    switch (test.op) {
      case 'create': return createProject(root, a[0], JSON.stringify(a[1]), callback(a[2]));
      case 'rename': return renameProject(root, ...a);
      case 'enabled': return setProjectEnabled(root, ...a);
      case 'delete': return deleteProject(root, ...a);
      case 'delete-create': return createProject(deleteProject(root, a[0]), a[1], JSON.stringify(a[2]), callback(a[3]));
      default: assert.fail(test.op);
    }
  };
  if (test.expected.code) {
    assert.throws(run, { name: 'ProjectStateError', code: test.expected.code, message: test.expected.code }, test.id);
  } else {
    const next = run();
    assert.deepEqual(next, test.expected.value, test.id);
    assert.equal(validateProjectEnvelopeJson(JSON.stringify(next), () => true).ok, true, test.id);
    if (['PCC5', 'PCC10'].includes(test.id)) assert.equal(next, root);
    for (const [id, project] of Object.entries(root.projects)) {
      if (!Object.hasOwn(next.projects, id)) continue;
      assert.equal(next.projects[id].workspace, project.workspace);
      assert.equal(next.projects[id].props, project.props);
      if (JSON.stringify(next.projects[id]) === JSON.stringify(project)) assert.equal(next.projects[id], project);
    }
    if (['rename', 'enabled'].includes(test.op)) assert.equal(next.projectOrder, root.projectOrder);
  }
  assert.equal(calls, test.callbackCalls, test.id);
  assert.deepEqual(root, test.root);
}
const base = freeze(structuredClone(fixture.cases[0].root));
const throws = (fn, code) => assert.throws(fn, { name: 'ProjectStateError', code, message: code });
for (const fn of [r => createProject(r, '', '{', null), r => renameProject(r, 'p0', ''), r => setProjectEnabled(r, 'p0', null), r => deleteProject(r, 'p0')]) {
  throws(() => fn(null), 'ROOT_INVALID');
}
for (const id of ['p0', 'p01', 'p1\n', 'p9007199254740992', '../p1']) {
  for (const fn of [() => renameProject(base, id, ''), () => setProjectEnabled(base, id, false), () => deleteProject(base, id)]) throws(fn, 'INVALID_PROJECT_ID');
}
throws(() => renameProject(base, 'p9', ''), 'PROJECT_NOT_FOUND');
throws(() => setProjectEnabled(base, 'p1', 'true'), 'PROJECT_ENABLED');
for (const name of ['', ' name', 'name\n', '😀'.repeat(33), null]) {
  throws(() => renameProject(base, 'p1', name), 'PROJECT_NAME');
  throws(() => createProject(base, name, '{', null), 'PROJECT_NAME');
}
throws(() => createProject(base, 'New', '{', () => true), 'INVALID_JSON');
throws(() => createProject(base, 'New', '{}', () => true), 'WORKSPACE_VERSION');
throws(() => createProject(base, 'New', JSON.stringify(base.projects.p1.workspace), () => Promise.resolve(true)), 'WORKSPACE_INVALID');
// Active replacement follows stored order, skipping disabled projects.
const many = structuredClone(fixture.cases[8].root);
many.projectSeq = 4; many.projectOrder = ['p3', 'p1', 'p2'];
many.projects.p3 = { ...many.projects.p2, name: 'Third', enabled: false };
assert.equal(deleteProject(many, 'p1').activeProjectId, 'p2');
assert.equal(setProjectEnabled(many, 'p3', true).activeProjectId, 'p1');
assert.equal(deleteProject(many, 'p3').activeProjectId, 'p1');
for (const count of [1, 10, 1000]) {
  const root = { ...base, projectSeq: count + 1, projects: {}, projectOrder: [] };
  for (let i = 1; i <= count; i++) {
    root.projects[`p${i}`] = { ...base.projects.p1, name: `Project ${i}` };
    root.projectOrder.push(`p${i}`);
  }
  freeze(root);
  const next = renameProject(root, 'p1', 'Renamed');
  for (const id of root.projectOrder.slice(1)) assert.equal(next.projects[id], root.projects[id]);
  assert.equal(next.projects.p1.workspace, root.projects.p1.workspace);
}
console.log('[PASS] D11.project-commands-c identity, immutable commands and ID lifetime');
