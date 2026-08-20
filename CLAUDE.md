# CLAUDE.md

Wazuh-owned AI context for **`wazuh-dashboard-security-analytics`**. Keep it short:
this file points to the source-of-truth docs instead of duplicating them. Read the
linked doc before doing non-trivial work.

## What this repo is

A **single OpenSearch Dashboards (OSD) plugin** — the Wazuh fork of
[`opensearch-project/security-analytics-dashboards-plugin`](https://github.com/opensearch-project/security-analytics-dashboards-plugin).
It provides the **Security Analytics** UI in the Wazuh dashboard (rules, decoders,
integrations, filters, log test, detectors…). It is _not_ the platform — the
platform is the sibling repo `wazuh-dashboard` (an OSD fork), into which this
plugin is installed under its external `./plugins/` directory (alongside the
plugins from `wazuh-dashboard-plugins`).

- OSD id: `securityAnalyticsDashboards` (`opensearch_dashboards.json`); config
  path `opensearch_security_analytics`; package name
  `opensearch_security_analytics_dashboards`.
- Versioning: OSD base in `package.json` → `opensearchDashboards.version` (e.g.
  `3.6.0`) and `opensearch_dashboards.json` → `opensearchDashboardsVersion`;
  Wazuh version in `VERSION.json` and `package.json` → `wazuh` (e.g. `5.0.0`,
  revision `04`).
- Node/Yarn: this plugin has **no own `.nvmrc`** — it uses the toolchain of the
  `wazuh-dashboard` checkout it lives in (Node `22.22.0`, Yarn v1). Its scripts
  reference the parent checkout (`../../scripts/*`, `../../node_modules/.bin/*`),
  so it is developed **from inside `wazuh-dashboard/plugins/`**, not standalone.
- Default branch `main`; work happens on version branches (`5.0.0`, `6.0.0`, …).

## Architecture — read this before importing anything

This is one self-contained plugin. Its code splits into layers that are bundled
**separately**:

- **`public/`** — runs in the **browser** (React, EUI/OUI, `core.http`). Uses
  DOM/`window`. Holds `components/`, `pages/`, `hooks/`, `metrics/`, `models/`,
  `plugin.ts`, `security_analytics_app.tsx`.
- **`server/`** — runs in **Node.js** (Hapi routes under `/api/`, services,
  cluster clients). Uses `fs`, server context, secrets. Holds `routes/`,
  `services/`, `clusters/`, `models/`, `utils/`, `plugin.ts`.
- **`common/`** — **isomorphic** code shared by both: `constants.ts`,
  `helpers.ts`, `schemas/`. No DOM, no Node-only APIs.
- Plus `models/` and `types/` (shared TS types) and `config.ts` (plugin config
  schema, `@osd/config-schema`).

**Import rules (strict):**

1. `public/` must **never** import from `server/`, and `server/` must **never**
   import from `public/`. Putting Node code in a browser bundle (or vice-versa)
   breaks the build/runtime.
2. Both `public/` and `server/` may import from `common/`. Put anything shared in
   `common/`.
3. Cross-plugin access (e.g. to plugins from `wazuh-dashboard-plugins` or built-in
   OSD plugins) goes **layer-to-layer** (`public → other/public`,
   `server → other/server`) and only via a plugin's declared `setup()`/`start()`
   contracts + `requiredPlugins`/`optionalPlugins` in `opensearch_dashboards.json`
   — never reach into internal paths.

### How `public/` and `server/` communicate

They do **not** import each other — they talk over HTTP: `server/routes/*`
register endpoints (`/api/...`, validated with `@osd/config-schema`) that delegate
to services / cluster clients; `public/` calls those routes via OSD `core.http`.

### Plugin lifecycle

`setup(core, deps)` (register routes, saved objects, UI app, services) →
`start(core, deps)` → `stop()`. Use `core.getStartServices()` in mount handlers
instead of storing `start` references as fields.

## Commands — run from inside the `wazuh-dashboard` checkout

This plugin's scripts expect to run at `wazuh-dashboard/plugins/<this-plugin>`
(they call `../../scripts/*` and `../../node_modules/.bin/*`). Bootstrap the
platform first, then run per-plugin scripts here:

```bash
# From the wazuh-dashboard root (installs deps + builds internal packages):
yarn osd bootstrap

# From this plugin's dir (wazuh-dashboard/plugins/<this-plugin>):
yarn lint                 # node ../../scripts/eslint . (@elastic/kibana config)
yarn test:jest            # jest --config ./test/jest.config.js
yarn test:jest:dev        # jest --watch
yarn build                # plugin-helpers build → build/security-analytics-dashboards-*.zip
yarn cypress:run          # Cypress E2E (also: cypress:open)
```

There is **no** `format`, `lint:fix`, `typecheck`, or `knip` script here.
Formatting is enforced on commit by **husky + lint-staged** (`prettier --write`
on staged files; `.prettierignore` skips `*.md`). Prettier/tsconfig configs are
inherited from the parent OSD checkout (`../../.prettierrc`, `../../tsconfig.json`
via `tsconfig.json`'s `extends`). To typecheck manually:
`../../node_modules/.bin/tsc --noEmit -p tsconfig.json`.

### Running a local instance (Docker dev env)

This plugin has **no dev environment of its own**. The canonical way to bring up a
local Wazuh dashboard with this plugin — together with the other additional
single-plugin forks (`wazuh-dashboard-notifications`, `wazuh-dashboard-alerting`,
`wazuh-dashboard-reporting`) — is the Docker dev env **owned by
`wazuh-dashboard-plugins`** (`docker/osd-dev`). Mount this repo into it with `-r`:

```bash
# from the sibling wazuh-dashboard-plugins checkout:
cd ../wazuh-dashboard-plugins/docker/osd-dev
./dev.sh up --base --server-local 0601 --indexer-local 0601 \
  -r wazuh-dashboard-security-analytics \
  -r wazuh-dashboard-notifications \
  -r wazuh-dashboard-alerting
```

- `--base` — build/run the `wazuh-dashboard` platform from source (auto-detected
  from the sibling checkout; or `--base /abs/path`).
- `--server-local <tag>` — Wazuh server-local image tag (here `0601`).
- `--indexer-local <tag>` — packaged indexer image tag.
- `-r <repo>` — mount an external plugin repo (repeatable). Shorthand resolves the
  repo by name under the sibling parent dir (the parent of this checkout); or use
  `-r name=/abs/path`. Point to the repository **ROOT**, not a subfolder.
  `--all-forks` auto-discovers and mounts all sibling forks.

Run `./dev.sh --help` for all flags. OSD comes up on `https://0.0.0.0:5601`
(admin:admin).

## Code conventions

Enforced by tooling — run the linter/formatter, don't hand-format:

- ESLint config is `.eslintrc` (YAML) extending **`@elastic/kibana`**.
- **Filenames follow the upstream OpenSearch convention** (PascalCase for
  components, e.g. `ContentPanel.tsx`) — this differs from the kebab-case used in
  `wazuh-dashboard-plugins`. Match the surrounding upstream style when editing.
- TypeScript-first; single quotes; semicolons; Prettier defaults from the parent
  checkout.
- English everywhere (code, comments, commits, docs).
- **User-facing copy follows [`TERMINOLOGY.md`](TERMINOLOGY.md)** — one noun per
  concept, one verb per action. Read it before writing any label, column header,
  button, tooltip or empty state; introducing a synonym for an existing term is a
  regression. Wazuh-owned file, not upstream.

## Testing

- **Unit tests are colocated** as `*.test.ts` / `*.test.tsx` **next to** the
  source (many use jest snapshots under `__snapshots__/`). Run with
  `yarn test:jest`; update snapshots with `yarn test:jest:update-snapshots`.
  When you add a source file, add its test beside it.
- **Functional:** Cypress (`.cypress/`, `cypress.config.js`) via `yarn cypress:*`.

## Git / PR workflow

Shared Wazuh Dashboard conventions:

- Branch names: `<type>/<issue#>-<kebab-desc>` (`fix/`, `enhancement/`, `feat/`,
  `bug/`, `change/`, `doc/`). PR base = the target **version branch**, not always
  `main` — confirm it.
- **Sign commits** (DCO `--signoff`). Imperative, capitalized subject.
- Open PRs as **Draft** (CI skips drafts); run lint + tests locally, then "Ready
  for review". Squash merge for single-purpose PRs.
- UI changes require a screenshot/video in the PR (`### Results and Evidence`
  section of the [PR template](.github/PULL_REQUEST_TEMPLATE.md)); manual
  verification steps go in `### How to Test`.
- **Changelog:** maintain [`CHANGELOG.md`](CHANGELOG.md) by hand for user-facing
  changes; entries **link to the issue, not the PR**. No entry for
  `internal-devel-requests` issues or tooling/docs/test-only PRs.
- Issues arrive as URLs and may live in another repo. Issues from
  `internal-devel-requests` are internal: don't expose their link in the PR
  (leave the `## Description` closing reference empty, no `Closes #<issue_number>`)
  and add no CHANGELOG entry.

## Fork coexistence

Upstream is `opensearch-project/security-analytics-dashboards-plugin`. On upstream
syncs, **Wazuh content wins** and relevant upstream technical notes are folded
into the sections above. Keep this file Wazuh-owned.

## AI working rules

- Before proposing a PR: `yarn lint` + `yarn test:jest` pass for the touched code.
- Never weaken auth/CSP/security; never commit secrets or credentials.
- Never force-push shared branches; never commit without DCO sign-off.
- Respect the `public`/`server`/`common` import rules above — when in doubt, put
  shared code in `common/`.

## Source-of-truth docs

- [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md), [`README.md`](README.md),
  [`CONTRIBUTING.md`](CONTRIBUTING.md), [`RELEASING.md`](RELEASING.md),
  [`SECURITY.md`](SECURITY.md).
- Platform docs live in the sibling `wazuh-dashboard` repo
  (`DEVELOPER_GUIDE.md`, `src/core/CONVENTIONS.md`, `src/core/TESTING.md`).
