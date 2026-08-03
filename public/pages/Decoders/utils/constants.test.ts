/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildDecodersSearchQuery } from './constants';

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

  it('escapes wildcard characters in the search text', () => {
    const query: any = buildDecodersSearchQuery('a*b?c');

    const idClause = query.bool.should.find((clause: any) => clause.wildcard?.['document.id']);
    expect(idClause.wildcard['document.id'].value).toBe('*a\\*b\\?c*');
  });

  it('requires at least one should clause to match', () => {
    const query: any = buildDecodersSearchQuery('syslog');
    expect(query.bool.minimum_should_match).toBe(1);
  });
});
