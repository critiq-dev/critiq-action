import { spawnSync } from 'node:child_process';

/** Keeps CI logs readable: no audit/funding banners, no npm WARN noise from transitive deps. */
const NPM_QUIET_FLAGS = ['--no-audit', '--no-fund', '--loglevel', 'error'];

/**
 * @param {string[]} args
 * @returns {string[]}
 */
function withQuietInstallFlags(args) {
  const [cmd, ...rest] = args;
  if (cmd === 'ci' || cmd === 'install') {
    return [cmd, ...NPM_QUIET_FLAGS, ...rest];
  }
  return args;
}

/**
 * @param {string[]} args
 * @param {{ cwd?: string; env?: Record<string, string | undefined>; log?: (msg: string) => void }} [opts]
 */
export function runNpm(args, opts = {}) {
  const dir = opts.cwd;
  if (!dir) {
    throw new Error('runNpm requires opts.cwd');
  }
  const argv = withQuietInstallFlags(args);
  opts.log?.(`npm ${argv.join(' ')} (cwd=${dir})`);
  const r = spawnSync('npm', argv, {
    cwd: dir,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}
