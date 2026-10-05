/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { FormikErrors } from 'formik';
import { DecoderFormModel } from './DecoderEditorFormModel';
import { FIELD_LABELS } from './labels';
import { PARSE_KEY_PREFIX } from './mappers';

/**
 * Routes schema errors onto form fields. Messages are keyed by document path,
 * which Formik also understands — except where the document uses field names as
 * keys, so the error attaches to the longest prefix that exists.
 */

/** `a.b[0].c` -> ['a','b','0','c'] */
export const pathSegments = (path: string): string[] =>
  path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment !== '');

const joinSegments = (segments: string[]): string =>
  segments.reduce((path, segment) => {
    if (path === '') return segment;
    return /^\d+$/.test(segment) ? `${path}[${segment}]` : `${path}.${segment}`;
  }, '');

/** Does this path exist in the form? */
const resolves = (values: unknown, segments: string[]): boolean => {
  let node: any = values;
  for (const segment of segments) {
    if (node === null || node === undefined) return false;
    if (Array.isArray(node)) {
      // `in`, so an out-of-range index fails rather than resolving to undefined.
      if (!/^\d+$/.test(segment) || !(Number(segment) in node)) return false;
      node = node[Number(segment)];
      continue;
    }
    if (typeof node !== 'object') return false;
    if (!(segment in node)) return false;
    node = node[segment];
  }
  return true;
};

/** The longest prefix of `path` that exists in `values`, or `''` if none does. */
export const nearestFormPath = (path: string, values: DecoderFormModel): string => {
  const segments = pathSegments(path);
  for (let length = segments.length; length > 0; length--) {
    const candidate = segments.slice(0, length);
    if (resolves(values, candidate)) return joinSegments(candidate);
  }
  return '';
};

// The validator single-quotes every path it names, so this is a lookup. A quoted
// token with no entry — a pattern, a value, a path inside `normalize` — is left be.
const QUOTED = /'([^']+)'/g;

const labelFor = (path: string): string | undefined =>
  path.startsWith(PARSE_KEY_PREFIX) ? 'Expressions' : FIELD_LABELS[path];

/** `'metadata.title' is required` -> `Title is required`. */
export const humanizeMessage = (message: string): string =>
  message.replace(QUOTED, (quoted, path) => labelFor(path) ?? quoted);

/**
 * `parse|<field>` is a document key, so no prefix of it exists in the form. Find
 * the parser row that produced it.
 */
const parserPath = (path: string, values: DecoderFormModel): string => {
  if (!path.startsWith(PARSE_KEY_PREFIX)) return '';
  const field = path.slice(PARSE_KEY_PREFIX.length).replace(/\[\d+\]$/, '');
  const index = values.parsers.findIndex((row) => row.field === field);
  return index === -1 ? '' : `parsers[${index}]`;
};

export interface RoutedErrors {
  /** Keyed by Formik path. */
  fields: Record<string, string>;
  /** No field to land on; shown in the form-level summary. */
  document: string[];
}

export const routeSchemaErrors = (
  schemaErrors: FormikErrors<Record<string, unknown>>,
  values: DecoderFormModel
): RoutedErrors => {
  const fields: Record<string, string> = {};
  const document: string[] = [];

  Object.entries(schemaErrors).forEach(([path, message]) => {
    if (typeof message !== 'string') return;

    const target = parserPath(path, values) || nearestFormPath(path, values);
    if (target === '') {
      document.push(humanizeMessage(message));
      return;
    }
    if (!fields[target]) fields[target] = humanizeMessage(message);
  });

  return { fields, document };
};

/** Errors for `field` or anything inside it, for a field rendered as one control. */
export const errorsUnder = (errors: Record<string, string>, field: string): string[] =>
  Object.entries(errors)
    .filter(
      ([path]) => path === field || path.startsWith(`${field}[`) || path.startsWith(`${field}.`)
    )
    .map(([, message]) => message);
