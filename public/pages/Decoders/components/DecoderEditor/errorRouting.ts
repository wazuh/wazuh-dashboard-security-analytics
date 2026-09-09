/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { FormikErrors } from 'formik';
import { DecoderFormModel } from './DecoderEditorFormModel';

/**
 * Routes JSON Schema validation errors onto form fields.
 *
 * `jsonSchemaValidation.formatValidationErrors` already keys its messages by
 * document path — `metadata.title`, `normalize[2].map`, `check[0]` — and Formik
 * reads exactly that syntax, so most keys are usable as field paths unchanged.
 *
 * The exception is the places where the document uses **field names as keys**.
 * A `map` entry `{ 'source.ip': '$ip' }` produces the error key
 * `normalize[2].map[0].source.ip`, which is not a path in the form model (the row
 * is `{ field, value }`). Rather than drop such an error, walk the key down to the
 * longest prefix that *does* resolve and attach it there — the row shows the error.
 *
 * Doing it by resolution rather than by a hard-coded list of known shapes means an
 * error at a path this editor has never heard of still lands on the nearest thing
 * the user can see, which matters because the schema is downloaded and can be
 * ahead of this code.
 */

/** Splits a Formik-style path into segments: `a.b[0].c` -> ['a','b','0','c']. */
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

/** Walks `segments` into `values`, returning false as soon as a step is missing. */
const resolves = (values: unknown, segments: string[]): boolean => {
  let node: any = values;
  for (const segment of segments) {
    if (node === null || node === undefined) return false;
    if (Array.isArray(node)) {
      // `in` rather than a plain index read: an out-of-range index must fail, or
      // an error on `map[3]` of an empty `map` would "resolve" to a row that is
      // not on screen.
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

/**
 * The longest prefix of `path` that exists in `values`, or `''` when even the
 * first segment does not (a document-level error, or a key this form has no field
 * for at all).
 */
export const nearestFormPath = (path: string, values: DecoderFormModel): string => {
  const segments = pathSegments(path);
  for (let length = segments.length; length > 0; length--) {
    const candidate = segments.slice(0, length);
    if (resolves(values, candidate)) return joinSegments(candidate);
  }
  return '';
};

export interface RoutedErrors {
  /** Errors that reached a field, keyed by Formik path. */
  fields: Record<string, string>;
  /**
   * Errors with no field to land on — shown in the form-level summary so they are
   * never silently swallowed.
   */
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

    const target = nearestFormPath(path, values);
    if (target === '') {
      document.push(message);
      return;
    }
    // First message wins, matching formatValidationErrors' own precedence.
    if (!fields[target]) fields[target] = message;
  });

  return { fields, document };
};
