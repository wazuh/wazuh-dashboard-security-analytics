/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildEntitySearchQuery } from '../../../utils/entitySearchQuery';

const RULE_KEYWORD_SEARCH_FIELDS = [
  'document.id',
  'document.metadata.title',
  'document.metadata.author',
  'document.level',
  'document.logsource.category',
  'document.logsource.product',
  'document.logsource.service',
];

const RULE_TEXT_SEARCH_FIELDS = ['document.metadata.description'];

// Wazuh: fields the free text matches, worded for the search error callout. Keep in
// step with RULE_KEYWORD_SEARCH_FIELDS. `integration` is matched server-side, where
// WazuhRuleService.fetchRuleIdsByIntegrationName folds in rules whose integration
// title matches the text. `document.logsource.*` are Sigma fields the UI never
// surfaces; the user-facing term is Integration (TERMINOLOGY.md), so the label does
// not name them.
export const RULES_SEARCHABLE_FIELDS_LABEL = 'id, title, author, level or integration';

// Wazuh: Rules-only Rule level filter, a `field_value_selection` EuiSearchBar filter
// (multiSelect 'or') on `level`, matching `document.level` server-side. Decoders and
// KVDBs stay on the shared ENTITY_SEARCH_SCHEMA, since only rules have a level.
//
// `level` also names the URL param, the sort key and the column — keep them in sync
// if this clause is renamed.
export const RULES_SEARCH_SCHEMA = {
  strict: true,
  fields: {
    status: { type: 'string' },
    integration: { type: 'string' },
    level: { type: 'string' },
  },
};

export const RULES_FILTER_SELECTORS_LABEL = 'Status, Integration and Rule level';

export const buildRulesSearchQuery = (searchText: string) =>
  buildEntitySearchQuery(searchText, {
    keywordFields: RULE_KEYWORD_SEARCH_FIELDS,
    textFields: RULE_TEXT_SEARCH_FIELDS,
  });
