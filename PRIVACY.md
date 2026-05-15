# Privacy notice — Critiq GitHub Action

**Last updated:** May 15, 2026  
**Publisher:** Critiq ([`critiq-dev`](https://github.com/critiq-dev) on GitHub)

This notice describes how the **Critiq GitHub Action** (`critiq-dev/critiq-action`) and the **`@critiq/cli`** packages it installs handle information when you run the action in GitHub Actions. It applies to the Marketplace listing and CI use of this action. It does **not** replace the [Critiq website privacy policy](https://critiq.dev/privacy-policy), which covers critiq.dev and public docs only.

Critiq does **not** collect repository contents, findings, or pull request data on Critiq-operated servers when you use this action as documented. Processing happens on **your GitHub-hosted runner** unless you add your own steps that export data elsewhere.

---

## What runs where

| Location | What happens |
| --- | --- |
| **Your GitHub Actions runner** | Checkout, `npm` install, `critiq check` over your source tree, JSON report on disk, optional severity gate. |
| **npm registry** | Download of `@critiq/cli`, `@critiq/rules`, and your repo’s declared dependencies when the install step runs. npm’s terms and privacy policy apply to that registry. |
| **GitHub** | API calls using the workflow’s `GITHUB_TOKEN` when `comment-mode` is not `off` (review comments, optional summary comment, thread deduplication via REST/GraphQL). GitHub’s terms and privacy policy apply to data stored on GitHub. |
| **Critiq servers** | **No** upload of source code, findings, or PR content by this action. |

Job logs may include paths, rule IDs, severity counts, and finding summaries. Treat logs like other CI output in your org.

---

## Personal Data and GitHub

Under GitHub’s Marketplace terms, **Personal Data** can include information that identifies a GitHub user. This action may cause GitHub to process such data when you enable PR comments, for example:

- Repository and pull request metadata (number, SHAs, file paths, line numbers).
- Review comment bodies derived from scan findings (rule text, snippets referenced in messages).
- Data exposed to the action via `GITHUB_TOKEN` and the GitHub API within the permissions you grant.

Critiq **does not** receive that Personal Data from GitHub on your behalf. GitHub remains the platform; you control workflow `permissions` and tokens.

You are responsible for your organization’s policies on CI logs, fork workflows, and who can view Actions output and PR comments.

---

## What we do not do

- Sell Personal Data.
- Use Marketplace or GitHub Usage Data for advertising.
- Require a Critiq account or Critiq Cloud for this action.
- Send scan results to third-party analytics or Critiq-hosted backends (beyond npm and GitHub as above).

The action’s install/scan steps do not call Critiq-operated APIs. Log output may include a link to [https://critiq.dev](https://critiq.dev) in the banner; that is display-only and does not transmit repository data.

---

## npm and supply chain

When the action installs packages from npm, npm (and your network path to the registry) may log client metadata according to npm’s policies. Pin `cli-version` and `rules-version`, or declare `@critiq/cli` and `@critiq/rules` in your repo’s `package.json`, for reproducible installs.

---

## Retention

- **Runner:** Ephemeral; GitHub deletes the runner environment after the job unless you persist artifacts in later steps.
- **GitHub:** PR comments and workflow history are retained per your repository and GitHub settings until you or GitHub delete them.
- **Critiq:** We do not store your CI scan data from this action.

---

## Your choices

- Set `comment-mode: off` to scan without posting GitHub review comments.
- Restrict `permissions` to the minimum your workflow needs.
- Pin the action to a commit SHA and pin npm package versions.

---

## Subprocessors

For this action, relevant third-party services are typically **GitHub** (hosting, API, Actions) and **npm** (package distribution). Your use of GitHub Actions is also subject to GitHub’s [Terms of Service](https://docs.github.com/site-policy/github-terms/github-terms-of-service) and [Data Protection Addendum](https://docs.github.com/site-policy/privacy-policies/github-data-protection-agreement) where applicable.

---

## Contact and requests

- **Support and bugs:** [GitHub Issues — critiq-dev/critiq-action](https://github.com/critiq-dev/critiq-action/issues)
- **Privacy requests** (access, correction, deletion where applicable): open an issue on that repository or contact Critiq via the channels listed at [critiq.dev](https://critiq.dev) and the [`critiq-dev`](https://github.com/critiq-dev) organization.

We may update this notice by committing to this repository; the date above will change when we do.
