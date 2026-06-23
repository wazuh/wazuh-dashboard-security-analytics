/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiComboBox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { ContentPanel } from '../../../components/ContentPanel';
import { RuleTableItem } from '../../WazuhRules/utils/helpers';
import { RuleViewerFlyout } from '../../WazuhRules/components/RuleViewerFlyout/RuleViewerFlyout';
import { getSeverityColor, getSeverityLabel } from '../../Correlations/utils/constants';
import { ruleSeverity } from '../../Rules/utils/constants';
import { ROUTES } from '../../../utils/constants';
import { SpaceTypes, SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace, getSpacesAllowAction } from '../../../../common/helpers';
import { Space } from '../../../../types';
import { useIntegrationRules } from '../../WazuhRules/hooks/useIntegrationRules';

export interface IntegrationDetectionRulesProps {
  ruleIds: string[];
  space: string;
  enabled: boolean;
}

export const IntegrationDetectionRules: React.FC<IntegrationDetectionRulesProps> = ({
  ruleIds,
  space,
  enabled,
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [severityLevels, setSeverityLevels] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(searchText);
      setPageIndex(0);
    }, 500);
    return () => clearTimeout(t);
  }, [searchText]);

  const { items: rules, total, loading: loadingRules, refresh } = useIntegrationRules({
    ruleIds,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search: appliedSearch,
    severityLevels,
  });

  const closeRuleDetails = useCallback(() => {
    setSelectedRuleId(undefined);
  }, []);

  const isCreateDisabled = !actionIsAllowedOnSpace(space as Space, SPACE_ACTIONS.CREATE);

  const columns: EuiBasicTableColumn<RuleTableItem>[] = useMemo(
    () => [
      {
        field: 'title',
        name: 'Name',
        sortable: true,
        truncateText: true,
        render: (_: string, rule: RuleTableItem) => (
          <EuiLink onClick={() => setSelectedRuleId(rule.ruleId)}>{rule.title}</EuiLink>
        ),
      },
      {
        field: 'level',
        name: 'Severity',
        sortable: true,
        width: '120px',
        render: (level: string) => {
          const { text, background } = getSeverityColor(level);
          return (
            <EuiBadge style={{ color: text }} color={background}>
              {getSeverityLabel(level)}
            </EuiBadge>
          );
        },
      },
      {
        field: 'description',
        name: 'Description',
        sortable: false,
        truncateText: true,
      },
    ],
    []
  );

  const onTableChange = useCallback(
    ({
      page,
      sort,
    }: {
      page?: { index: number; size: number };
      sort?: { field: string; direction: 'asc' | 'desc' };
    }) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
      if (sort) {
        setSortField(sort.field);
        setSortDirection(sort.direction);
      }
    },
    []
  );

  const severityOptions = ruleSeverity.map((s) => ({ label: s.name, value: s.value }));
  const selectedSeverityOptions = severityLevels.map((v) => ({
    label: ruleSeverity.find((s) => s.value === v)?.name ?? v,
    value: v,
  }));

  const isEmptyState =
    total === 0 && !loadingRules && !appliedSearch && severityLevels.length === 0;

  return (
    <>
      {selectedRuleId && (
        <RuleViewerFlyout hideFlyout={closeRuleDetails} ruleId={selectedRuleId} space={space} />
      )}
      <ContentPanel
        title="Rules"
        hideHeaderBorder={true}
        actions={[<EuiSmallButton onClick={refresh}>Refresh</EuiSmallButton>]}
      >
        {isEmptyState ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                {/* By Wazuh */}
                <p>There are no rules associated with this integration.</p>
              </EuiText>
            </EuiFlexItem>
            {space !== SpaceTypes.STANDARD.value && (
              <EuiFlexItem grow={false}>
                {isCreateDisabled ? (
                  <EuiToolTip
                    content={`Rule can only be created in the spaces: ${getSpacesAllowAction(
                      SPACE_ACTIONS.CREATE
                    ).join(', ')}`}
                  >
                    <span>
                      <EuiSmallButton fill disabled>
                        Create rule&nbsp;
                        <EuiIcon type={'popout'} />
                      </EuiSmallButton>
                    </span>
                  </EuiToolTip>
                ) : (
                  <EuiSmallButton fill href={`#${ROUTES.RULES_CREATE}`} target="_blank">
                    Create rule&nbsp;
                    <EuiIcon type={'popout'} />
                  </EuiSmallButton>
                )}
                <EuiSpacer size="xl" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem>
                <EuiFieldSearch
                  placeholder="Search rules"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  compressed
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
                <EuiComboBox
                  placeholder="Severity"
                  options={severityOptions}
                  selectedOptions={selectedSeverityOptions}
                  onChange={(opts) => {
                    setSeverityLevels(opts.map((o) => o.value as string));
                    setPageIndex(0);
                  }}
                  isClearable
                  compressed
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items={rules}
              columns={columns}
              loading={loadingRules}
              noItemsMessage={loadingRules ? 'Loading...' : 'No rules found.'}
              pagination={{
                pageIndex,
                pageSize,
                totalItemCount: total,
                pageSizeOptions: [10, 25, 50],
              }}
              sorting={{
                sort: { field: sortField as keyof RuleTableItem, direction: sortDirection },
              }}
              onChange={onTableChange}
            />
          </>
        )}
      </ContentPanel>
    </>
  );
};
