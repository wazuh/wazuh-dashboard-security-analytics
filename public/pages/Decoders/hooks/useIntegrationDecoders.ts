/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { DecoderTableItem } from '../../Integrations/components/IntegrationDecoders';
import { buildDecodersSearchQuery } from '../utils/constants';

const DECODER_SORT_FIELD_TO_OS: Record<string, string> = {
  name: 'document.name',
  title: 'document.metadata.title',
  author: 'document.metadata.author',
};

export interface UseIntegrationDecodersParams {
  decoderIds: string[];
  space: string;
  enabled?: boolean;
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  search: string;
}

export function useIntegrationDecoders({
  decoderIds,
  space,
  enabled = true,
  pageIndex,
  pageSize,
  sortField,
  sortDirection,
  search,
}: UseIntegrationDecodersParams) {
  const [items, setItems] = useState<DecoderTableItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const from = pageIndex * pageSize;
    const size = pageSize;

    const textQuery = buildDecodersSearchQuery(search);
    const query = {
      bool: {
        must: [textQuery],
        filter: [{ terms: { 'document.id': decoderIds } }],
      },
    };

    const osSortField = DECODER_SORT_FIELD_TO_OS[sortField] ?? sortField;
    const sort: Array<Record<string, any>> = [{ [osSortField]: { order: sortDirection } }];

    DataStore.decoders
      .searchDecoders(
        {
          from,
          size,
          query,
          sort,
          _source: {
            includes: [
              'document.id',
              'document.name',
              'document.metadata.title',
              'document.metadata.author',
              'space',
            ],
          },
        },
        space
      )
      .then((response) => {
        if (!cancelled) {
          setItems(
            response.items.map((item) => ({
              id: item.document?.id,
              name: item.document?.name,
              title: item.document?.metadata?.title,
              author: item.document?.metadata?.author,
            }))
          );
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
    decoderIds,
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
