// Design: D1.project-envelope-a, D2.project-envelope-a.boundary
// Pure desired-state transforms. No persistence, lifecycle, or market operations.
export const PROJECT_SCHEMA = 7;

function fail(code) {
  const error = new Error(code);
  error.name = 'ProjectStateError';
  error.code = code;
  throw error;
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validId(id) {
  if (typeof id !== 'string' || !/^p[1-9][0-9]*$/.test(id)
      || !Number.isSafeInteger(Number(id.slice(1)))) fail('INVALID_PROJECT_ID');
}

// Design: D6.project-envelope-a.api, D4.project-envelope-a.envelope
export function wrapWorkspaceJson(text, validateWorkspace) {
  if (typeof text !== 'string' || typeof validateWorkspace !== 'function') fail('INVALID_ARGUMENT');
  let workspace;
  try {
    workspace = JSON.parse(text, (_key, value) => {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error();
      return value;
    });
  } catch {
    fail('INVALID_JSON');
  }
  if (!object(workspace) || workspace.schemaVersion !== 6) fail('WORKSPACE_VERSION');
  let valid = false;
  try {
    valid = validateWorkspace(JSON.parse(JSON.stringify(workspace))) === true;
  } catch {
    fail('WORKSPACE_INVALID');
  }
  if (!valid) fail('WORKSPACE_INVALID');
  return {
    schemaVersion: PROJECT_SCHEMA,
    projectSeq: 2,
    activeProjectId: 'p1',
    projectOrder: ['p1'],
    projects: {
      p1: {
        name: '기본 프로젝트', enabled: true,
        props: { connectionRef: 'default', dataEnabled: true, automationEnabled: false },
        workspace,
      },
    },
  };
}

// Design: D6.project-envelope-a.api
export function projectWorkspacePath(projectId) {
  validId(projectId);
  return `projects/${projectId}/workspace`;
}

// Design: D6.project-envelope-a.api, D12.project-envelope-a.cost
export function selectProject(root, projectId) {
  if (!object(root) || root.schemaVersion !== PROJECT_SCHEMA || !object(root.projects)) fail('ROOT_INVALID');
  validId(projectId);
  if (!Object.hasOwn(root.projects, projectId)) fail('PROJECT_NOT_FOUND');
  if (root.projects[projectId]?.enabled !== true) fail('PROJECT_DISABLED');
  return root.activeProjectId === projectId ? root : { ...root, activeProjectId: projectId };
}

// Design: D6.project-envelope-b.api, D10.project-envelope-b.error-order
export function validateProjectEnvelopeJson(text, validateWorkspace) {
  const invalid = (code, path = '') => ({ ok: false, code, path });
  const keys = (value, names) => object(value) && Object.keys(value).length === names.length
    && names.every(name => Object.hasOwn(value, name));
  const idValid = id => typeof id === 'string' && id.trim() === id && /^p[1-9][0-9]*$/.test(id)
    && Number.isSafeInteger(Number(id.slice(1)));
  if (typeof text !== 'string' || typeof validateWorkspace !== 'function') return invalid('INVALID_ARGUMENT');
  let root;
  try {
    root = JSON.parse(text, (_, value) => {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error();
      return value;
    });
  } catch { return invalid('INVALID_JSON'); }
  if (!object(root)) return invalid('ROOT_TYPE');
  if (!keys(root, ['schemaVersion', 'projectSeq', 'activeProjectId', 'projectOrder', 'projects'])) return invalid('ROOT_KEYS');
  if (root.schemaVersion !== PROJECT_SCHEMA) return invalid('ROOT_VERSION', '/schemaVersion');
  if (!Number.isSafeInteger(root.projectSeq) || root.projectSeq < 2) return invalid('PROJECT_SEQ', '/projectSeq');
  if (!idValid(root.activeProjectId)) return invalid('PROJECT_ID', '/activeProjectId');
  if (!Array.isArray(root.projectOrder) || !root.projectOrder.length) return invalid('PROJECT_ORDER', '/projectOrder');
  const ids = new Set();
  let maxId = 0;
  for (const [index, id] of root.projectOrder.entries()) {
    if (!idValid(id)) return invalid('PROJECT_ID', `/projectOrder/${index}`);
    if (ids.has(id)) return invalid('PROJECT_DUPLICATE', `/projectOrder/${index}`);
    ids.add(id);
    maxId = Math.max(maxId, Number(id.slice(1)));
  }
  if (!keys(root.projects, root.projectOrder)) return invalid('PROJECT_MEMBERS', '/projects');
  if (root.projectSeq <= maxId) return invalid('PROJECT_SEQ', '/projectSeq');
  const names = new Set();
  let enabledCount = 0;
  for (const id of root.projectOrder) {
    const project = root.projects[id];
    const path = `/projects/${id}`;
    if (!keys(project, ['name', 'enabled', 'props', 'workspace'])) return invalid('PROJECT_SHAPE', path);
    const name = project.name;
    if (typeof name !== 'string' || name.trim() !== name || [...name].length < 1 || [...name].length > 32) {
      return invalid('PROJECT_NAME', `${path}/name`);
    }
    const nameKey = name.normalize('NFKC').toLowerCase();
    if (names.has(nameKey)) return invalid('PROJECT_NAME_DUPLICATE', `${path}/name`);
    names.add(nameKey);
    if (typeof project.enabled !== 'boolean') return invalid('PROJECT_ENABLED', `${path}/enabled`);
    if (project.enabled) enabledCount++;
    if (!keys(project.props, ['connectionRef', 'dataEnabled', 'automationEnabled'])) return invalid('PROJECT_PROPS', `${path}/props`);
    if (typeof project.props.connectionRef !== 'string' || project.props.connectionRef.trim() !== project.props.connectionRef
      || !/^[a-zA-Z0-9_-]{1,64}$/.test(project.props.connectionRef)) {
      return invalid('CONNECTION_REF', `${path}/props/connectionRef`);
    }
    for (const field of ['dataEnabled', 'automationEnabled']) {
      if (typeof project.props[field] !== 'boolean') return invalid('FLAG_TYPE', `${path}/props/${field}`);
    }
    if (!object(project.workspace) || project.workspace.schemaVersion !== 6) return invalid('WORKSPACE_VERSION', `${path}/workspace`);
  }
  if (!enabledCount) return invalid('NO_ENABLED_PROJECT', '/projects');
  if (!Object.hasOwn(root.projects, root.activeProjectId) || !root.projects[root.activeProjectId].enabled) {
    return invalid('ACTIVE_PROJECT', '/activeProjectId');
  }
  for (const id of root.projectOrder) {
    try {
      if (validateWorkspace(JSON.parse(JSON.stringify(root.projects[id].workspace)), id) === true) continue;
    } catch { /* Validator errors never expose document contents. */ }
    return invalid('WORKSPACE_INVALID', `/projects/${id}/workspace`);
  }
  return { ok: true, value: root };
}

// Design: D3.project-commands-c.types, D10.project-commands-c.errors
function commandRoot(root) {
  if (!object(root) || root.schemaVersion !== PROJECT_SCHEMA || !object(root.projects)) fail('ROOT_INVALID');
}
function commandTarget(root, projectId) {
  commandRoot(root);
  validId(projectId);
  if (projectId.trim() !== projectId) fail('INVALID_PROJECT_ID');
  if (!Object.hasOwn(root.projects, projectId)) fail('PROJECT_NOT_FOUND');
}
function commandName(root, name, exceptId) {
  if (typeof name !== 'string' || name.trim() !== name || [...name].length < 1 || [...name].length > 32) fail('PROJECT_NAME');
  const key = name.normalize('NFKC').toLowerCase();
  for (const id of root.projectOrder) {
    if (id !== exceptId && root.projects[id].name.normalize('NFKC').toLowerCase() === key) fail('PROJECT_NAME_DUPLICATE');
  }
}

// Design: D6.project-commands-c.api, D7.project-commands-c.algorithm
export function createProject(root, name, workspaceText, validateWorkspace) {
  commandRoot(root);
  commandName(root, name);
  if (root.projectSeq === Number.MAX_SAFE_INTEGER) fail('PROJECT_ID_EXHAUSTED');
  const project = wrapWorkspaceJson(workspaceText, validateWorkspace).projects.p1;
  const id = `p${root.projectSeq}`;
  return {
    ...root, projectSeq: root.projectSeq + 1, activeProjectId: id,
    projectOrder: [...root.projectOrder, id],
    projects: { ...root.projects, [id]: { ...project, name } },
  };
}

// Design: D6.project-commands-c.api, D7.project-commands-c.algorithm
export function renameProject(root, projectId, name) {
  commandTarget(root, projectId);
  commandName(root, name, projectId);
  const project = root.projects[projectId];
  if (project.name === name) return root;
  return { ...root, projects: { ...root.projects, [projectId]: { ...project, name } } };
}

// Design: D6.project-commands-c.api, D7.project-commands-c.algorithm
export function setProjectEnabled(root, projectId, enabled) {
  commandTarget(root, projectId);
  if (typeof enabled !== 'boolean') fail('PROJECT_ENABLED');
  const project = root.projects[projectId];
  if (project.enabled === enabled) return root;
  let activeProjectId = root.activeProjectId;
  if (!enabled) {
    const replacement = root.projectOrder.find(id => id !== projectId && root.projects[id].enabled);
    if (!replacement) fail('LAST_ENABLED_PROJECT');
    if (activeProjectId === projectId) activeProjectId = replacement;
  }
  return { ...root, activeProjectId, projects: { ...root.projects, [projectId]: { ...project, enabled } } };
}

// Design: D6.project-commands-c.api, D7.project-commands-c.algorithm
export function deleteProject(root, projectId) {
  commandTarget(root, projectId);
  const replacement = root.projectOrder.find(id => id !== projectId && root.projects[id].enabled);
  if (!replacement) fail('LAST_ENABLED_PROJECT');
  const projects = { ...root.projects };
  delete projects[projectId];
  return {
    ...root, projects, projectOrder: root.projectOrder.filter(id => id !== projectId),
    activeProjectId: root.activeProjectId === projectId ? replacement : root.activeProjectId,
  };
}
