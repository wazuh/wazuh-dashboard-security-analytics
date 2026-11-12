/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
import { EntityStatusValue, useStatusCounts } from '../../../hooks/useStatusCounts';
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

  return { items, total, loading };
}

// Wazuh: the enabled/disabled split of every rule of the integration, regardless of
// the tab's search, rule level and status filters.
export function useIntegrationRuleStatusCounts({
  ruleIds,
  space,
  enabled = true,
  reloadTrigger,
}: Pick<UseIntegrationRulesParams, 'ruleIds' | 'space' | 'enabled' | 'reloadTrigger'>) {
  const ruleIdsKey = ruleIds.join(',');
  const countByStatus = useCallback(
    async (status: EntityStatusValue) =>
      (
        await DataStore.rules.searchRules(
          {
            query: { terms: { 'document.id': ruleIds } },
            from: 0,
            size: 0,
            status,
            _source: false,
          },
          space
        )
      ).total,
    // The parent rebuilds `ruleIds` on every render, so depend on its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ruleIdsKey, space]
  );
  return useStatusCounts(countByStatus, { enabled, reloadTrigger });
}
