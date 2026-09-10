/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { validateYamlSyntax } from '../../../../components/YamlForm';
import { CheckModel, DecoderFormModel, FieldValueRow, ParserRow } from './DecoderEditorFormModel';

/**
 * The blocking tier: problems that mean no document can be produced.
 *
 * Schema violations only warn — the schema is downloaded at install time and can
 * be stale, so refusing on it would refuse decoders the engine accepts.
 */

/** A value with no field name cannot be written. */
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

  return { fields, document };
};

export const hasStructuralErrors = (errors: StructuralErrors): boolean =>
  Object.keys(errors.fields).length > 0 || errors.document.length > 0;
