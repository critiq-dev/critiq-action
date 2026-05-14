#!/usr/bin/env node
/**
 * Installs repo dependencies when package.json exists, then ensures Critiq CLI + rules:
 * — If root package.json declares @critiq/cli in dependencies or devDependencies, the lockfile
 *   install is enough; the workspace uses ./node_modules/.bin/critiq.
 * — Otherwise installs @critiq/cli and @critiq/rules from npm into RUNNER_TEMP and sets CRITIQ_BIN.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
const wdInput = (process.env.INPUT_WORKING_DIRECTORY ?? '.').trim() || '.';
const cwd = path.resolve(workspace, wdInput);
const cliVer = (process.env.INPUT_CLI_VERSION ?? 'latest').trim() || 'latest';
const rulesVer = (process.env.INPUT_RULES_VERSION ?? 'latest').trim() || 'latest';
const runnerTemp = process.env.RUNNER_TEMP ?? '/tmp';
const npmPrefix = path.join(runnerTemp, 'critiq-action-npm');
const ghEnv = process.env.GITHUB_ENV;

function log(msg) {
  console.log(`[Critiq install] ${msg}`);
}

function runNpm(args, opts = {}) {
  const dir = opts.cwd ?? cwd;
  log(`npm ${args.join(' ')} (cwd=${dir})`);
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

function hasRootCliDependency() {
  const pkgPath = path.join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return false;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const d = { ...pkg.dependencies, ...pkg.devDependencies };
  return Boolean(d['@critiq/cli']);
}

function appendEnv(line) {
  if (!ghEnv) {
    console.warn('[Critiq install] GITHUB_ENV is not set; CRITIQ_BIN will not persist.');
    return;
  }
  appendFileSync(ghEnv, `${line}\n`, 'utf8');
}

log(`working directory: ${cwd}`);
log(`requested @critiq/cli@${cliVer}, @critiq/rules@${rulesVer}`);

const pkgJson = path.join(cwd, 'package.json');
if (existsSync(pkgJson)) {
  const declared = hasRootCliDependency();
  log(
    declared
      ? 'Root package.json declares @critiq/cli — will use repo install for the CLI.'
      : 'Root package.json does not declare @critiq/cli — will add published CLI + rules under RUNNER_TEMP after repo install.',
  );

  const lock = path.join(cwd, 'package-lock.json');
  const shrink = path.join(cwd, 'npm-shrinkwrap.json');
  if (existsSync(lock) || existsSync(shrink)) {
    log('Lockfile present — running npm ci.');
    runNpm(['ci']);
  } else {
    log('No lockfile — running npm install.');
    runNpm(['install']);
  }

  if (!declared) {
    log(`Installing published packages under ${npmPrefix}`);
    mkdirSync(npmPrefix, { recursive: true });
    runNpm(
      [
        'install',
        '--prefix',
        npmPrefix,
        '--no-save',
        `@critiq/cli@${cliVer}`,
        `@critiq/rules@${rulesVer}`,
      ],
      { cwd },
    );
    const bin = path.join(npmPrefix, 'node_modules', '.bin', 'critiq');
    log(`Publishing-style CLI at: ${bin}`);
    appendEnv(`CRITIQ_BIN=${bin}`);
  } else {
    log('Using ./node_modules/.bin/critiq from the repository install.');
  }
} else {
  log('No package.json — installing only @critiq/cli and @critiq/rules from npm.');
  mkdirSync(npmPrefix, { recursive: true });
  runNpm(
    [
      'install',
      '--prefix',
      npmPrefix,
      '--no-save',
      `@critiq/cli@${cliVer}`,
      `@critiq/rules@${rulesVer}`,
    ],
    { cwd },
  );
  const bin = path.join(npmPrefix, 'node_modules', '.bin', 'critiq');
  appendEnv(`CRITIQ_BIN=${bin}`);
  log(`CLI ready at: ${bin}`);
}

log('Install step finished.');
