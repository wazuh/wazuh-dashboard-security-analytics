/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiPopover,
  EuiSmallButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiConfirmModal,
} from '@elastic/eui';
import { DataStore } from '../../../../store/DataStore';
import { RuleItemInfoBase } from '../../../../../types';
import { BREADCRUMBS, ROUTES } from '../../../../utils/constants';
import { PageHeader } from '../../../../components/PageHeader/PageHeader';
import { EnabledHealth } from '../../../../components/Utility/EnabledHealth';
import { setBreadcrumbs } from '../../../../utils/helpers';
import { buildRulesSearchQuery } from '../../utils/constants';
import { RuleTableItem } from '../../utils/helpers';
import { getSeverityColor, getSeverityLabel } from '../../../Correlations/utils/constants';
import { RuleViewerFlyout } from '../../components/RuleViewerFlyout/RuleViewerFlyout';
import { SpaceTypes } from '../../../../../common/constants';
import { useSpaceSelector } from '../../../../hooks/useSpaceSelector';
import {
  DELETE_ACTION,
  DELETE_SELECTED_ACTION,
  useDeleteItems,
} from '../../../../hooks/useDeleteItems';
import { useUrlParamItem } from '../../../../hooks/useUrlParamItem';
import { useUrlFilterParams } from '../../../../hooks/useUrlFilterParams';
import { useIntegrationSelector } from '../../../../components/IntegrationComboBox/useIntegrationSelector';
import { IntegrationCell } from '../../../../components/IntegrationCell/IntegrationCell';
import {
  buildStatusIntegrationFilters,
  buildStatusIntegrationQueryFromUrl,
  decodeEnabledValues,
  decodeMultiValue,
  encodeEnabledValues,
  encodeMultiValue,
  getFreeText,
  getOrSelectedValues,
} from '../../../../utils/entitySearchBarFilters';

const DEFAULT_PAGE_SIZE = 25;

const SORT_FIELD_TO_OS: Record<string, string | undefined> = {
  title: 'document.metadata.title',
  level: 'document.level',
  category: 'document.logsource.category',
};

interface RulesProps {
  history: RouteComponentProps['history'];
  notifications: NotificationsStart;
}

const toRuleTableItem = (rule: RuleItemInfoBase): RuleTableItem => ({
  title: rule._source.metadata?.title ?? '',
  level: rule._source.level,
  category: rule._source.category,
  source: rule.prePackaged ? 'Standard' : 'Custom',
  description: rule._source.metadata?.description ?? '',
  ruleInfo: rule,
  ruleId: rule._id,
  integration: rule.integration,
  enabled: rule._source.enabled,
});

export const Rules: React.FC<RulesProps> = ({ history, notifications }) => {
  const isMountedRef = useRef(true);
  const [allRules, setAllRules] = useState<RuleTableItem[]>([]);
  const [totalRules, setTotalRules] = useState(0);
  const [loading, setLoading] = useState(false);
  const urlFilters = useUrlFilterParams(
    { params: ['query', 'enabled', 'integration', 'page'] },
    history
  );
  // Wazuh: `searchQuery` is the EuiSearchBar's controlled Query — free text plus
  // Status/Integration `field_value_selection` (multiSelect: 'or') filter clauses,
  // matching the pattern already used by Detectors. `appliedQueryText`/
  // `appliedStatus`/`appliedIntegrationNames` are what actually drives the fetch:
  // free text debounces like before, filter checkboxes apply immediately.
  const buildQueryFromUrl = () => buildStatusIntegrationQueryFromUrl(urlFilters.values);
  const [searchQuery, setSearchQuery] = useState(buildQueryFromUrl);
  const [appliedQueryText, setAppliedQueryText] = useState(urlFilters.values.query);
  const [appliedStatus, setAppliedStatus] = useState<'enabled' | 'disabled' | undefined>(() => {
    const statuses = decodeEnabledValues(urlFilters.values.enabled);
    return statuses.length === 1 ? (statuses[0] as 'enabled' | 'disabled') : undefined;
  });
  const [appliedIntegrationNames, setAppliedIntegrationNames] = useState<string[]>(() =>
    decodeMultiValue(urlFilters.values.integration)
  );
  const selectedStatuses = useMemo(() => getOrSelectedValues(searchQuery, 'status'), [searchQuery]);
  const selectedIntegrations = useMemo(
    () => getOrSelectedValues(searchQuery, 'integration'),
    [searchQuery]
  );
  const pageIndex = urlFilters.page - 1;
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<string>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { component: spaceSelector, spaceFilter } = useSpaceSelector({
    isLoading: loading,
    clearParamsOnChange: ['page', 'integration'],
    history,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<RuleTableItem[]>([]);

  const { paramId: selectedRuleId, setParam, clearParam } = useUrlParamItem('ruleId');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.DETECTION, BREADCRUMBS.RULES]);
  }, []);

  // Wazuh: set before a local write to urlFilters so the resync effect below
  // doesn't rebuild `searchQuery` from a URL snapshot that can race with it.
  const skipNextUrlSync = useRef(false);

  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const freeText = getFreeText(searchQuery);
      setAppliedQueryText(freeText);
      // 'query' is in resetPageOn, so this alone already resets the page.
      skipNextUrlSync.current = true;
      urlFilters.setParams({ query: freeText });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getFreeText(searchQuery)]);

  // Wazuh: Status/Integration checkboxes (multiSelect 'or') apply immediately,
  // unlike the free-text debounce above — matches the Detectors filter pattern.
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    setAppliedStatus(
      selectedStatuses.length === 1 ? (selectedStatuses[0] as 'enabled' | 'disabled') : undefined
    );
    setAppliedIntegrationNames(selectedIntegrations);
    // 'enabled'/'integration' are also in resetPageOn — same reasoning as above.
    skipNextUrlSync.current = true;
    urlFilters.setParams({
      enabled: selectedStatuses.length ? encodeEnabledValues(selectedStatuses) : undefined,
      integration: selectedIntegrations.length ? encodeMultiValue(selectedIntegrations) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatuses.join(','), selectedIntegrations.join(',')]);

  // Wazuh: a same-route CTA navigation (e.g. an Integration popover's "Go to
  // integration rules" while already on Rules) updates the URL without remounting
  // this component, so the search bar must resync from the URL-owned value instead
  // of relying on its mount-time initializer.
  useEffect(() => {
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false;
      return;
    }
    setSearchQuery(buildQueryFromUrl());
    setAppliedQueryText(urlFilters.values.query);
    const statuses = decodeEnabledValues(urlFilters.values.enabled);
    setAppliedStatus(statuses.length === 1 ? (statuses[0] as 'enabled' | 'disabled') : undefined);
    setAppliedIntegrationNames(decodeMultiValue(urlFilters.values.integration));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilters.values.query, urlFilters.values.enabled, urlFilters.values.integration]);

  const { options: integrationOptions, loading: integrationOptionsLoading } =
    useIntegrationSelector({
      notifications,
      enabled: true,
      space: spaceFilter,
      relatedField: 'rules',
    });

  const loadRules = useCallback(async () => {
    setLoading(true);
    const query = buildRulesSearchQuery(appliedQueryText);
    const osField = SORT_FIELD_TO_OS[sortField];
    const sort = osField ? [{ [osField]: { order: sortDirection } }] : undefined;
    const response = await DataStore.rules.searchRules(
      {
        query,
        from: pageIndex * pageSize,
        size: pageSize,
        sort,
        searchText: appliedQueryText,
        status: appliedStatus,
        integrationNames: appliedIntegrationNames.length ? appliedIntegrationNames : undefined,
        _source: {
          includes: [
            'document.id',
            'document.metadata.title',
            'document.level',
            'document.logsource.category',
            'document.logsource.product',
            'document.metadata.description',
            'document.enabled',
            'space',
          ],
        },
      },
      spaceFilter
    );

    if (!isMountedRef.current) return;

    setAllRules(response.items.map(toRuleTableItem));
    setTotalRules(response.total);
    setSelectedItems([]);
    setLoading(false);
  }, [
    appliedQueryText,
    spaceFilter,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    appliedStatus,
    appliedIntegrationNames,
  ]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const {
    itemForAction,
    setItemForAction,
    isDeleting,
    confirmDeleteSingle,
    confirmDeleteSelected,
  } = useDeleteItems({
    deleteOne: async (id) => {
      const ok = await DataStore.rules.deleteRule(id);
      return ok ? ok : undefined;
    },
    reload: loadRules,
    notifications,
    entityName: 'rule',
    entityNamePlural: 'rules',
    isMountedRef,
  });

  const onTableChange = ({ page, sort }: { page?: any; sort?: any }) => {
    // Wazuh: EuiBasicTable reports the current sort criteria on every onChange call
    // (including plain pagination clicks), not only when it actually changes — guard
    // on an actual change so paging doesn't get silently reset back to page 1.
    if (sort && (sort.field !== sortField || sort.direction !== sortDirection)) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
      urlFilters.setPage(1);
    }
    if (page) {
      urlFilters.setPage(page.index + 1);
      setPageSize(page.size);
    }
  };

  const hideFlyout = (refreshRules?: boolean) => {
    clearParam();
    if (refreshRules) loadRules();
  };

  const columns: Array<EuiBasicTableColumn<RuleTableItem>> = useMemo(
    () => [
      {
        field: 'title',
        name: 'Name',
        sortable: true,
        truncateText: true,
        width: '24%',
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
        field: 'category',
        name: 'Integration',
        sortable: false,
        width: '11%',
        render: (_: any, row: RuleTableItem) => (
          <IntegrationCell
            name={row.integration?.document?.metadata?.title || ''}
            integrationId={row.integration?.document?.id}
            history={history}
            space={spaceFilter}
            currentEntity="rules"
          />
        ),
      },
      {
        field: 'description',
        name: 'Description',
        sortable: false,
        truncateText: true,
      },
      {
        field: 'enabled',
        name: 'Status',
        sortable: false,
        width: '110px',
        render: (enabled: boolean) => (
          <EnabledHealth enabled={enabled} data-test-subj="rule_status" />
        ),
      },
      {
        name: 'Actions',
        width: '100px',
        actions: [
          {
            name: 'View',
            description: 'View rule details',
            type: 'icon',
            icon: 'inspect',
            onClick: (item: RuleTableItem) => setParam(item.ruleId),
          },
          {
            name: 'Edit',
            description: 'Edit rule',
            type: 'icon',
            icon: 'pencil',
            onClick: (item: RuleTableItem) => history.push(`${ROUTES.RULES_EDIT}/${item.ruleId}`),
            available: () => spaceFilter === SpaceTypes.DRAFT.value,
          },
          {
            name: 'Delete',
            description: 'Delete rule',
            type: 'icon',
            icon: 'trash',
            onClick: (item: RuleTableItem) =>
              setItemForAction({ action: DELETE_ACTION, id: item.ruleId }),
            available: () => spaceFilter === SpaceTypes.DRAFT.value,
          },
        ],
      },
    ],
    [history, spaceFilter]
  );

  const isDraftSpace = spaceFilter === SpaceTypes.DRAFT.value;

  const panels = [
    <EuiContextMenuItem
      key="create"
      icon="plusInCircle"
      href={`#${ROUTES.RULES_CREATE}`}
      disabled={!isDraftSpace}
      toolTipContent={
        !isDraftSpace ? `Cannot create rules in the ${spaceFilter} space.` : undefined
      }
    >
      Create
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      onClick={() => {
        setItemForAction({ action: DELETE_SELECTED_ACTION });
        setIsPopoverOpen(false);
      }}
      disabled={selectedItems.length === 0 || !isDraftSpace}
      toolTipContent={
        !isDraftSpace
          ? `Cannot delete rules in the ${spaceFilter} space.`
          : selectedItems.length === 0
          ? 'Select rules to delete'
          : undefined
      }
    >
      Delete selected ({selectedItems.length})
    </EuiContextMenuItem>,
  ];

  const actionsButton = (
    <EuiPopover
      id={'rulesActionsPopover'}
      button={
        <EuiSmallButton
          iconType={'arrowDown'}
          iconSide={'right'}
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          data-test-subj={'rulesActionsButton'}
        >
          Actions
        </EuiSmallButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize={'none'}
      anchorPosition={'downLeft'}
      data-test-subj={'rulesActionsPopover'}
    >
      <EuiContextMenuPanel items={panels} size="s" />
    </EuiPopover>
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {selectedRuleId && (
        <RuleViewerFlyout ruleId={selectedRuleId} space={spaceFilter} hideFlyout={hideFlyout} />
      )}
      {itemForAction?.action === DELETE_ACTION && (
        <EuiConfirmModal
          title="Delete rule"
          onCancel={() => setItemForAction(null)}
          onConfirm={confirmDeleteSingle}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isDeleting}
        >
          <p>Are you sure you want to delete this rule? This action cannot be undone.</p>
        </EuiConfirmModal>
      )}
      {itemForAction?.action === DELETE_SELECTED_ACTION && (
        <EuiConfirmModal
          title={`Delete ${selectedItems.length} rule${selectedItems.length !== 1 ? 's' : ''}`}
          onCancel={() => setItemForAction(null)}
          onConfirm={() =>
            confirmDeleteSelected(
              selectedItems.map((item) => ({ id: item.ruleId })),
              () => setSelectedItems([])
            )
          }
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isDeleting}
        >
          <p>{`Are you sure you want to delete ${selectedItems.length} rule${
            selectedItems.length !== 1 ? 's' : ''
          }? This action cannot be undone.`}</p>
        </EuiConfirmModal>
      )}
      <EuiFlexItem grow={false}>
        <PageHeader>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <h1>Rules</h1>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{spaceSelector}</EuiFlexItem>
              <EuiFlexItem grow={false}>{actionsButton}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </PageHeader>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem>
              <EuiSearchBar
                // Wazuh: remount once Integration options load, or the filter badge
                // can stick at "0 selected" until the popover is opened once.
                key={integrationOptionsLoading ? 'loading' : 'loaded'}
                query={searchQuery}
                box={{
                  placeholder: 'Search rules',
                  incremental: true,
                  compressed: true,
                }}
                filters={buildStatusIntegrationFilters(
                  integrationOptions,
                  integrationOptionsLoading
                )}
                onChange={({ query }) => query && setSearchQuery(query)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Refresh">
                <EuiButtonIcon
                  iconType="refresh"
                  aria-label="Refresh rules"
                  onClick={() => loadRules()}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiBasicTable
            items={allRules}
            columns={columns}
            loading={loading || isDeleting}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount: totalRules,
              pageSizeOptions: [10, 25, 50],
            }}
            sorting={{ sort: { field: sortField, direction: sortDirection } }}
            onChange={onTableChange}
            itemId="ruleId"
            selection={{
              selectable: () => true,
              onSelectionChange: setSelectedItems,
            }}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
