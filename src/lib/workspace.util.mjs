import path from 'node:path';

/**
 * Resolve working directory for Critiq runs (GITHUB_WORKSPACE + optional relative segment).
 * @param {string} [wdInput]
 */
export function resolveActionWorkspace(wdInput = '.') {
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const trimmed = (wdInput ?? '.').trim() || '.';
  return path.resolve(workspace, trimmed);
}
