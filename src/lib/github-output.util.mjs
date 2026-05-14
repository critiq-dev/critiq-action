import { appendFileSync } from 'node:fs';

/**
 * @param {Iterable<[string, string | number]>} pairs
 */
export function writeGithubOutputPairs(pairs) {
  const ghOut = process.env.GITHUB_OUTPUT;
  if (!ghOut) return;
  for (const [k, v] of pairs) {
    const s = String(v).replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    appendFileSync(ghOut, `${k}=${s}\n`, 'utf8');
  }
}

/**
 * @param {string} name
 * @param {string | number} value
 */
export function setGithubOutput(name, value) {
  writeGithubOutputPairs([[name, value]]);
}
