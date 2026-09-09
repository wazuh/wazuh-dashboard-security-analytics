# Terminology

Wazuh-owned vocabulary for the ruleset management UI. Upstream does not ship this
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
| `Ruleset management` | `Security Analytics`, `Security analytics` | The plugin itself. The app title, the root breadcrumb and the side-nav heading keep their `Ruleset Management` casing; the navigation group labels stay `Ruleset management`. In a sentence it reads `ruleset management`. |

## Capitalization in prose

`Ruleset management` is not a proper noun with both words capitalized. In a sentence
it reads `ruleset management`, and `Ruleset management` only when it opens the
sentence. The app name in the navigation and the breadcrumb keeps its own casing.

Space names work the same way: `draft`, `test`, `custom` and `standard` are lowercase
in prose, and only capitalized when they open a sentence or name the selector button.
In the `How ruleset management works` flyout they also go in italics, together with
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

## Labels in the decoder visual editor

The decoder visual editor labels every field the way the KVDB, filter and rule
editors label the same field: `Title`, `Author`, `Description`, `Documentation`,
`References`, `Supports`, `Name`, `Enabled`. A field shared with another editor is
never renamed just because its document key differs.

Fields with no counterpart elsewhere take the humanized form of their document key:
`Check`, `Map`, `Parsers`, `Normalize`, `Parents`, `Definitions`, `Compatibility`,
`ID`, `Expression`, `Expressions`, `Field`.

The one exception is the control that chooses between a `check` expression and a
`check` list: it is labelled **`Format`**, not `Type`. The filter form already uses
`Type` for a filter's pre-filter/post-filter stage, and the same noun meaning two
things on adjacent screens is exactly the regression this document exists to
prevent.

Entries of the `normalize` array are numbered from 1 — `Normalize 1`, `Normalize 2`
— following the `Map 1` / `Map 2` numbering the rules detection editor already uses
for its repeated sub-items. Do not call them steps, stages or blocks.
`Normalization` remains the navigation group that contains decoders, KVDBs, filters
and rules, and means nothing else.

`Visual Editor` and `YAML Editor` are the canonical labels for the two views, at
page level and at field level, matching the existing KVDB, filter and rule editors.

### The cost this accepts

Validation messages come from the JSON Schema via
`public/utils/jsonSchemaValidation.ts`, whose `instancePathToKey` renders paths as
`metadata.title`, `normalize[2].map`, `check[0]`. Those are document keys, so a
message names `metadata.title` while the field on screen says `Title`, and the
reader has to bridge the two. That was weighed against having one entity label its
fields differently from its three siblings, and cross-entity consistency won.

Keep the bridge short: a message is routed to the field it belongs to
(`errorRouting.ts`), so it renders *under that input* rather than in a list the
reader has to match up by name.
