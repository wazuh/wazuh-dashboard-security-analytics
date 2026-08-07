/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildRulesSearchQuery } from './constants';

describe('buildRulesSearchQuery', () => {
  it('returns a match_all query when the search text is empty', () => {
    expect(buildRulesSearchQuery('')).toEqual({ match_all: {} });
    expect(buildRulesSearchQuery('   ')).toEqual({ match_all: {} });
  });

  it('searches by document.id so rules are findable by rule id', () => {
    const query: any = buildRulesSearchQuery('rule-123');

    const idClause = query.bool.should.find((clause: any) => clause.wildcard?.['document.id']);
    expect(idClause).toEqual({
      wildcard: {
        'document.id': { value: '*rule-123*', case_insensitive: true },
      },
    });
  });

  it('escapes wildcard characters in the search text', () => {
    const query: any = buildRulesSearchQuery('a*b?c');

    const idClause = query.bool.should.find((clause: any) => clause.wildcard?.['document.id']);
    expect(idClause.wildcard['document.id'].value).toBe('*a\\*b\\?c*');
  });

  it('requires at least one should clause to match', () => {
    const query: any = buildRulesSearchQuery('windows');
    expect(query.bool.minimum_should_match).toBe(1);
  });
});
