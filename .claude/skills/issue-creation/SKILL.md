---
name: issue-creation
description: Create a well-formed GitHub issue in the Wazuh Dashboard security-analytics repo — pick the right issue template, run an issue-first duplicate check, and produce a ready-to-file body with the template's default labels. Use when the user asks to create, open, file, or draft an issue.
---

# Create a wazuh-dashboard-security-analytics issue

Pick the right issue template, check for duplicates first, then fill the
template verbatim and hand off a ready-to-file body.

## Workflow

Copy this checklist and track progress:

```
- [ ] 1. Classify intent → choose issue template (ask only if ambiguous)
- [ ] 2. Issue-first check: search existing issues for duplicates
- [ ] 3. Fill the chosen .github/ISSUE_TEMPLATE/*.md verbatim
- [ ] 4. Keep the template's default labels; add a triage label only if named
- [ ] 5. Emit the ready-to-file body + report (default stop; gh issue create only if asked)
```

### 1. Classify intent → choose template

Map the user's intent to a template. Ask the user only when genuinely
ambiguous between two rows.

| Intent | Template | Labels (from template frontmatter) |
|--------|----------|--------|
| Bug / defect report | `bug_report.md` | `bug, untriaged` |
| New feature / enhancement request | `feature_request.md` | `enhancement, untriaged` |
| Documentation gap or fix | `documentation-issue.md` | *(none — see note below)* |
| Engineering task / chore / technical improvement (not a bug, feature, or docs gap) | `task_template.md` | `level/task` |

### 2. Issue-first duplicate check

Before drafting, search for an existing issue covering the same problem:

```bash
gh issue list --search "<keywords>"
gh search issues "<keywords>" --repo wazuh/wazuh-dashboard-security-analytics
```

On a likely match, surface it to the user and ask whether to proceed with a
new issue or comment on the existing one instead.

### 3. Fill the template

Reference the chosen file under
[`.github/ISSUE_TEMPLATE`](../../../.github/ISSUE_TEMPLATE) — read it first and
fill it verbatim; do not inline template bodies in this skill.

> **repo-specific (wazuh-dashboard-security-analytics):** `bug_report.md`,
> `feature_request.md`, and `task_template.md` have full frontmatter (`name`,
> `about`, `title`, `labels`) and are shown as chooser cards with their default
> labels applied automatically. `bug_report.md`/`feature_request.md` use a
> `[BUG]`/`[FEATURE]` title prefix and bare `bug`/`enhancement` labels;
> `task_template.md` has an **empty** `title` (no prefix) and uses this repo's
> real `level/task` label instead — do not add a title prefix or swap in
> `task`/`untriaged` for it, that label doesn't exist here.
> `documentation-issue.md` has **no frontmatter
> at all** — no `name`/`about`/`title`/`labels` — so it applies no default
> labels and no title prefix; add a `documentation` label manually if the user
> wants one triaged as such. [`config.yml`](../../../.github/ISSUE_TEMPLATE/config.yml)
> only declares `contact_links` (OpenSearch community support, AWS/Amazon
> security reporting) — it does **not** set `blank_issues_enabled: false`, so
> blank issues remain allowed alongside the templates. Regardless of template,
> `.github/workflows/add-untriaged.yml` auto-applies the `untriaged` label to
> every new issue on open/reopen/transfer — so the actual end-state label set
> always includes `untriaged`, even for `documentation-issue.md`.

### 4. Labels

Keep the template's default labels as-is; add an extra triage label only if
the user explicitly names one. Do not invent labels or an approval workflow.

### 5. Emit the ready-to-file body + report

**Default deliverable — stop here.** Output the filled issue body plus a short
report for the human to review:

```
Issue pre-flight
- Template: <file>
- Labels: <label list>
- Duplicate check: no matches found / possible match: <issue-url>
- Command to open it: gh issue create --template <file> --label "<labels>"
```

Only run `gh issue create` when the user explicitly asks you to open the
issue.
