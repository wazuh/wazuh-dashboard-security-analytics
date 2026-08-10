/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { applyEntityFilters, buildStatusFilter, escapeWildcard, mergeIdsClause } from './helpers';

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

describe('buildStatusFilter', () => {
  it('returns undefined for an unrecognized status value', () => {
    expect(buildStatusFilter('bogus' as any)).toBeUndefined();
  });

  it('returns undefined when status is not provided', () => {
    expect(buildStatusFilter(undefined)).toBeUndefined();
  });

  it('builds a plain term for status=disabled', () => {
    expect(buildStatusFilter('disabled')).toEqual({
      term: { 'document.enabled': false },
    });
  });

  it('builds an enabled-or-missing-field clause for status=enabled', () => {
    expect(buildStatusFilter('enabled')).toEqual({
      bool: {
        should: [
          { term: { 'document.enabled': true } },
          { bool: { must_not: { exists: { field: 'document.enabled' } } } },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('applyEntityFilters', () => {
  it('is byte-identical to the input query when no filters are selected', () => {
    const query = { bool: { should: [{ match_all: {} }], minimum_should_match: 1 } };
    expect(applyEntityFilters(query, {})).toEqual({
      bool: { must: [query], filter: [] },
    });
  });

  it('nests the original query under bool.must without mutating it', () => {
    const query = { bool: { should: [{ wildcard: { field: { value: '*a*' } } }] } };
    const result = applyEntityFilters(query, {});
    expect(result.bool.must[0]).toBe(query);
  });

  it('adds a missing-field-as-enabled clause to bool.filter for status=enabled', () => {
    const query = { match_all: {} };
    const result = applyEntityFilters(query, { status: 'enabled' });
    expect(result.bool.filter).toEqual([
      {
        bool: {
          should: [
            { term: { 'document.enabled': true } },
            { bool: { must_not: { exists: { field: 'document.enabled' } } } },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });

  it('adds a plain term clause to bool.filter for status=disabled', () => {
    const query = { match_all: {} };
    const result = applyEntityFilters(query, { status: 'disabled' });
    expect(result.bool.filter).toEqual([{ term: { 'document.enabled': false } }]);
  });

  it('adds an ids terms clause to bool.filter when integrationIds is provided', () => {
    const query = { match_all: {} };
    const result = applyEntityFilters(query, { integrationIds: ['id-1', 'id-2'] });
    expect(result.bool.filter).toEqual([{ terms: { 'document.id': ['id-1', 'id-2'] } }]);
  });

  it('combines status and integrationIds filters together, in order', () => {
    const query = { match_all: {} };
    const result = applyEntityFilters(query, { status: 'disabled', integrationIds: ['id-1'] });
    expect(result.bool.filter).toEqual([
      { term: { 'document.enabled': false } },
      { terms: { 'document.id': ['id-1'] } },
    ]);
  });

  it('does not add an ids clause when integrationIds is an empty array', () => {
    const query = { match_all: {} };
    const result = applyEntityFilters(query, { integrationIds: [] });
    expect(result.bool.filter).toEqual([]);
  });
});
