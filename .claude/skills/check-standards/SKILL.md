---
name: check-standards
description: Run the same code-quality checks CI runs (Prettier format, ESLint, typecheck, and unit tests) over the current diff before pushing or marking a PR ready. Use before opening/updating a PR, when the user asks to verify standards, lint, format, or check that CI will pass.
---

# Check standards (mirror CI locally)

Runs, over the **changed files only**, the same gates CI applies on Wazuh Dashboard
PRs, so failures are caught before they burn CI minutes. Fix issues, then re-run
until clean.

The approach is generic; blocks marked **repo-specific** cover this repo's exact
commands (test runner, lint, typecheck).

## Workflow

```
- [ ] 1. Compute changed files vs the base branch
- [ ] 2. Prettier --check (autofix with --write)
- [ ] 3. ESLint (autofix with --fix)
- [ ] 4. Typecheck
- [ ] 5. Unit tests for the changed code
- [ ] 6. Report pass/fail summary
```

### 1. Compute changed files

Match how CI computes them (diff against the base branch, excluding deletions):

```bash
BASE=<version-branch>            # e.g. 5.0.0 — the PR base
git fetch origin "$BASE"
CHANGED=$(git diff --name-status --diff-filter=d "origin/$BASE"...HEAD | awk '{print $NF}')
CODE=$(echo "$CHANGED" | grep -E '\.[jt]sx?$' || true)   # js/jsx/ts/tsx only
echo "$CHANGED"
```

### 2. Prettier (format)

Formatting is enforced on commit via husky + lint-staged (`prettier --write`).
Check the changed files the same way CI/pre-commit would:

```bash
npx prettier $CHANGED --check --ignore-unknown
# autofix:
npx prettier $CHANGED --write --ignore-unknown
```

> **repo-specific (wazuh-dashboard-security-analytics):** there is **no local
> `.prettierrc`** — Prettier resolves config from the parent `wazuh-dashboard`
> checkout (`../../.prettierrc`). `.prettierignore` skips `*.md`, so don't expect
> Markdown to be reformatted.

### 3. ESLint

> **repo-specific (wazuh-dashboard-security-analytics):** ESLint config is
> `.eslintrc` (YAML) extending `@elastic/kibana`, and the lint script runs through
> the parent checkout (`node ../../scripts/eslint .`). Run it from this plugin's
> dir inside `wazuh-dashboard/plugins/<this-plugin>`:
>
> ```bash
> yarn lint            # lints the whole plugin
> yarn lint -- --fix   # autofix
> ```
>
> If you need to scope to changed files, `node ../../scripts/eslint $CODE` works
> too (the `@elastic/eslint-import-resolver-kibana` resolver needs the parent
> checkout's `node_modules`).

### 4. Typecheck

> **repo-specific (wazuh-dashboard-security-analytics):** there is **no `typecheck`
> script**. `tsconfig.json` extends `../../tsconfig.json`, so run it from inside
> the parent checkout:
>
> ```bash
> ../../node_modules/.bin/tsc --noEmit -p tsconfig.json
> ```

### 5. Unit tests (changed code)

> **repo-specific (wazuh-dashboard-security-analytics):** tests run from inside the
> `wazuh-dashboard` checkout at `plugins/<this-plugin>` (Jest is
> `../../node_modules/.bin/jest --config ./test/jest.config.js`). Bootstrap once
> (`yarn osd bootstrap` from the `wazuh-dashboard` root), then:
>
> ```bash
> yarn test:jest
> ```
>
> Scope for speed with a path/pattern (`yarn test:jest <path>`). Refresh snapshots
> only when the change intends to (`yarn test:jest:update-snapshots`).

Remember: unit tests are **colocated** (`*.test.ts` / `*.test.tsx` next to the
source, snapshots under `__snapshots__/`). New source files should ship with their
colocated test.

### 6. Report

Summarize each gate as pass/fail; if anything failed, list the offending files and
either fix them or explain what needs manual attention:

```
Prettier:  PASS
ESLint:    FAIL (2 files) → public/components/Foo/Foo.tsx, server/routes/bar.ts
Typecheck: PASS
Jest:      PASS
```

Only report "ready for review" once every applicable gate passes.
