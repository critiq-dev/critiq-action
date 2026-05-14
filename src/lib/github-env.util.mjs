import { appendFileSync } from 'node:fs';

/**
 * Append a line to GITHUB_ENV so later steps see the variable.
 * @param {string} line e.g. KEY=value
 * @param {{ warn?: (msg: string) => void }} [opts]
 */
export function appendGithubEnv(line, opts = {}) {
  const ghEnv = process.env.GITHUB_ENV;
  if (!ghEnv) {
    (opts.warn ?? console.warn)('[critiq-action] GITHUB_ENV is not set; env line will not persist.');
    return;
  }
  appendFileSync(ghEnv, `${line}\n`, 'utf8');
}
