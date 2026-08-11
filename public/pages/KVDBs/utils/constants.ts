/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const KVDBS_PAGE_SIZE = 25;
export const KVDBS_SORT_FIELD = 'document.metadata.title';

// Wazuh: KVDBs search goes through EuiSearchBar/toESQuery (see
// useIntegrationKVDBs.ts and KVDBs.tsx).

export const KVDBS_SEARCH_SCHEMA = {
  strict: false,
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
    // Wazuh: `status`/`integration` aren't indexed under these exact names —
    // status maps to document.enabled, integration is resolved via a separate
    // lookup (see KVDBsService.searchKVDBs). Declared here only for the
    // EuiSearchBar filter UI; KVDBs.tsx buildQuery strips them before toESQuery.
    status: {
      type: 'string',
    },
    integration: {
      type: 'string',
    },
  },
};
