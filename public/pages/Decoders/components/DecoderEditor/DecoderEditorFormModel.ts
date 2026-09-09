/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * The decoder visual editor's form model.
 *
 * It is *hybrid*, not a straight mirror of the decoder document: isomorphic
 * wherever the document's keys are fixed (`name`, `metadata`, `parents`, the
 * `normalize` array and its indices), and `{ field, value }` rows wherever the
 * document uses **field names as keys** (`map` entries, `check` list items,
 * `parse|<field>`).
 *
 * That split is forced by Formik, which splits field paths on `.` and `[`. ECS
 * field names are full of dots, so an isomorphic `map` entry would give Formik
 * the path `normalize[0].map[0].source.ip` and it would build a nested object
 * `{ source: { ip } }` instead of the flat key the engine expects.
 *
 * See `errorRouting.ts` for how JSON Schema errors reach these rows, and
 * `docs/adr/0001-hand-modelled-decoder-form-over-generated.md` for why the
 * grammar is modelled by hand at all.
 */

/** One `{ <field>: <value> }` pair, held as text so any YAML/JSON value survives. */
export interface FieldValueRow {
  field: string;
  value: string;
}

/** One `{ <field>: <condition> }` item of a `check` list. */
export interface CheckRow {
  field: string;
  condition: string;
}

/**
 * `check` is `_check` in the schema: either a conditional expression string or a
 * list of single-pair objects.
 *
 * `mode: 'yaml'` is *content*, not a view preference — it means the document held
 * something neither branch models, and the raw text is carried verbatim so saving
 * cannot destroy it. Whether a *representable* check is being shown as YAML is UI
 * state and lives outside the form model.
 */
export type CheckModel =
  | { mode: 'none' }
  | { mode: 'expression'; expression: string }
  | { mode: 'list'; rows: CheckRow[] }
  | { mode: 'yaml'; raw: string };

/** One `parse|<field>: [<expression>, ...]` key of a normalize entry. */
export interface ParserRow {
  field: string;
  expressions: string[];
}

/**
 * One entry of `normalize`. The schema's five `_normalizeBlock.oneOf` shapes are
 * not modelled as five cases — they fall out of which sections are present.
 *
 * `raw` set means the entry as a whole is opaque: the document held a shape this
 * editor does not model, so it is carried as text **in its original position**.
 * `normalize` is sequential, so an entry that lost its index would change what the
 * decoder does.
 */
export interface NormalizeEntryModel {
  check: CheckModel;
  parsers: ParserRow[];
  map: FieldValueRow[];
  raw?: string;
}

/** `metadata`, with every key the schema defines. */
export interface DecoderMetadataModel {
  title: string;
  author: string;
  description: string;
  documentation: string;
  references: string[];
  supports: string[];
  compatibility: string[];
  /** Engine-owned. Carried so a round trip preserves it; never edited here. */
  date?: string;
  /** Engine-owned. Carried so a round trip preserves it; never edited here. */
  modified?: string;
}

export interface DecoderFormModel {
  /** UUIDv4 owned by the engine. Absent on create, read-only on edit. */
  id?: string;
  name: string;
  enabled: boolean;
  parents: string[];
  metadata: DecoderMetadataModel;
  /** `definitions`: build-time typed macros, a flat map held as rows. */
  definitions: FieldValueRow[];
  check: CheckModel;
  normalize: NormalizeEntryModel[];
  /**
   * Top-level `parse|<field>` keys, which the schema allows alongside `normalize`.
   */
  parsers: ParserRow[];
  /**
   * Every top-level key this editor does not model, carried untouched and merged
   * back on save. Normally empty — it exists because the schema is downloaded at
   * install time and can be ahead of this code.
   */
  __preserved: Record<string, unknown>;
  /**
   * Which optional keys the loaded document actually had. Used only to decide
   * whether to write a key back when its value is empty, so that opening a
   * decoder and saving it unchanged produces the same document — an explicit
   * `references: []` stays, and a key that was never there is not invented.
   */
  __sourceKeys?: {
    root: string[];
    metadata: string[];
  };
}

export const emptyCheck: CheckModel = { mode: 'none' };

export const decoderEditorMetadataDefaultValue: DecoderMetadataModel = {
  title: '',
  author: '',
  description: '',
  documentation: '',
  references: [],
  supports: [],
  compatibility: [],
};

export const decoderEditorStateDefaultValue: DecoderFormModel = {
  name: '',
  enabled: true,
  parents: [],
  metadata: decoderEditorMetadataDefaultValue,
  definitions: [],
  check: emptyCheck,
  normalize: [],
  parsers: [],
  __preserved: {},
  __sourceKeys: { root: [], metadata: [] },
};

export const emptyNormalizeEntry = (): NormalizeEntryModel => ({
  check: emptyCheck,
  parsers: [],
  map: [],
});
