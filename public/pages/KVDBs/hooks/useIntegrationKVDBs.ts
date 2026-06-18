/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { KVDBItem } from '../../../../types';
import { buildKVDBsSearchQuery } from '../utils/constants';

export interface UseIntegrationKVDBsParams {
  kvdbIds: string[];
  space: string;
  enabled?: boolean;
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  search: string;
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
}: UseIntegrationKVDBsParams) {
  const [items, setItems] = useState<KVDBItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (kvdbIds.length === 0) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const from = pageIndex * pageSize;
    const size = pageSize;

    const textQuery = buildKVDBsSearchQuery(search);

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
  }, [
    kvdbIds,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search,
    reloadTrigger,
  ]);

  const refresh = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  return { items, total, loading, refresh };
}
