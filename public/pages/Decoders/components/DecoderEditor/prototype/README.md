# PROTOTYPE — throwaway. Do not build on this.

Four renderings of the **decoder-specific** block (`definitions`, `check`,
`parse|<field>`, `normalize`), switchable via `?variant=` on the existing decoder
form route. Everything else on the form — `name`, `enabled` and the whole
`metadata` block — is byte-identical across all four, because those are already
consistent with the filter, KVDB and integration forms and are not in question.

Open the decoder form and append `&variant=<key>` (or use the floating bar at the
bottom of the screen; arrow keys work too):

| key        | name                | the idea |
| ---------- | ------------------- | -------- |
| `baseline` | Current             | What is on `5.0.0` today. The thing being judged against. |
| `steps`    | Pipeline steps      | `normalize` as `EuiSteps` — the sequence *is* the layout, so numbering and order stop needing their own furniture. |
| `tabs`     | Grammar tabs        | `EuiTabbedContent` splits Check / Parsers / Normalize, so only one concern is on screen at a time and the page stops being a tall stack. |
| `table`    | Summary + flyout    | `normalize` collapses to an `EuiBasicTable` of one-line summaries; editing opens an `EuiFlyout`. The form itself stays short. |
| `issue`    | Curated + YAML fallback | **What the issue actually proposes:** real controls for `check`, the top-level parsers and `definitions`, and `normalize` — the one genuinely complex construct — as a single YAML code block. Shortest form by far; the trade is that the user still hand-writes the part that does the work. |
| `outline`  | Outline, no cards   | **No panels at all.** `EuiDescribedFormGroup` puts each section's name and purpose in a left column and its controls in a right one, so hierarchy comes from typography and position instead of nested boxes. Normalize entries are separated by a single rule rather than wrapped individually. |

Measured container nesting, in each variant's default view (`EuiPanel` count and
maximum nesting depth, from a mounted two-entry decoder):

| variant | panels | max depth |
| --- | --- | --- |
| `baseline` | 3 | 2 |
| `steps` | 2 | 2 |
| `tabs` | 1 | 1 |
| `table` | 1 | 1 |
| `outline` | **0** | **0** |
| `issue` | 0 | 0 |

`tabs` and `table` understate: their entries sit behind an unselected tab and a
closed flyout, and reach depth 3 once opened. `outline` is the only one that is
card-free however you open it.

Only components already used elsewhere in this plugin are used here
(`EuiSteps` ×3, `EuiTabbedContent` ×4, `EuiBasicTable` ×11, `EuiFlyout` ×18,
`EuiBadge` ×19), with one deliberate exception: `EuiDescribedFormGroup` in
`outline` is new to this plugin, but it is EUI's own pattern for exactly this and
is what OpenSearch Dashboards uses for its settings forms. `EuiListGroup` and
`EuiSplitPanel` are avoided — nothing in the plugin uses them and neither earns
its way in.

The switcher renders only outside production builds.

## When a winner is picked

Fold it into `DecoderEditorForm.tsx` properly (this code has no tests and no error
handling), then delete this directory and the `variant` plumbing from
`DecoderFormPage.tsx` and `DecoderEditorForm.tsx`. The full set lives on the
throwaway branch, not on the version branch.

## Verification behind the copy

Every example and every claim in `../hints.tsx` was checked against the engine
schema with Ajv, not written from memory. What that turned up:

| checked | result |
| --- | --- |
| `map` / `check`-list **keys** | validated against the ECS catalog — an unknown name is rejected unless it starts with `_`. Stated on both fields, because it is the constraint users actually hit. |
| `map` **values** | **not validated at all.** `$parsed.ip` and even `total nonsense` are accepted. The hint is the only guidance, so its examples have to be resolvable. |
| `$parsed.ip` (earlier hint) | schema-valid but unresolvable — `parsed` is not a field and cannot be created, since custom names must start with `_`. Replaced with `$_parsed_ip`. |
| "definition names start with `_`" (earlier hint) | **false.** `definitions: { threshold: 5 }` is accepted. Claim removed. |
| `check` expression | needs a field reference *and* an operator, or a bare helper call. `$event.module` alone is rejected. |
| `normalize: []`, `definitions: {}` | **rejected** (`minItems`/`minProperties` is 1). This was a real bug in `mappers.ts`, which re-emitted `normalize: []` after the user deleted every entry. Fixed and covered by a test. |
| logpar grammar | **not verifiable.** The schema says only "List of parser expressions (e.g., logpar)", and there is no logpar example anywhere in this repository. `PARSE_HINT` therefore describes what the field does and shows no invented token syntax. **Someone who knows logpar should add a real example.** |

Also fixed while verifying:

- `MapRows` carried `style={{ height: '37px' }}`, copied from `KVDBContentEditor`.
  That is the *uncompressed* input height, so the inputs were not actually rendering
  compressed. Removed; EUI's 30–32px compressed sizing now applies.
- The check format selector was labelled `Type`, which is already the filter form's
  pre/post stage field. Renamed to `Format`.

## Shared refinements (apply to every variant)

These were fixed once, in the shared row editors, so no variant is judged on a flaw
another one doesn't have:

- **The YAML escape is an inline link, not a toggle per slot.** A three-entry decoder
  has seven slots; seven persistent two-button groups was most of what made the form
  feel busy, while the thing they switch is needed rarely. Now each slot carries a
  small `Edit <name> as YAML` link, matching how the rules detection editor offers
  its own escape. A slot that *cannot* be shown as a form offers no link at all —
  it is already in YAML and there is nowhere to go back to.
- **No accordions.** `euiAccordionForm` rules the top and bottom of every section
  and tightens padding; three stacked inside a panel read as clutter.
- **Compressed really means compressed** — see the `37px` note above.
- **One spacing rhythm:** `s` between repetitions of one thing, `m` between distinct
  fields, `l` between sections, `xs` between a label and its control. No component
  sets its own margins.

## Error timing

All variants now stay quiet until a field is left or submit is attempted, matching
the filter and KVDB forms. Those get it free from Formik's `touched`; these errors
come from the JSON Schema instead, so `touched.ts` applies the same gate by hand —
including for errors routed to a row inside a section the user has visited.

## Ordering by intent

The shipped form (`baseline`) lists `Definitions` **before** `Check`, but definitions
are build-time constants and are not part of the event's path. All three alternatives
order the block the way an event travels: **Check → Parsers → Normalize → Definitions**.
