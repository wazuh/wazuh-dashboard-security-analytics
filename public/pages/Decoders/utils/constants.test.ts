/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildDecodersSearchQuery, DECODERS_SEARCHABLE_FIELDS_LABEL } from './constants';

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

describe('buildDecodersSearchQuery', () => {
  it('returns a match_all query when the search text is empty', () => {
    expect(buildDecodersSearchQuery('')).toEqual({ match_all: {} });
    expect(buildDecodersSearchQuery('   ')).toEqual({ match_all: {} });
  });

  it('searches by document.id so decoders are findable by decoder id', () => {
    const query: any = buildDecodersSearchQuery('decoder-123');

    const idClause = query.bool.should.find((clause: any) => clause.wildcard?.['document.id']);
    expect(idClause).toEqual({
      wildcard: {
        'document.id': { value: '*decoder-123*', case_insensitive: true },
      },
    });
  });

  it('matches a partial title, which the indexer maps as keyword', () => {
    const query: any = buildDecodersSearchQuery('apache acc');

    expect(wildcardValue(query, 'document.metadata.title')).toBe('*apache acc*');
    expect(
      query.bool.should.some((clause: any) => clause.match_phrase?.['document.metadata.title'])
    ).toBe(false);
  });

  it('keeps the text-mapped description on match_phrase', () => {
    const query: any = buildDecodersSearchQuery('apache');

    expect(
      query.bool.should.find(
        (clause: any) => clause.match_phrase?.['document.metadata.description']
      )
    ).toEqual({ match_phrase: { 'document.metadata.description': 'apache' } });
  });

  it('requires at least one should clause to match', () => {
    const query: any = buildDecodersSearchQuery('syslog');
    expect(query.bool.minimum_should_match).toBe(1);
  });

  it('only names fields the query searches, or the server-side integration join', () => {
    const fields = searchedFields(buildDecodersSearchQuery('anything')).join(' ').toLowerCase();
    // Wazuh: DecodersService.fetchDecoderIdsByIntegrationName matches the text against
    // integration titles and folds the decoder ids in, so `integration` has no clause here.
    const serverJoined = ['integration'];

    labelledFields(DECODERS_SEARCHABLE_FIELDS_LABEL).forEach((named) => {
      if (serverJoined.includes(named)) return;
      expect(fields).toContain(named);
    });
  });
});
