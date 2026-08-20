# Terminology

Wazuh-owned vocabulary for the security analytics UI. Upstream does not ship this
file, so it can grow without creating merge conflicts on syncs.

User-facing copy follows two rules: **one noun per concept, one verb per action.**

Before adding a label, a column header, a button, a tooltip or an empty state, check
the table below and reuse the canonical term. Adding a synonym is a regression even
when the new wording reads better on its own. The cost lands on the user, who has to
work out whether two words mean two different things.

## Canonical terms

The `Superseded` column lists wording that was actually in use and has been replaced,
not hypothetical alternatives. Treat it as the list of regressions to watch for in
review.

| Canonical term | Superseded | Applies to |
| --- | --- | --- |
| `View` | `Details` | The row action that opens an item. Pair it with the description `View <entity> details`. |
| `Edit` | None | The row action that opens an item for editing. Description: `Edit <entity>`. |
| `Delete` | `Remove` | The destructive row action. Description: `Delete <entity>`. Confirmation modals use `Delete` too. |
| `Rule level` | `Severity`, `Rule severity`, `Rule Severity`, `Rule severities`, `Rule level (severity)` | A rule's severity, from the rule's `level` field. Values render as `Critical` / `High` / `Medium` / `Low` / `Informational`. |
| `Rule status` | None | A rule's maturity, from the rule's `status` field (`experimental`, …). Distinct from `Status`. |
| `Status` | None | Whether an entity is enabled or disabled. |
| `Created` | `Date`, `Created at` | The creation timestamp. |
| `Modified` | `Last updated time` | The last-modification timestamp. |
| `Integration` | `Log type` | The unit that groups decoders, rules, KVDBs and filters. The `detector_type` wire field keeps its name; only its label changes. |
| `Space` | None | The active scope only: Draft, Test, Custom, Standard. |

## Capitalization in prose

`Security analytics` is not a proper noun with both words capitalized. In a sentence
it reads `security analytics`, and `Security analytics` only when it opens the
sentence. The app name in the navigation and the breadcrumb keeps its own casing.

Space names work the same way: `draft`, `test`, `custom` and `standard` are lowercase
in prose, and only capitalized when they open a sentence or name the selector button.
In the `How security analytics works` flyout they also go in italics, together with
the entity names, so a sentence about the model reads as a sentence and still marks
its terms.

## When to add an entity qualifier

Qualify a term **only when two same-named concepts can appear on the same screen.**

That is why `Rule status` keeps its qualifier: a rule's maturity and its enabled
state are both visible in the rule flyout. `Space`, `Integration`, `Title`,
`Author`, `Created`, `Modified` and `Description` in that same flyout do not. Do not
add a qualifier defensively; an unnecessary one is exactly what produces `Severity` in
one table and `Rule severity` in the next.

## `Space` in the detector domain

`Space` means the active scope, and nothing else. One exception is already established
and is correct: in the detector domain a detector's `source` **is** its space, with
exactly two possible values, `standard` and `custom`. See
`public/utils/detectorSource.ts`. Detectors have no space selector and are never
promoted between spaces, so the `Space` column on the detectors list and on the
detector's rule table is accurate and must not be renamed.

## Scope of this vocabulary

These rules apply to reachable UI. Several trees in this plugin are commented out of
the router or gated off by a flag, and they still contain superseded wording; they are
left untouched on purpose so the fork stays diff-friendly against upstream. Wording in
unreachable code is not a violation of this document, but any screen that gets
reactivated must be brought in line with it first.
