import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} cwd
 */
export function hasRootCliDependency(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return false;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const d = { ...pkg.dependencies, ...pkg.devDependencies };
  return Boolean(d['@critiq/cli']);
}
