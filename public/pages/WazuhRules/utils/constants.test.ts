/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  buildRulesSearchQuery,
  RULES_FILTER_SELECTORS_LABEL,
  RULES_SEARCHABLE_FIELDS_LABEL,
  RULES_SEARCH_SCHEMA,
} from './constants';

// Wazuh: the search error callout names these fields as searchable, so each one must
// appear in the query the builder produces.
const searchedFields = (query: any): string[] =>
  query.bool.should.flatMap((clause: any) => Object.keys(clause.wildcard ?? clause.match_phrase));

const labelledFields = (label: string): string[] =>
  label
    .split(/,| or /)
    .map((part) => part.trim().replace(/\s+/g, ''))
    .filter(Boolean);

// Wazuh: #502 left rules declaring three filter fields while the copy named two
// selectors. One selector named per declared field.
const namedSelectors = (label: string): string[] =>
  label
    .split(/,| and /)
    .map((part) => part.trim())
    .filter(Boolean);

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

  it('matches a partial title', () => {
    const query: any = buildRulesSearchQuery('brute for');

    const titleClause = query.bool.should.find(
      (clause: any) => clause.wildcard?.['document.metadata.title']
    );
    expect(titleClause.wildcard['document.metadata.title'].value).toBe('*brute for*');
  });

  it('requires at least one should clause to match', () => {
    const query: any = buildRulesSearchQuery('windows');
    expect(query.bool.minimum_should_match).toBe(1);
  });

  it('only names fields the query searches, or the server-side integration join', () => {
    const fields = searchedFields(buildRulesSearchQuery('anything')).join(' ').toLowerCase();
    // Wazuh: WazuhRuleService.fetchRuleIdsByIntegrationName matches the text against
    // integration titles and folds the rule ids in, so `integration` has no clause here.
    const serverJoined = ['integration'];

    labelledFields(RULES_SEARCHABLE_FIELDS_LABEL).forEach((named) => {
      if (serverJoined.includes(named)) return;
      expect(fields).toContain(named);
    });
  });

  it('names integration, not the unsurfaced Sigma log source fields', () => {
    expect(RULES_SEARCHABLE_FIELDS_LABEL).toContain('integration');
    expect(RULES_SEARCHABLE_FIELDS_LABEL).not.toMatch(/log ?source/i);
  });

  it('names one selector per field its search schema declares', () => {
    expect(namedSelectors(RULES_FILTER_SELECTORS_LABEL)).toHaveLength(
      Object.keys(RULES_SEARCH_SCHEMA.fields).length
    );
  });

  it('names the rule level clause after the document field, not `severity`', () => {
    expect(RULES_SEARCH_SCHEMA.fields).toHaveProperty('level');
    expect(RULES_SEARCH_SCHEMA.fields).not.toHaveProperty('severity');
  });

  it('calls the rule level filter Rule level, the canonical term', () => {
    expect(RULES_FILTER_SELECTORS_LABEL).toContain('Rule level');
    expect(RULES_FILTER_SELECTORS_LABEL).not.toContain('Severity');
  });
});
