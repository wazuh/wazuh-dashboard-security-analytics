/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const KVDBS_PAGE_SIZE = 25;
export const KVDBS_SORT_FIELD = 'document.metadata.title';

// Wazuh: KVDBs search goes through EuiSearchBar/toESQuery (see
// useIntegrationKVDBs.ts and KVDBs.tsx).

export const KVDBS_SEARCH_SCHEMA = {
  strict: true,
  fields: {
    'document.metadata.author': {
      type: 'string',
    },
    'document.metadata.date': {
      type: 'date',
    },
    'document.enabled': {
      type: 'boolean',
    },
    'document.id': {
      type: 'string',
    },
    'document.metadata.references': {
      type: 'string',
    },
    'document.metadata.title': {
      type: 'string',
    },
    // Wazuh: neither `status` nor `integration` are real KVDB document fields —
    // both are stripped out and resolved to explicit filters (a term on
    // document.enabled, and a document.id terms clause from a name->ids lookup)
    // client-side before the query reaches EuiSearchBar's toESQuery (see
    // KVDBs.tsx buildQuery). Declared here only so the strict schema accepts the
    // field_value_selection filters' OR clauses.
    status: {
      type: 'string',
    },
    integration: {
      type: 'string',
    },
  },
};
