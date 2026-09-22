/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildEntitySearchQuery } from './entitySearchQuery';

const FIELDS = {
  keywordFields: ['document.id', 'document.metadata.title'],
  textFields: ['document.metadata.description'],
};

const wildcardValue = (query: any, field: string) =>
  query.bool.should.find((clause: any) => clause.wildcard?.[field])?.wildcard[field].value;

describe('buildEntitySearchQuery', () => {
  it('returns a match_all query when there is no search text', () => {
    expect(buildEntitySearchQuery('', FIELDS)).toEqual({ match_all: {} });
    expect(buildEntitySearchQuery('   ', FIELDS)).toEqual({ match_all: {} });
    expect(buildEntitySearchQuery(undefined as any, FIELDS)).toEqual({ match_all: {} });
  });

  it('matches keyword fields as a case-insensitive substring', () => {
    const query: any = buildEntitySearchQuery('thre', FIELDS);

    expect(
      query.bool.should.find((clause: any) => clause.wildcard?.['document.metadata.title'])
    ).toEqual({
      wildcard: {
        'document.metadata.title': { value: '*thre*', case_insensitive: true },
      },
    });
  });

  it('keeps a multi-word query as a single literal substring', () => {
    expect(wildcardValue(buildEntitySearchQuery('apache access', FIELDS), 'document.id')).toBe(
      '*apache access*'
    );
  });

  it('matches text fields as a phrase, since a substring wildcard compares whole tokens', () => {
    const query: any = buildEntitySearchQuery('network traffic', FIELDS);

    expect(
      query.bool.should.find(
        (clause: any) => clause.match_phrase?.['document.metadata.description']
      )
    ).toEqual({
      match_phrase: { 'document.metadata.description': 'network traffic' },
    });
  });

  it('lets a typed * act as a wildcard', () => {
    expect(wildcardValue(buildEntitySearchQuery('apache*log', FIELDS), 'document.id')).toBe(
      '*apache*log*'
    );
  });

  it('escapes ? and backslashes so they stay literal', () => {
    expect(wildcardValue(buildEntitySearchQuery('a?b\\c', FIELDS), 'document.id')).toBe(
      '*a\\?b\\\\c*'
    );
  });

  it('requires at least one should clause to match', () => {
    const query: any = buildEntitySearchQuery('syslog', FIELDS);
    expect(query.bool.minimum_should_match).toBe(1);
  });

  it('emits no match_phrase clause when there are no text fields', () => {
    const query: any = buildEntitySearchQuery('syslog', { keywordFields: ['document.id'] });

    expect(query.bool.should).toHaveLength(1);
    expect(query.bool.should[0].match_phrase).toBeUndefined();
  });
});
