/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import YAML from 'yaml';
import { LosslessNumber, stringify as LosslessStringify } from 'lossless-json';
import { DecoderDocument } from '../../../../../types/Decoders';
import { mapYamlToLosslessObject, normalizeToStringArray } from '../../../../components/YamlForm';
import {
  CheckModel,
  CheckRow,
  DecoderFormModel,
  DecoderMetadataModel,
  FieldValueRow,
  NormalizeEntryModel,
  ParserRow,
  decoderEditorStateDefaultValue,
} from './DecoderEditorFormModel';

export const PARSE_KEY_PREFIX = 'parse|';

const isParseKey = (key: string): boolean => key.startsWith(PARSE_KEY_PREFIX);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A `{ field: value }` pair — the only shape `map` entries and `check` items take. */
const isSinglePair = (value: unknown): value is Record<string, unknown> =>
  isPlainObject(value) && Object.keys(value).length === 1;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * Renders a document value as editable text.
 *
 * Scalars go through YAML so a string that would otherwise re-parse as something
 * else survives the trip — `'true'` is written `"true"`, not `true`. Objects and
 * arrays are written as indented JSON, which is valid YAML, matching what the KVDB
 * content editor does.
 */
export const valueToText = (value: unknown): string => {
  if (value === undefined) return '';
  if (value instanceof LosslessNumber) return value.toString();
  if (isPlainObject(value) || Array.isArray(value)) {
    return LosslessStringify(value, null, 2) ?? '';
  }
  return YAML.stringify(value, { lineWidth: 0 }).trimEnd();
};

/** Parses edited text back to a document value, keeping numeric literals lossless. */
export const textToValue = (text: string): unknown => {
  if (text.trim() === '') return '';
  try {
    return mapYamlToLosslessObject<unknown>(text);
  } catch {
    // Unparseable text blocks submission (see the form's structural validation),
    // so carrying it through as a plain string is enough to avoid data loss here.
    return text;
  }
};

const pairsToRows = (items: unknown[]): FieldValueRow[] =>
  items.map((item) => {
    const [field, value] = Object.entries(item as Record<string, unknown>)[0];
    return { field, value: valueToText(value) };
  });

const rowsToPairs = (rows: FieldValueRow[]): Array<Record<string, unknown>> =>
  rows
    .filter((row) => row.field.trim() !== '')
    .map((row) => ({ [row.field.trim()]: textToValue(row.value) }));

/* -------------------------------------------------------------------------- */
/* check                                                                       */
/* -------------------------------------------------------------------------- */

export const checkToModel = (check: unknown): CheckModel => {
  if (check === undefined) return { mode: 'none' };
  if (typeof check === 'string') return { mode: 'expression', expression: check };
  if (Array.isArray(check) && check.length > 0 && check.every(isSinglePair)) {
    const rows: CheckRow[] = check.map((item) => {
      const [field, condition] = Object.entries(item as Record<string, unknown>)[0];
      return { field, condition: valueToText(condition) };
    });
    return { mode: 'list', rows };
  }
  // Neither branch of `_check` — carry it verbatim rather than lose it.
  return { mode: 'yaml', raw: YAML.stringify(check, { lineWidth: 0 }).trimEnd() };
};

export const modelToCheck = (model: CheckModel): unknown => {
  switch (model.mode) {
    case 'none':
      return undefined;
    case 'expression':
      return model.expression;
    case 'list':
      return rowsToPairs(model.rows.map((row) => ({ field: row.field, value: row.condition })));
    case 'yaml':
      return textToValue(model.raw);
  }
};

/** True when a check holds nothing worth writing to the document. */
const isEmptyCheck = (model: CheckModel): boolean => {
  if (model.mode === 'none') return true;
  if (model.mode === 'expression') return model.expression.trim() === '';
  if (model.mode === 'yaml') return model.raw.trim() === '';
  return model.rows.every((row) => row.field.trim() === '');
};

/* -------------------------------------------------------------------------- */
/* parse|<field>                                                               */
/* -------------------------------------------------------------------------- */

const parseKeysToRows = (source: Record<string, unknown>): ParserRow[] =>
  Object.entries(source)
    .filter(([key]) => isParseKey(key))
    .map(([key, value]) => ({
      field: key.slice(PARSE_KEY_PREFIX.length),
      expressions: normalizeToStringArray(value as string[] | string | undefined),
    }));

const rowsToParseKeys = (rows: ParserRow[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  rows.forEach((row) => {
    const field = row.field.trim();
    if (!field) return;
    result[`${PARSE_KEY_PREFIX}${field}`] = row.expressions.filter(
      (expression) => expression.trim() !== ''
    );
  });
  return result;
};

/* -------------------------------------------------------------------------- */
/* normalize                                                                   */
/* -------------------------------------------------------------------------- */

const NORMALIZE_MODELLED_KEYS = new Set(['check', 'map']);

/**
 * True when this editor can render the entry without losing anything. An entry it
 * cannot render is carried as text **in place**, because `normalize` is sequential
 * and an entry that moved would change what the decoder does.
 */
export const isRenderableNormalizeEntry = (entry: unknown): entry is Record<string, unknown> => {
  if (!isPlainObject(entry)) return false;

  return Object.entries(entry).every(([key, value]) => {
    if (isParseKey(key)) return isStringArray(value);
    if (!NORMALIZE_MODELLED_KEYS.has(key)) return false;
    if (key === 'map') return Array.isArray(value) && value.every(isSinglePair);
    return true; // `check` always has a model, including its own yaml fallback
  });
};

export const normalizeEntryToModel = (entry: unknown): NormalizeEntryModel => {
  if (!isRenderableNormalizeEntry(entry)) {
    return {
      check: { mode: 'none' },
      parsers: [],
      map: [],
      raw: YAML.stringify(entry, { lineWidth: 0 }).trimEnd(),
    };
  }

  return {
    check: checkToModel(entry.check),
    parsers: parseKeysToRows(entry),
    map: Array.isArray(entry.map) ? pairsToRows(entry.map) : [],
  };
};

export const modelToNormalizeEntry = (model: NormalizeEntryModel): unknown => {
  if (model.raw !== undefined) return textToValue(model.raw);

  const entry: Record<string, unknown> = {};
  if (!isEmptyCheck(model.check)) entry.check = modelToCheck(model.check);
  Object.assign(entry, rowsToParseKeys(model.parsers));
  const map = rowsToPairs(model.map);
  if (map.length > 0) entry.map = map;
  return entry;
};

/* -------------------------------------------------------------------------- */
/* metadata                                                                    */
/* -------------------------------------------------------------------------- */

const metadataToModel = (metadata: unknown): DecoderMetadataModel => {
  const source = isPlainObject(metadata) ? metadata : {};
  return {
    title: typeof source.title === 'string' ? source.title : '',
    author: typeof source.author === 'string' ? source.author : '',
    description: typeof source.description === 'string' ? source.description : '',
    documentation: typeof source.documentation === 'string' ? source.documentation : '',
    references: normalizeToStringArray(source.references as string[] | string | undefined),
    supports: normalizeToStringArray(source.supports as string[] | string | undefined),
    compatibility: normalizeToStringArray(source.compatibility as string[] | string | undefined),
    date: typeof source.date === 'string' ? source.date : undefined,
    modified: typeof source.modified === 'string' ? source.modified : undefined,
  };
};

const METADATA_TEXT_KEYS = ['title', 'author', 'description', 'documentation'] as const;
const METADATA_LIST_KEYS = ['references', 'supports', 'compatibility'] as const;

const modelToMetadata = (
  model: DecoderMetadataModel,
  presentKeys: Set<string>
): Record<string, unknown> => {
  const metadata: Record<string, unknown> = {};

  METADATA_TEXT_KEYS.forEach((key) => {
    const value = model[key];
    if (value !== '' || presentKeys.has(key)) metadata[key] = value;
  });
  METADATA_LIST_KEYS.forEach((key) => {
    const value = model[key];
    if (value.length > 0 || presentKeys.has(key)) metadata[key] = value;
  });
  if (model.date !== undefined) metadata.date = model.date;
  if (model.modified !== undefined) metadata.modified = model.modified;

  return metadata;
};

/* -------------------------------------------------------------------------- */
/* document <-> form                                                           */
/* -------------------------------------------------------------------------- */

const ROOT_MODELLED_KEYS = new Set([
  'id',
  'name',
  'enabled',
  'metadata',
  'parents',
  'definitions',
  'check',
  'normalize',
]);

export const mapDecoderToForm = (document: unknown): DecoderFormModel => {
  if (!isPlainObject(document)) return { ...decoderEditorStateDefaultValue };

  const preserved: Record<string, unknown> = {};
  Object.entries(document).forEach(([key, value]) => {
    if (ROOT_MODELLED_KEYS.has(key) || isParseKey(key)) return;
    preserved[key] = value;
  });

  return {
    id: typeof document.id === 'string' ? document.id : undefined,
    name: typeof document.name === 'string' ? document.name : '',
    enabled: typeof document.enabled === 'boolean' ? document.enabled : true,
    parents: normalizeToStringArray(document.parents as string[] | string | undefined),
    metadata: metadataToModel(document.metadata),
    definitions: isPlainObject(document.definitions)
      ? Object.entries(document.definitions).map(([field, value]) => ({
          field,
          value: valueToText(value),
        }))
      : [],
    check: checkToModel(document.check),
    normalize: Array.isArray(document.normalize)
      ? document.normalize.map(normalizeEntryToModel)
      : [],
    parsers: parseKeysToRows(document),
    __preserved: preserved,
    __sourceKeys: {
      root: Object.keys(document),
      metadata: isPlainObject(document.metadata) ? Object.keys(document.metadata) : [],
    },
  };
};

export const mapFormToDecoder = (values: DecoderFormModel): DecoderDocument => {
  const rootPresent = new Set(values.__sourceKeys?.root ?? []);
  const metadataPresent = new Set(values.__sourceKeys?.metadata ?? []);

  const document: Record<string, unknown> = { ...values.__preserved };

  if (values.id !== undefined) document.id = values.id;
  document.name = values.name;
  document.enabled = values.enabled;
  document.metadata = modelToMetadata(values.metadata, metadataPresent);

  if (values.parents.length > 0 || rootPresent.has('parents')) {
    document.parents = values.parents.filter((parent) => parent.trim() !== '');
  }

  const definitions = values.definitions.filter((row) => row.field.trim() !== '');
  if (definitions.length > 0 || rootPresent.has('definitions')) {
    document.definitions = Object.fromEntries(
      definitions.map((row) => [row.field.trim(), textToValue(row.value)])
    );
  }

  if (!isEmptyCheck(values.check)) document.check = modelToCheck(values.check);

  Object.assign(document, rowsToParseKeys(values.parsers));

  if (values.normalize.length > 0 || rootPresent.has('normalize')) {
    document.normalize = values.normalize.map(modelToNormalizeEntry);
  }

  return document as DecoderDocument;
};
