/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { PARSE_KEY_PREFIX } from '../components/DecoderEditor/mappers';

/**
 * A parser expression the engine rejected, read from its error message.
 *
 * The engine answers with its whole parser trace: a `Main error: <reason> at <position>` line,
 * the expression it was reading, a caret line, then every alternative it tried. The trace never
 * names the field or the expression number, so those are found by matching the echoed expression
 * against the decoder that was sent.
 */
export interface ParseExpressionError {
  /** The engine's reason, without its trailing ` at <position>`. */
  reason: string;
  /** Zero-based character offset into `expression`. */
  position: number;
  expression: string;
  /** Where the expression sits in the decoder, when it could be found there. */
  location?: ParseExpressionLocation;
}

export interface ParseExpressionLocation {
  /** The field after `parse|`, for example `event.original`. */
  field: string;
  /** Zero-based index of the expression among the field's expressions. */
  expressionIndex: number;
  /** Zero-based index of the normalize entry, when the parser is inside one. */
  normalizeIndex?: number;
}

// `Main error: <reason> at <position>`, then the expression on the next line, then the caret line.
const MAIN_ERROR_PATTERN = /Main error: ([^\n]*?) at (\d+)\n([^\n]*)\n-*\^/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const findInParseKeys = (
  source: Record<string, unknown>,
  expression: string
): Omit<ParseExpressionLocation, 'normalizeIndex'> | undefined => {
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith(PARSE_KEY_PREFIX)) continue;
    const expressions = Array.isArray(value) ? value : [value];
    const expressionIndex = expressions.indexOf(expression);
    if (expressionIndex !== -1) {
      return { field: key.slice(PARSE_KEY_PREFIX.length), expressionIndex };
    }
  }
  return undefined;
};

/** Finds the expression among the decoder's parsers: the top-level ones first, then normalize. */
export const locateParseExpression = (
  document: unknown,
  expression: string
): ParseExpressionLocation | undefined => {
  if (!isPlainObject(document)) return undefined;

  const topLevel = findInParseKeys(document, expression);
  if (topLevel) return topLevel;

  const normalize = Array.isArray(document.normalize) ? document.normalize : [];
  for (let normalizeIndex = 0; normalizeIndex < normalize.length; normalizeIndex++) {
    const entry = normalize[normalizeIndex];
    const found = isPlainObject(entry) ? findInParseKeys(entry, expression) : undefined;
    if (found) return { ...found, normalizeIndex };
  }
  return undefined;
};

/** Reads a parser-expression failure out of an engine error; undefined for any other error. */
export const parseExpressionError = (
  message: unknown,
  document?: unknown
): ParseExpressionError | undefined => {
  if (typeof message !== 'string') return undefined;
  const match = MAIN_ERROR_PATTERN.exec(message);
  if (!match) return undefined;

  const [, reason, position, expression] = match;
  return {
    reason,
    position: Number(position),
    expression,
    location: locateParseExpression(document, expression),
  };
};

/** `Parsers > event.original, expression 1`, or `Normalize > entry 2 > Parsers > …` inside one. */
export const describeParseExpressionLocation = (location?: ParseExpressionLocation): string => {
  if (!location) return 'Parser expression';
  const parser = `Parsers > ${location.field}, expression ${location.expressionIndex + 1}`;
  return location.normalizeIndex === undefined
    ? parser
    : `Normalize > entry ${location.normalizeIndex + 1} > ${parser}`;
};

const describeCharacter = (expression: string, position: number): string => {
  if (position >= expression.length) return 'the end of the expression';
  const character = expression[position];
  return character === ' ' ? 'a space' : `"${character}"`;
};

/**
 * One line naming where the expression is and what failed, for example
 * `Parsers > event.original, expression 1: expected end of input at position 95, found "\"`.
 */
export const summarizeParseExpressionError = (error: ParseExpressionError): string => {
  const reason = error.reason.charAt(0).toLowerCase() + error.reason.slice(1);
  // Most engine reasons already say what they found; "Expected end of input" does not.
  const found = /\bfound\b/.test(reason)
    ? ''
    : `, found ${describeCharacter(error.expression, error.position)}`;
  return `${describeParseExpressionLocation(error.location)}: ${reason} at position ${
    error.position
  }${found}`;
};

/**
 * The part of the expression around the failing character, with a caret under it as the engine
 * prints it. Shipped expressions run past two hundred characters, so only `radius` characters on
 * each side are kept, and an ellipsis marks what was cut. The default fits a toast's width.
 */
export const markParseExpressionPosition = (error: ParseExpressionError, radius = 16): string => {
  const { expression, position } = error;
  const start = Math.max(0, position - radius);
  const end = Math.min(expression.length, position + radius + 1);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < expression.length ? '…' : '';
  const caretColumn = prefix.length + position - start;
  return `${prefix}${expression.slice(start, end)}${suffix}\n${' '.repeat(caretColumn)}^`;
};
