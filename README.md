# Critiq GitHub Action

Think of Critiq as an extra code reviewer that scans your project for bugs, security issues, performance problems, and risky changes before they turn into production incidents. Instead of only checking style, it focuses on the kinds of problems that usually slip through review and cause real trouble later. You run it locally or in CI, and it gives you deterministic findings you can act on before merging code.

It does this by parsing your code, matching it against a curated catalog of explicit rules, and reporting findings with concrete evidence tied to the code that triggered them. That means the output is based on repeatable checks for things like unsafe SQL, missing authorization, repeated IO in loops, and untested critical logic changes, not vague heuristics or style-only linting.

This action runs **[Critiq](https://www.npmjs.com/package/@critiq/cli)** on your PR and create **inline pull request review comments** so findings show on the diff of your PR.

This is a **composite action** from [`critiq-dev/critiq-action`](https://github.com/critiq-dev/critiq-action) on the **GitHub Marketplace**. It does not require Critiq Cloud, an account, or a paid product.

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

In **`working-directory`** (usually the repo root):

- If **`package.json` is present**, the action runs **`npm ci`** when a lockfile exists (`package-lock.json` or `npm-shrinkwrap.json`), otherwise **`npm install`**, so versions from your manifest and lockfile are used when `@critiq/cli` is already a dependency.
- If **`critiq` is still missing** from `node_modules/.bin` after that (for example the repo does not list `@critiq/cli`), the action runs **`npm install --no-save`** for `@critiq/cli` and `@critiq/rules` using your **`cli-version`** and **`rules-version`** inputs (default **`latest`**).
- If there is **no `package.json`**, it only runs that **`npm install --no-save`** step so Critiq is available without creating a manifest.

Your `package.json` is not rewritten; extra packages use `--no-save`.
Its recommended to add `@critiq/cli` and `@critiq/rules` and which will pin the version for a reproducible workflow.  

---

## Advanced configuration (optional)

If the repository contains **`.critiq/config.yaml`**, Critiq loads it automatically (presets, ignores, catalog tuning). Most teams start without it and add it when they need stricter presets or path-specific behavior. Details: [CLI reference](https://github.com/critiq-dev/critiq-core/blob/main/docs/reference/cli.md).

For specialized setups, you can set **`CRITIQ_RULES_ROOT`** in the job environment so the engine resolves the catalog from a directory on disk instead of only from `node_modules`.

---

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `node-version` | `24` | Node.js version for `actions/setup-node`. |
| `cli-version` | `latest` | npm dist-tag or semver for `@critiq/cli` when the action must install Critiq itself (see [How Critiq is installed](#how-critiq-is-installed)). |
| `rules-version` | `latest` | Same for `@critiq/rules` when a no-save install is required. |
| `working-directory` | `.` | Where installs and `critiq check` run (must be inside the git checkout). |
| `target` | `.` | Path passed to `critiq check`. |
| `base-ref` | *(empty)* | With `head-ref`, passes `--base` / `--head`. Leave both empty on `pull_request` to use the PR base and head SHAs. |
| `head-ref` | *(empty)* | See `base-ref`. |
| `staged` | `false` | When `true`, runs with `--staged` (not combinable with base/head). |
| `use-repository-scope` | `false` | When `true`, full-repository scan on `pull_request` (omits base/head). Affects which lines can receive inline comments; see [Pull request comments](#pull-request-comments). |
| `fail-on-severity` | `off` | Fail the job when any finding is at or above this severity: **`off`** (default), **`low`**, **`medium`**, **`high`**, **`critical`**. |
| `comment-mode` | `inline` | **`inline`** (default): review comments. **`inline+summary`**: comments plus one sticky **issue** comment with counts. **`off`**: scan and outputs only. |

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

On `pull_request`, the action posts **inline review comments** on the PR head commit unless **`comment-mode`** is **`off`**. GitHub only allows those comments on lines that appear in the **pull request diff**; the default diff-scoped run matches that. A full-repo scan (`use-repository-scope: true`) can surface findings on lines outside the diff; the comment step tolerates API errors so the workflow can still finish.

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

Optional inputs include **`checkout-layout`** (default **`single`**). Use **`checkout-layout: rules-with-sibling-core`** and **`working-directory: critiq-rules`** when the caller is **critiq-rules** (it checks out your repo under `critiq-rules/`, clones **critiq-dev/critiq-core**, builds it, then runs Critiq in that working directory so `file:../critiq-core/...` dependencies resolve).

```yaml
jobs:
  critiq:
    uses: critiq-dev/critiq-action/.github/workflows/reusable-critiq.yml@main
    secrets: inherit
    with:
      checkout-layout: rules-with-sibling-core
      working-directory: critiq-rules
      fail-on-severity: off
```

Pass through other inputs (`cli-version`, `rules-version`, `target`, `comment-mode`, `fail-on-severity`, `use-repository-scope`, `node-version`) the same way as in [`reusable-critiq.yml`](.github/workflows/reusable-critiq.yml).

---

## Contributors

| Path | Purpose |
| --- | --- |
| [`action.yml`](action.yml) | Composite action definition. |
| [`lib/post-review-comments.mjs`](lib/post-review-comments.mjs) | GitHub REST/GraphQL: create reviews, dedupe, optional summary comment. |
| [`lib/evaluate-fail-on-severity.mjs`](lib/evaluate-fail-on-severity.mjs) | Applies **`fail-on-severity`** after the scan. |
| [`.github/workflows/self-test.yml`](.github/workflows/self-test.yml) | CI for this repository. |

**Network:** runners contact **npm** (install) and **GitHub** (API). This action does not send data to other third-party endpoints.

---

## License

Apache-2.0 — see [`LICENSE`](LICENSE).
