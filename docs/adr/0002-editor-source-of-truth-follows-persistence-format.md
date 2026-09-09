# Which editor mode is the source of truth follows what the backend persists

Entities in this plugin with a `Visual Editor` / `YAML Editor` toggle use one of two
sync models, and the choice is not arbitrary — it tracks the persistence format:

- **Rules** persist an **object** (`DataStore.rules.createRule(rule)`). Formik `values`
  are the only source of truth; the YAML view is derived on every render
  (`rule={mapFormToRule(props.values)}`) and edits parse back via `setValues`. Submit is
  mode-independent.
- **KVDBs and filters** persist a **YAML string** (`resourceYaml`). They keep the raw
  text alongside `values` and choose the submit payload by active mode
  (`mode === 'yaml' && rawKvdb ? rawKvdb : mapFormToYaml(values)`), because the user's
  exact text — comments and key order included — is what gets stored.

Decoders persist an **object**: `server/services/DecodersService.ts` builds
`{"resource":${documentJson},…}`, so comments and key order are already discarded on
save. Decoders therefore follow the Rules model — `values` are the document, the YAML
editor is a view of them, and submit always serializes `values` regardless of the
active mode.

Recorded because the two neighbouring Wazuh-owned pages do it the other way, and a
reader would reasonably assume decoders should match their nearest siblings. They
should not; they should match what their backend stores. A second source of truth
would buy nothing here and would import the divergence KVDBs and filters have, where
raw text edited into a parse error goes stale and is silently ignored at submit.

Consequence inherited from the Rules precedent: YAML that does not parse never reaches
`values`, so toggling back to the visual editor shows the last valid document and
discards the broken text. This was chosen over blocking the toggle, for consistency
with `RuleEditorForm`.
