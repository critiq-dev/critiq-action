import { spawnSync } from 'node:child_process';

/**
 * @param {string[]} args
 * @param {{ cwd?: string; env?: Record<string, string | undefined>; log?: (msg: string) => void }} [opts]
 */
export function runNpm(args, opts = {}) {
  const dir = opts.cwd;
  if (!dir) {
    throw new Error('runNpm requires opts.cwd');
  }
  opts.log?.(`npm ${args.join(' ')} (cwd=${dir})`);
  const r = spawnSync('npm', args, {
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
