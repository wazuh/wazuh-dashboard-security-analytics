/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from 'react';
import { EuiSearchBar } from '@elastic/eui';
import { DataStore } from '../../../store/DataStore';
import { KVDBItem } from '../../../../types';

export interface UseIntegrationKVDBsParams {
  kvdbIds: string[];
  space: string;
  enabled?: boolean;
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  search: string;
  reloadTrigger: number;
}

export function useIntegrationKVDBs({
  kvdbIds,
  space,
  enabled = true,
  pageIndex,
  pageSize,
  sortField,
  sortDirection,
  search,
  reloadTrigger,
}: UseIntegrationKVDBsParams) {
  const [items, setItems] = useState<KVDBItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // The parent rebuilds `kvdbIds` on every render, so depend on its content.
  const kvdbIdsKey = useMemo(() => kvdbIds.join(','), [kvdbIds]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const from = pageIndex * pageSize;
    const size = pageSize;

    // Wazuh: same structured-query builder (EuiSearchBar.Query.toESQuery) the main
    // KVDBs table uses.
    const trimmedSearch = search.trim();
    const textQuery = trimmedSearch
      ? EuiSearchBar.Query.toESQuery(EuiSearchBar.Query.parse(trimmedSearch))
      : { match_all: {} };

    const filterClauses: any[] = [{ terms: { 'document.id': kvdbIds } }];
    if (space) {
      filterClauses.push({ term: { 'space.name': space } });
    }

    const query = {
      bool: {
        must: [textQuery],
        filter: filterClauses,
      },
    };

    const effectiveSortField = sortField || 'document.metadata.title';
    const sort: Array<Record<string, any>> = [{ [effectiveSortField]: { order: sortDirection } }];

    DataStore.kvdbs
      .searchKVDBs(
        {
          from,
          size,
          query,
          sort,
          track_total_hits: true,
          _source: {
            includes: [
              'document.id',
              'document.metadata.title',
              'document.metadata.author',
              'space',
            ],
          },
        },
        { skipIntegrationMap: true }
      )
      .then((response) => {
        if (!cancelled) {
          setItems(response.items);
          setTotal(response.total);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    kvdbIdsKey,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search,
    reloadTrigger,
  ]);

  return { items, total, loading };
}
