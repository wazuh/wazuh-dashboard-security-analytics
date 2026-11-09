/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  describeParseExpressionLocation,
  locateParseExpression,
  markParseExpressionPosition,
  parseExpressionError,
  summarizeParseExpressionError,
} from './parseExpressionError';

// The Apache pattern from the issue, copied with the YAML line-continuation backslashes.
const BROKEN_EXPRESSION =
  '[<event.start/ANSIC>] [<log.logger>:<log.level>] [pid <process.pid>(?:tid <process.thread.id>)]\\ \\ [client <source.address>(?:<source.port>)] <message>';

// The head of what the engine answered for it; the real message runs to 512 lines.
const ENGINE_MESSAGE = [
  "Engine validation failed. Failed to validate resource of type 'decoder': Validation failed for 'decoder': An error occurred while parsing a log: ",
  'Main error: Expected end of input at 95',
  BROKEN_EXPRESSION,
  `${'-'.repeat(95)}^`,
  '',
  'List of errors:',
  'L&R, L failed at 0',
  BROKEN_EXPRESSION,
  '^',
  "Expected one of '<', found '[' at 0",
  BROKEN_EXPRESSION,
  '^',
  '',
  'Detailed trace:',
  '└─L<<R, R failed at 95',
].join('\n');

describe('parseExpressionError', () => {
  it('reads the reason, position and expression of the main error', () => {
    expect(parseExpressionError(ENGINE_MESSAGE)).toEqual({
      reason: 'Expected end of input',
      position: 95,
      expression: BROKEN_EXPRESSION,
      location: undefined,
    });
  });

  it('finds the expression among the top-level parsers', () => {
    const document = {
      name: 'decoder/apache-error/0',
      'parse|log.original': ['<message>'],
      'parse|event.original': ['<~/literal/x> <message>', BROKEN_EXPRESSION],
    };

    expect(parseExpressionError(ENGINE_MESSAGE, document)?.location).toEqual({
      field: 'event.original',
      expressionIndex: 1,
    });
  });

  it('returns undefined for errors that are not a parser failure', () => {
    expect(parseExpressionError('Integration [abc] not found.')).toBeUndefined();
    expect(parseExpressionError(undefined)).toBeUndefined();
    expect(parseExpressionError({ message: ENGINE_MESSAGE })).toBeUndefined();
  });
});

describe('locateParseExpression', () => {
  it('finds the expression inside a normalize entry', () => {
    const document = {
      'parse|event.original': ['<message>'],
      normalize: [{ map: [] }, { 'parse|message': BROKEN_EXPRESSION }],
    };

    expect(locateParseExpression(document, BROKEN_EXPRESSION)).toEqual({
      field: 'message',
      expressionIndex: 0,
      normalizeIndex: 1,
    });
  });

  it('returns undefined when the decoder does not hold the expression', () => {
    expect(
      locateParseExpression({ 'parse|event.original': ['<message>'] }, BROKEN_EXPRESSION)
    ).toBe(undefined);
    expect(locateParseExpression(null, BROKEN_EXPRESSION)).toBeUndefined();
  });
});

describe('describeParseExpressionLocation', () => {
  it('names the field and the one-based expression number', () => {
    expect(describeParseExpressionLocation({ field: 'event.original', expressionIndex: 0 })).toBe(
      'Parsers > event.original, expression 1'
    );
  });

  it('names the normalize entry for a parser inside one', () => {
    expect(
      describeParseExpressionLocation({ field: 'message', expressionIndex: 2, normalizeIndex: 0 })
    ).toBe('Normalize > entry 1 > Parsers > message, expression 3');
  });

  it('falls back to a generic label when the expression was not found', () => {
    expect(describeParseExpressionLocation(undefined)).toBe('Parser expression');
  });
});

describe('summarizeParseExpressionError', () => {
  it('names the expression, the position and the character found there', () => {
    const error = parseExpressionError(ENGINE_MESSAGE, {
      'parse|event.original': [BROKEN_EXPRESSION],
    })!;

    expect(summarizeParseExpressionError(error)).toBe(
      'Parsers > event.original, expression 1: expected end of input at position 95, found "\\"'
    );
  });

  it('keeps the found part of reasons that already carry one', () => {
    expect(
      summarizeParseExpressionError({
        reason: "Expected one of '<', found '['",
        position: 0,
        expression: '[<message>',
      })
    ).toBe("Parser expression: expected one of '<', found '[' at position 0");
  });

  it('names a space and the end of the expression in words', () => {
    const base = { reason: 'Expected end of input', expression: 'a b' };
    expect(summarizeParseExpressionError({ ...base, position: 1 })).toMatch(/found a space$/);
    expect(summarizeParseExpressionError({ ...base, position: 3 })).toMatch(
      /found the end of the expression$/
    );
  });
});

describe('markParseExpressionPosition', () => {
  it('puts the caret under the failing character of a short expression', () => {
    expect(
      markParseExpressionPosition({ reason: 'x', position: 4, expression: '<a> \\ <b>' })
    ).toBe('<a> \\ <b>\n    ^');
  });

  it('keeps only the characters around the position of a long expression', () => {
    const marked = markParseExpressionPosition(
      { reason: 'x', position: 95, expression: BROKEN_EXPRESSION },
      10
    );
    const [snippet, caret] = marked.split('\n');

    expect(snippet).toBe(`…${BROKEN_EXPRESSION.slice(85, 106)}…`);
    expect(snippet[caret.indexOf('^')]).toBe('\\');
  });
});
