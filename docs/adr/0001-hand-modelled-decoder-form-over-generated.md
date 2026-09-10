# Hand-model the decoder grammar in the visual editor rather than generating a form from the JSON Schema

The decoder visual editor (issue #482) is written by hand against
`common/schemas/wazuh-decoders.schema.json` instead of being generated from it by a
schema-form library (`@rjsf`, `jsonforms`). The schema is 2.4 MB / ~69k lines, but
~99% of that is one definition — `_fieldsDecoder`, the ECS field catalog of ~4,639
leaf field names. The decoder *grammar* is small: `name`, `enabled`, `metadata`,
`parents`, `definitions`, `check`, `normalize`, plus `parse|<field>` pattern keys, with
`check` an expression-or-list union and `normalize` an array of blocks in five
`oneOf` shapes. Generating that would need custom widgets for every one of those
constructs — more code than writing the form, plus a dependency in a fork we keep
mergeable with upstream `security-analytics-dashboards-plugin`.

## Consequences

The schema is **not versioned in this repo**. `common/schemas/*.schema.json` is
gitignored and refetched on every `yarn install` and `prebuild`
(`scripts/build-tools/update-engine-schemas`) from `wazuh/wazuh` at the ref matching
`package.json`'s `wazuh.version`, falling back to `main`. A hand-written form is
therefore the first artifact in this plugin that encodes the grammar in TypeScript,
against a source of truth that can change with no diff and no review. Three things
bound that risk, and none of them should be removed without replacing it:

1. **The form is never the validator.** Ajv against the live downloaded schema stays
   the only gate. When the engine adds a construct, the editor cannot *author* it, but
   nothing invalid is produced and nothing is mis-validated.
2. **Unmodelled content is preserved, never dropped.** `mapDecoderToForm` splits the
   document into modelled fields plus an untouched remainder that `mapFormToDecoder`
   merges back. `normalize` — the one construct the issue calls "too complex to
   model" — is edited as YAML rather than as controls, so an entry this plugin does
   not recognize round-trips through the same mappers as any other. A decoder is
   never silently truncated by being opened in the visual editor.
3. **`schemaShape.test.ts` snapshots a distilled grammar fingerprint** — top-level
   keys, `metadata` keys and required sets, `name`'s pattern, the required-key sets of
   each `_normalizeBlock.oneOf` branch. Its committed snapshot is the only
   version-controlled record of the grammar in this repo, and CI (which runs
   `yarn osd bootstrap` before `test:jest`, so the real schema is present) fails with a
   diff when the engine changes shape. Expect it to occasionally fail on a PR that did
   not cause the change; that is the cost of not being blind to it.

The ECS field catalog is deliberately left unused for now. Field inputs are plain text
and a wrong name surfaces as a schema warning. Turning the catalog into typeahead
suggestions needs no model or schema change and is a clean follow-up.
