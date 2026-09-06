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
