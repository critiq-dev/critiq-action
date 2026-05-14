#!/usr/bin/env node
/**
 * Installs repo dependencies when package.json exists, then ensures Critiq CLI + rules:
 * — If root package.json declares @critiq/cli in dependencies or devDependencies, the lockfile
 *   install is enough; the workspace uses ./node_modules/.bin/critiq.
 * — Otherwise installs @critiq/cli and @critiq/rules from npm into RUNNER_TEMP and sets CRITIQ_BIN.
 */

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { appendGithubEnv } from '../lib/github-env.util.mjs';
import { createLogger } from '../lib/log.util.mjs';
import { runNpm } from '../lib/npm.util.mjs';
import { hasRootCliDependency } from '../lib/package-json.util.mjs';
import { resolveActionWorkspace } from '../lib/workspace.util.mjs';

const log = createLogger('Critiq install');
const cwd = resolveActionWorkspace(process.env.INPUT_WORKING_DIRECTORY);
const cliVer = (process.env.INPUT_CLI_VERSION ?? 'latest').trim() || 'latest';
const rulesVer = (process.env.INPUT_RULES_VERSION ?? 'latest').trim() || 'latest';
const runnerTemp = process.env.RUNNER_TEMP ?? '/tmp';
const npmPrefix = path.join(runnerTemp, 'critiq-action-npm');

log(`working directory: ${cwd}`);
log(`requested @critiq/cli@${cliVer}, @critiq/rules@${rulesVer}`);

const pkgJson = path.join(cwd, 'package.json');
if (existsSync(pkgJson)) {
  const declared = hasRootCliDependency(cwd);
  log(
    declared
      ? 'Root package.json declares @critiq/cli — will use repo install for the CLI.'
      : 'Root package.json does not declare @critiq/cli — will add published CLI + rules under RUNNER_TEMP after repo install.',
  );

  const lock = path.join(cwd, 'package-lock.json');
  const shrink = path.join(cwd, 'npm-shrinkwrap.json');
  if (existsSync(lock) || existsSync(shrink)) {
    log('Lockfile present — running npm ci.');
    runNpm(['ci'], { cwd, log });
  } else {
    log('No lockfile — running npm install.');
    runNpm(['install'], { cwd, log });
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
      { cwd, log },
    );
    const bin = path.join(npmPrefix, 'node_modules', '.bin', 'critiq');
    log(`Publishing-style CLI at: ${bin}`);
    appendGithubEnv(`CRITIQ_BIN=${bin}`, { warn: log });
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
    { cwd, log },
  );
  const bin = path.join(npmPrefix, 'node_modules', '.bin', 'critiq');
  appendGithubEnv(`CRITIQ_BIN=${bin}`, { warn: log });
  log(`CLI ready at: ${bin}`);
}

log('Install step finished.');
