/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { EntityStatusValue } from '../../../hooks/useStatusCounts';
import { RuleItemInfoBase } from '../../../../types';
import { RuleTableItem } from '../utils/helpers';
import { buildRulesSearchQuery } from '../utils/constants';

const SORT_FIELD_TO_OS: Record<string, string> = {
  title: 'document.metadata.title',
  level: 'document.level',
  category: 'document.logsource.category',
};

const toRuleTableItem = (rule: RuleItemInfoBase): RuleTableItem => ({
  title: rule._source.metadata?.title ?? '',
  level: rule._source.level,
  category: rule._source.category,
  source: rule.prePackaged ? 'Standard' : 'Custom',
  description: rule._source.metadata?.description ?? '',
  ruleInfo: rule,
  ruleId: rule._id,
});

export interface UseIntegrationRulesParams {
  ruleIds: string[];
  space: string;
  enabled?: boolean;
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  search: string;
  severityLevels?: string[];
  /** The status summary bar's filter. */
  status?: EntityStatusValue;
  reloadTrigger: number;
}

export function useIntegrationRules({
  ruleIds,
  space,
  enabled = true,
  pageIndex,
  pageSize,
  sortField,
  sortDirection,
  search,
  severityLevels,
  status,
  reloadTrigger,
}: UseIntegrationRulesParams) {
  const [items, setItems] = useState<RuleTableItem[]>([]);
  const [total, setTotal] = useState(0);
  // Wazuh: the request failed; the status summary shows no count instead of 0.
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // The parent rebuilds `ruleIds` on every render, so depend on its content.
  const ruleIdsKey = useMemo(() => ruleIds.join(','), [ruleIds]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const from = pageIndex * pageSize;
    const size = pageSize;

    const textQuery = buildRulesSearchQuery(search);
    const mustClauses: any[] = [textQuery];
    const filterClauses: any[] = [{ terms: { 'document.id': ruleIds } }];
    if (severityLevels && severityLevels.length > 0) {
      filterClauses.push({ terms: { 'document.level': severityLevels } });
    }
    const query = { bool: { must: mustClauses, filter: filterClauses } };

    const osSortField = SORT_FIELD_TO_OS[sortField] ?? sortField;
    const sort: Array<Record<string, any>> = [{ [osSortField]: { order: sortDirection } }];

    DataStore.rules
      .searchRules(
        {
          from,
          size,
          query,
          sort,
          status,
          _source: {
            includes: [
              'document.id',
              'document.metadata.title',
              'document.level',
              'document.logsource.category',
              'document.logsource.product',
              'document.metadata.description',
              'space',
            ],
          },
        },
        space
      )
      .then((response) => {
        if (!cancelled) {
          setItems(response.items.map(toRuleTableItem));
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
    ruleIdsKey,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search,
    severityLevels,
    status,
    reloadTrigger,
  ]);

  return { items, total, loading, error };
}
