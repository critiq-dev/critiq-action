import path from 'node:path';

/**
 * @param {string} cwd Repository working directory (contains node_modules when declared).
 */
export function resolveCritiqBin(cwd) {
  const fromEnv = process.env.CRITIQ_BIN?.trim();
  if (fromEnv) return fromEnv;
  return path.join(cwd, 'node_modules', '.bin', 'critiq');
}
