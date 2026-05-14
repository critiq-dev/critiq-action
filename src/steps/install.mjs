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

const log = createLogger();
const cwd = resolveActionWorkspace(process.env.INPUT_WORKING_DIRECTORY);
const cliVer = (process.env.INPUT_CLI_VERSION ?? 'latest').trim() || 'latest';
const rulesVer = (process.env.INPUT_RULES_VERSION ?? 'latest').trim() || 'latest';
const runnerTemp = process.env.RUNNER_TEMP ?? '/tmp';
const npmPrefix = path.join(runnerTemp, 'critiq-action-npm');

const pkgJson = path.join(cwd, 'package.json');
if (existsSync(pkgJson)) {
  const declared = hasRootCliDependency(cwd);

  const lock = path.join(cwd, 'package-lock.json');
  const shrink = path.join(cwd, 'npm-shrinkwrap.json');
  if (existsSync(lock) || existsSync(shrink)) {
    runNpm(['ci'], { cwd, log });
  } else {
    runNpm(['install'], { cwd, log });
  }

  if (!declared) {
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
  }
} else {
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
}
