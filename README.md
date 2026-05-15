# Critiq GitHub Action

Think of Critiq as an extra code reviewer that scans your project for bugs, security issues, performance problems, and risky changes before they turn into production incidents. Instead of only checking style, it focuses on the kinds of problems that usually slip through review and cause real trouble later. You run it locally or in CI, and it gives you deterministic findings you can act on before merging code.

It does this by parsing your code, matching it against a curated catalog of explicit rules, and reporting findings with concrete evidence tied to the code that triggered them. That means the output is based on repeatable checks for things like unsafe SQL, missing authorization, repeated IO in loops, and untested critical logic changes, not vague heuristics or style-only linting.

This action runs **[Critiq](https://www.npmjs.com/package/@critiq/cli)** on your PR and create **inline pull request review comments** so findings show on the diff of your PR.

This is a **composite action** from [`critiq-dev/critiq-action`](https://github.com/critiq-dev/critiq-action) on the **GitHub Marketplace**. It does not require Critiq Cloud, an account, or a paid product.

**Legal (Marketplace):** [Privacy notice](PRIVACY.md) · [Terms of use](TERMS.md) · [Security](SECURITY.md) · [Support](#support)

---

## What this action does

Installs Critiq, runs **`critiq check`**, writes **JSON** to the runner, and on **`pull_request`** posts **review comments** (default `comment-mode: inline`). Set **`comment-mode: off`** if you only want the scan and outputs.

---

## Who this is for

- **Application and library teams** who want deterministic, versioned static checks in CI that stay aligned with the public [`@critiq/rules`](https://www.npmjs.com/package/@critiq/rules) catalog, without maintaining a separate rules engine.
- **Platform and developer-experience teams** who want feedback on the PR diff itself, not only logs or artifacts—so authors can fix issues before merge.
- **Security- and quality-conscious orgs** who prefer a narrow CLI surface, reproducible runs, and the option to **gate merges** by severity with **`fail-on-severity`** without changing workflow structure.
- **Teams new to Critiq** who want a low-friction path: add one workflow, keep defaults, and iterate on `.critiq` configuration only if they need more advance features.

---

## Add Critiq to your repository

### 1. Add a workflow file

Install from the Marketplace UI or reference the action directly. Example `.github/workflows/critiq.yml`:

```yaml
name: Critiq

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  critiq:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Critiq
        uses: critiq-dev/critiq-action@v1
        with:
          fail-on-severity: off
```

Use a **major tag** (`@v1`) or pin a **commit SHA** for supply-chain control.

### 2. Open a pull request and verify

On the **Actions** tab, confirm the workflow runs. With the default **`comment-mode: inline`**, Critiq adds **review comments** on flagged lines that appear in the PR diff (GitHub only allows comments on diff lines). Set **`comment-mode: off`** to skip posting; you still get `exit-code`, `finding-count`, and `json-path` for your own integrations.

### 3. Decide whether Critiq blocks merges

Use **`fail-on-severity`** (default **`off`**) so the job fails only when at least one finding is at or above the level you choose. Ordering is **low** → **medium** → **high** → **critical**; each threshold includes that level and every more severe one.

| Value | When the job fails |
| --- | --- |
| **`off`** (default) | Never fails for finding severity (comments still run when enabled). |
| **`low`** | Any finding with severity low, medium, high, or critical. |
| **`medium`** | Any finding with severity medium, high, or critical. |
| **`high`** | Any finding with severity high or critical. |
| **`critical`** | Only findings with severity critical. |

Example: block merges on high-and-above:

```yaml
        with:
          fail-on-severity: high
```

The check runs **after** the scan and PR comment step so feedback is still posted when comments are enabled.

---

## How Critiq is installed

The **Install** step runs [`src/main.mjs`](src/main.mjs) `install`, which loads [`src/steps/install.mjs`](src/steps/install.mjs) and logs each decision to the job log.

In **`working-directory`** (relative to `GITHUB_WORKSPACE`, usually the repo root):

- If **`package.json` exists**, the script runs **`npm ci`** when a lockfile exists, otherwise **`npm install`**.
- If the **root** `package.json` lists **`@critiq/cli`** in **`dependencies`** or **`devDependencies`**, the scan uses **`./node_modules/.bin/critiq`** from that install (rules come from your graph).
- If **`@critiq/cli` is not declared** on the root manifest (typical for monorepos that ship the CLI from a workspace), the script installs **`@critiq/cli`** and **`@critiq/rules`** from npm into **`RUNNER_TEMP/critiq-action-npm`** (versions from **`cli-version`** and **`rules-version`**, default **`latest`**) and sets **`CRITIQ_BIN`** so the scan does not pick up a workspace-linked binary by accident.
- If there is **no `package.json`**, it only runs that npm prefix install.

Your `package.json` is not rewritten; extra packages use **`--no-save`**. It is recommended to add **`@critiq/cli`** and **`@critiq/rules`** to **`package.json`** when you want a fully pinned, reproducible install graph.
---

## Advanced configuration (optional)

If the repository contains **`.critiq/config.yaml`**, Critiq loads it automatically (presets, ignores, catalog tuning). Most teams start without it and add it when they need stricter presets or path-specific behavior. Details: [CLI reference](https://github.com/critiq-dev/critiq-core/blob/main/docs/reference/cli.md).

For specialized setups, you can set **`CRITIQ_RULES_ROOT`** in the job environment so the engine resolves the catalog from a directory on disk instead of only from `node_modules`.

---

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `cli-version` | `latest` | npm dist-tag or semver for `@critiq/cli` when the root `package.json` does not declare `@critiq/cli` (see [How Critiq is installed](#how-critiq-is-installed)). |
| `rules-version` | `latest` | Same for `@critiq/rules` when the prefix install runs. |
| `working-directory` | `.` | Where installs and `critiq check` run (must be inside the git checkout). |
| `target` | `.` | Path passed to `critiq check`. |
| `base-ref` | *(empty)* | With `head-ref`, passes `--base` / `--head`. Leave both empty on `pull_request` to use the PR base and head SHAs. |
| `head-ref` | *(empty)* | See `base-ref`. |
| `staged` | `false` | When `true`, runs with `--staged` (not combinable with base/head). |
| `fail-on-severity` | `off` | Fail the job when any finding is at or above this severity: **`off`** (default), **`low`**, **`medium`**, **`high`**, **`critical`**. |
| `comment-mode` | `inline` | **`inline`** (default): review comments. **`inline+summary`**: comments plus one sticky **issue** comment with counts. **`off`**: scan and outputs only. |

Node.js is fixed at **24** (`actions/setup-node` in the root composite). Scan, install, post, and severity gate are separate Node entrypoints under [`src/steps/`](src/steps/), dispatched by [`src/main.mjs`](src/main.mjs), with shared helpers in [`src/lib/*.util.mjs`](src/lib/).
Posting review comments uses the job’s automatic **`GITHUB_TOKEN`**; set **`permissions.pull-requests: write`** on the workflow when using **`comment-mode`** **`inline`** or **`inline+summary`**.

---

## Outputs

| Output | Description |
| --- | --- |
| `exit-code` | Exit code from `critiq check`. |
| `finding-count` | Number of findings in the JSON report. |
| `json-path` | Absolute path to the captured JSON on the runner. |
| `review-comments-created` | Inline review comments created in the last run. |
| `review-comments-skipped` | Findings skipped by dedupe rules or missing location/fingerprint data. |

**Example — use outputs in the same job:**

```yaml
      - name: Run Critiq
        id: critiq
        uses: critiq-dev/critiq-action@v1

      - name: Report
        run: |
          echo "Critiq exit=${{ steps.critiq.outputs.exit-code }}"
          echo "Findings=${{ steps.critiq.outputs.finding-count }}"
```

---

## Monorepos and subpaths

Many repositories are a single package at the root: keep **`working-directory: .`** and **`target: .`**. In a **monorepo**, the same git checkout contains multiple packages: set **`working-directory`** to the package root where dependencies and `node_modules` should live (still under the git tree), and set **`target`** to the subtree you want analyzed (for example `packages/app` or `apps/web`) so `critiq check` scopes to that path while git metadata for diff scans comes from the repository root.

---

## Pull request comments

On `pull_request`, the action posts **inline review comments** on the PR head commit unless **`comment-mode`** is **`off`**. GitHub only allows those comments on lines that appear in the **pull request diff**; the default diff-scoped run matches that. On other events (for example **`push`**), `critiq check` runs without `--base` / `--head` (full tree scope for that checkout). The comment step tolerates API errors so the workflow can still finish.

### Deduplication and resolved threads

So reruns and resolves do not spam the PR:

1. **Marker** — Each Critiq comment includes a hidden HTML marker with the finding’s **`fingerprints.primary`** from the JSON report.
2. **Same line** — If any review comment already exists on the same **`path` + `line`** at the PR **head** commit, Critiq does not add another there.
3. **Resolved threads** — If that fingerprint appears in a **resolved** review thread (GraphQL), Critiq does not post that finding again.
4. **Open threads** — If the fingerprint already exists in an **unresolved** thread, the finding is skipped.

---

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| **Catalog / package resolution errors** | Confirm `npm install` / `npm ci` succeeded in `working-directory`, or set `CRITIQ_RULES_ROOT`. Check `cli-version` and `rules-version` when the no-save fallback runs. |
| **Diff scan misses commits** | Use `fetch-depth: 0` on checkout (or ensure base and head SHAs exist locally). |
| **No review comments** | Confirm `pull-requests: write`, `comment-mode` is not `off`, and findings map to lines in the **PR diff**. |
| **Job fails when you expected green** | Set **`fail-on-severity: off`**, raise the threshold (for example from `medium` to `high`), or fix findings; inspect `exit-code` and `finding-count`. |
| **You need SARIF or HTML** | Use `comment-mode: off` and run the CLI in a follow-up step, or consume `json-path` and transform. |

---

## Reusable workflow

This repo ships [`.github/workflows/reusable-critiq.yml`](.github/workflows/reusable-critiq.yml). Call it from another workflow in your org.

**Stable tag (after you publish a release):**

```yaml
jobs:
  critiq:
    uses: critiq-dev/critiq-action/.github/workflows/reusable-critiq.yml@v1
    secrets: inherit
```

**Testing on `main`:** call the reusable at `@main`. The workflow runs the composite from the **same ref baked into that commit** (currently `@main`; bump the `Run Critiq` step in `reusable-critiq.yml` to `@v1` when you cut a stable release so `@v1` callers stay consistent).

```yaml
jobs:
  critiq:
    uses: critiq-dev/critiq-action/.github/workflows/reusable-critiq.yml@main
    secrets: inherit
```

The reusable workflow checks out **only** the caller repository. Repositories that depend on a sibling **critiq-core** checkout (for example `file:../critiq-core/...` in `package.json`) should use a small local workflow: clone **critiq-dev/critiq-core**, build it, then run this action with the right **`working-directory`** (see **critiq-rules** `.github/workflows/critiq-pr.yml`).

Pass through inputs (`cli-version`, `rules-version`, `working-directory`, `target`, `comment-mode`, `fail-on-severity`) the same way as in [`reusable-critiq.yml`](.github/workflows/reusable-critiq.yml).

---

## Contributors

| Path | Purpose |
| --- | --- |
| [`action.yml`](action.yml) | Root composite: Node 24, then `src/main.mjs` steps `install`, `scan`, `post`, `fail-on-severity`. |
| [`src/main.mjs`](src/main.mjs) | Dispatches to `src/steps/<name>.mjs`. |
| [`src/steps/install.mjs`](src/steps/install.mjs) | Repo `npm ci` / `npm install` and optional published CLI + rules under `RUNNER_TEMP`. |
| [`src/steps/scan.mjs`](src/steps/scan.mjs) | `critiq check`, JSON file + `GITHUB_OUTPUT`. |
| [`src/steps/post.mjs`](src/steps/post.mjs) | PR comment orchestration; calls `src/lib/post-review-comments.mjs`. |
| [`src/steps/fail-on-severity.mjs`](src/steps/fail-on-severity.mjs) | Applies **`fail-on-severity`** after the scan. |
| [`src/lib/*.util.mjs`](src/lib/) | Shared helpers (GitHub output/env, workspace, npm, API client, severity, etc.). |
| [`src/lib/post-review-comments.mjs`](src/lib/post-review-comments.mjs) | GitHub REST/GraphQL: create reviews, dedupe, optional summary comment. |
| [`.github/workflows/self-test.yml`](.github/workflows/self-test.yml) | CI for this repository (`target: test/fixtures/minimal-repo`). |

**Network:** runners contact **npm** (install) and **GitHub** (API) only. Scanning runs on your runner; Critiq does not receive your repository or findings. See [Privacy notice](PRIVACY.md).

---

## Support

| Channel | Use for |
| --- | --- |
| [**GitHub Issues**](https://github.com/critiq-dev/critiq-action/issues) | Bugs, workflow help, feature requests for this action |
| [**Security**](SECURITY.md) | Vulnerability reports (use Security Advisories, not public issues) |
| [**critiq-dev**](https://github.com/critiq-dev) | Related OSS repos (`critiq-core`, `critiq-rules`) |

Support is best-effort via GitHub Issues; there is no paid SLA for this free Marketplace action.

---

## Privacy and data

- **Your code** is analyzed on the **GitHub Actions runner** in your account. Critiq does not operate a backend that receives your source or scan JSON from this action.
- **`GITHUB_TOKEN`** is used only to post PR comments when `comment-mode` is not `off`, within the workflow permissions you set.
- **npm** is used to install `@critiq/cli` and `@critiq/rules` (or your declared dependencies).

Full details: [**PRIVACY.md**](PRIVACY.md) (use this URL in your Marketplace listing).

---

## Terms of use

Use of this action is governed by [**TERMS.md**](TERMS.md) (end-user terms for the Marketplace product). The action’s **source code** is licensed under [**Apache-2.0**](LICENSE).

---

## License

Apache-2.0 — see [`LICENSE`](LICENSE). End-user terms for the published action are in [`TERMS.md`](TERMS.md).
