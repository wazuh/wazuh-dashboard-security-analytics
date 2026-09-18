/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { buildEntitySearchQuery } from '../../../utils/entitySearchQuery';

export const KVDBS_PAGE_SIZE = 25;
export const KVDBS_SORT_FIELD = 'document.metadata.title';

// Wazuh: KVDBs previously sent the box through EuiSearchBar.Query.toESQuery, whose
// `simple_query_string` compares whole tokens against these `keyword` fields, so
// `thre` never matched `Threat intel lookup`. The strict schema
// (ENTITY_SEARCH_SCHEMA, in entitySearchBarFilters.ts) is shared as-is with
// Rules/Decoders, and getFreeText strips every `field:value` clause before this
// builder runs, so no structured-query capability is lost.
const KVDB_KEYWORD_SEARCH_FIELDS = [
  'document.id',
  'document.metadata.title',
  'document.metadata.author',
];

const KVDB_TEXT_SEARCH_FIELDS = ['document.metadata.description'];

// Wazuh: fields the free text matches, worded for the search error callout. Keep in
// step with KVDB_KEYWORD_SEARCH_FIELDS.
export const KVDBS_SEARCHABLE_FIELDS_LABEL = 'id, title or author';

export const buildKVDBsSearchQuery = (searchText: string) =>
  buildEntitySearchQuery(searchText, {
    keywordFields: KVDB_KEYWORD_SEARCH_FIELDS,
    textFields: KVDB_TEXT_SEARCH_FIELDS,
  });
