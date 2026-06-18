/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useCallback, useEffect, useState } from 'react';
import { DataStore } from '../../../store/DataStore';
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
}: UseIntegrationRulesParams) {
  const [items, setItems] = useState<RuleTableItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (ruleIds.length === 0) {
      setItems([]);
      setTotal(0);
      setLoading(false);
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
  }, [
    ruleIds,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search,
    severityLevels,
    reloadTrigger,
  ]);

  const refresh = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  return { items, total, loading, refresh };
}
