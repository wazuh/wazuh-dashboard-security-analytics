/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { escapeWildcard, mergeIdsClause } from './helpers';

describe('escapeWildcard', () => {
  it('escapes * and ? so they are treated as literals', () => {
    expect(escapeWildcard('a*b?c')).toBe('a\\*b\\?c');
  });

  it('leaves strings without wildcard characters untouched', () => {
    expect(escapeWildcard('windows-defender')).toBe('windows-defender');
  });
});

describe('mergeIdsClause', () => {
  it('returns the original query unchanged when there are no ids to merge', () => {
    const query = { match_all: {} };
    expect(mergeIdsClause(query, 'document.id', [])).toBe(query);
  });

  it('wraps a match_all query into a should clause with the ids', () => {
    const result = mergeIdsClause({ match_all: {} }, 'document.id', ['rule-1', 'rule-2']);
    expect(result).toEqual({
      bool: {
        should: [{ terms: { 'document.id': ['rule-1', 'rule-2'] } }],
        minimum_should_match: 1,
      },
    });
  });

  it('ORs the ids clause into an existing bool/should query', () => {
    const query = {
      bool: {
        should: [{ wildcard: { 'document.metadata.title': { value: '*win*' } } }],
        minimum_should_match: 1,
      },
    };

    const result: any = mergeIdsClause(query, 'document.id', ['rule-1']);

    expect(result.bool.should).toEqual([
      { wildcard: { 'document.metadata.title': { value: '*win*' } } },
      { terms: { 'document.id': ['rule-1'] } },
    ]);
    expect(result.bool.minimum_should_match).toBe(1);
  });

  it('wraps a non-bool query alongside the ids clause', () => {
    const query = { match_phrase: { 'document.metadata.description': 'foo' } };

    const result = mergeIdsClause(query, 'document.id', ['rule-1']);

    expect(result).toEqual({
      bool: {
        should: [query, { terms: { 'document.id': ['rule-1'] } }],
        minimum_should_match: 1,
      },
    });
  });
});
