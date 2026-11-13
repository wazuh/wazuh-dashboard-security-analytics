/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { EntityStatusValue } from '../../../hooks/useStatusCounts';
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
  /** The status summary bar's filter. */
  status?: EntityStatusValue;
  reloadTrigger: number;
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
  status,
  reloadTrigger,
}: UseIntegrationDecodersParams) {
  const [items, setItems] = useState<DecoderTableItem[]>([]);
  const [total, setTotal] = useState(0);
  // Wazuh: the request failed; the status summary shows no count instead of 0.
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // The parent rebuilds `decoderIds` on every render, so depend on its content.
  const decoderIdsKey = useMemo(() => decoderIds.join(','), [decoderIds]);

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
          status,
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
          setError(!!response.error);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setError(true);
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
    decoderIdsKey,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search,
    status,
    reloadTrigger,
  ]);

  return { items, total, loading, error };
}
