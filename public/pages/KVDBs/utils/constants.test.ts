/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildKVDBsSearchQuery, KVDBS_SEARCHABLE_FIELDS_LABEL } from './constants';

const wildcardValue = (query: any, field: string) =>
  query.bool.should.find((clause: any) => clause.wildcard?.[field])?.wildcard[field].value;

// Wazuh: the search error callout names these fields as searchable, so each one must
// appear in the query the builder produces.
const searchedFields = (query: any): string[] =>
  query.bool.should.flatMap((clause: any) => Object.keys(clause.wildcard ?? clause.match_phrase));

const labelledFields = (label: string): string[] =>
  label
    .split(/,| or /)
    .map((part) => part.trim().replace(/\s+/g, ''))
    .filter(Boolean);

describe('buildKVDBsSearchQuery', () => {
  it('returns a match_all query when the search text is empty', () => {
    expect(buildKVDBsSearchQuery('')).toEqual({ match_all: {} });
    expect(buildKVDBsSearchQuery('   ')).toEqual({ match_all: {} });
  });

  it('matches a partial title without the user typing a wildcard', () => {
    const query: any = buildKVDBsSearchQuery('thre');

    expect(wildcardValue(query, 'document.metadata.title')).toBe('*thre*');
  });

  it('searches by id and author as substrings too', () => {
    const query: any = buildKVDBsSearchQuery('wazuh');

    expect(wildcardValue(query, 'document.id')).toBe('*wazuh*');
    expect(wildcardValue(query, 'document.metadata.author')).toBe('*wazuh*');
  });

  it('keeps the text-mapped description on match_phrase', () => {
    const query: any = buildKVDBsSearchQuery('threat intel');

    expect(
      query.bool.should.find(
        (clause: any) => clause.match_phrase?.['document.metadata.description']
      )
    ).toEqual({ match_phrase: { 'document.metadata.description': 'threat intel' } });
  });

  it('requires at least one should clause to match', () => {
    const query: any = buildKVDBsSearchQuery('lookup');
    expect(query.bool.minimum_should_match).toBe(1);
  });

  it('only names fields the query searches', () => {
    const fields = searchedFields(buildKVDBsSearchQuery('anything')).join(' ').toLowerCase();

    labelledFields(KVDBS_SEARCHABLE_FIELDS_LABEL).forEach((named) => {
      expect(fields).toContain(named);
    });
  });
});
