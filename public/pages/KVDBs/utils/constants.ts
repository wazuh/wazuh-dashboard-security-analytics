/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const KVDBS_PAGE_SIZE = 25;
export const KVDBS_SORT_FIELD = 'document.metadata.title';

// Wazuh: KVDBs search goes through EuiSearchBar/toESQuery (see
// useIntegrationKVDBs.ts and KVDBs.tsx). The strict search schema now lives in
// entitySearchBarFilters.ts (buildEntitySearchSchema), shared with
// Rules/Decoders.
