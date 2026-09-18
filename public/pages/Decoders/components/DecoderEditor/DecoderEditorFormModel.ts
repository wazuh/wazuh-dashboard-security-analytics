/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * The form model. Mirrors the document, except where the document uses field
 * names as keys — Formik splits paths on dots, and ECS names are full of them,
 * so `map`, `check` items and `parse|<field>` become `{ field, value }` rows.
 */

/** A `{ <field>: <value> }` pair, held as text so any value survives. */
export interface FieldValueRow {
  field: string;
  value: string;
}

/** A `{ <field>: <condition> }` item of a `check` list. */
export interface CheckRow {
  field: string;
  condition: string;
}

/**
 * `mode: 'yaml'` is content, not a view preference: the document held something
 * neither branch models, so the text is carried verbatim.
 */
export type CheckModel =
  | { mode: 'none' }
  | { mode: 'expression'; expression: string }
  | { mode: 'list'; rows: CheckRow[] }
  | { mode: 'yaml'; raw: string };

/** A `parse|<field>: [...]` key. */
export interface ParserRow {
  field: string;
  expressions: string[];
}

/** `raw` set means the entry is opaque and carried as text, in its position. */
export interface NormalizeEntryModel {
  check: CheckModel;
  parsers: ParserRow[];
  map: FieldValueRow[];
  raw?: string;
}

export interface DecoderMetadataModel {
  title: string;
  author: string;
  description: string;
  documentation: string;
  references: string[];
  supports: string[];
  compatibility: string[];
  /** Engine-owned: carried through a round trip, never edited here. */
  date?: string;
  modified?: string;
}

export interface DecoderFormModel {
  /** Engine-owned. Absent on create, read-only on edit. */
  id?: string;
  name: string;
  enabled: boolean;
  parents: string[];
  metadata: DecoderMetadataModel;
  definitions: FieldValueRow[];
  check: CheckModel;
  normalize: NormalizeEntryModel[];
  /** Top-level `parse|<field>` keys. */
  parsers: ParserRow[];
  /** Top-level keys this editor does not model, merged back on save. */
  __preserved: Record<string, unknown>;
  /** Which optional keys the loaded document had, so saving unchanged is a no-op. */
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
