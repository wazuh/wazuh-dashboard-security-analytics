/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { validateYamlSyntax } from '../../../../components/YamlForm';
import { CheckModel, DecoderFormModel, FieldValueRow, ParserRow } from './DecoderEditorFormModel';

/**
 * The blocking tier of validation: problems that mean **no document can be
 * produced at all**.
 *
 * The other tier — JSON Schema violations — only warns. The schema is downloaded
 * from `wazuh/wazuh` at install time and can be stale or resolved from a fallback
 * ref, so refusing to save on it would mean refusing decoders the engine would
 * accept. What is collected here is different in kind: text that does not parse, or
 * a value with no key to write it under.
 */

/** A row carrying a value but no field name cannot be written to the document. */
export const rowNeedsField = (row: FieldValueRow): boolean =>
  row.field.trim() === '' && row.value.trim() !== '';

const parserNeedsField = (row: ParserRow): boolean =>
  row.field.trim() === '' && row.expressions.some((expression) => expression.trim() !== '');

export interface StructuralErrors {
  /** Keyed by Formik path, so a field can show its own message. */
  fields: Record<string, string>;
  /** Problems with no single field to blame. */
  document: string[];
}

const collectRowErrors = (
  rows: FieldValueRow[],
  path: string,
  fieldLabel: string,
  into: Record<string, string>
) => {
  rows.forEach((row, index) => {
    if (rowNeedsField(row)) {
      into[`${path}[${index}]`] = `${fieldLabel} is required for this row`;
    }
  });
};

const collectCheckErrors = (check: CheckModel, path: string, into: Record<string, string>) => {
  if (check.mode === 'list') {
    collectRowErrors(
      check.rows.map((row) => ({ field: row.field, value: row.condition })),
      path,
      'field',
      into
    );
    return;
  }
  if (check.mode === 'yaml') {
    const syntaxError = validateYamlSyntax(check.raw);
    if (syntaxError) into[path] = `Invalid YAML: ${syntaxError}`;
  }
};

export const collectStructuralErrors = (values: DecoderFormModel): StructuralErrors => {
  const fields: Record<string, string> = {};
  const document: string[] = [];

  collectRowErrors(values.definitions, 'definitions', 'name', fields);
  collectCheckErrors(values.check, 'check', fields);

  values.parsers.forEach((row, index) => {
    if (parserNeedsField(row)) {
      fields[`parsers[${index}]`] = 'A parser needs the field it reads';
    }
  });

  values.normalize.forEach((entry, index) => {
    const path = `normalize[${index}]`;

    if (entry.raw !== undefined) {
      const syntaxError = validateYamlSyntax(entry.raw);
      if (syntaxError) fields[path] = `Invalid YAML: ${syntaxError}`;
      return;
    }

    collectCheckErrors(entry.check, `${path}.check`, fields);
    collectRowErrors(entry.map, `${path}.map`, 'field', fields);
    entry.parsers.forEach((row, rowIndex) => {
      if (parserNeedsField(row)) {
        fields[`${path}.parsers[${rowIndex}]`] = 'A parser needs the field it reads';
      }
    });
  });

  return { fields, document };
};

export const hasStructuralErrors = (errors: StructuralErrors): boolean =>
  Object.keys(errors.fields).length > 0 || errors.document.length > 0;
