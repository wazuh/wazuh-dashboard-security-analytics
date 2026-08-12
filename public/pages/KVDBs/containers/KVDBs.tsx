/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiCallOut,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSearchBar,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { RouteComponentProps } from 'react-router-dom';
import { KVDBItem } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import { BREADCRUMBS, DEFAULT_EMPTY_DATA, ROUTES } from '../../../utils/constants';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { formatCellValue, setBreadcrumbs } from '../../../utils/helpers';
import { KVDBS_PAGE_SIZE, KVDBS_SORT_FIELD } from '../utils/constants';
import { KVDBDetailsFlyout } from '../components/KVDBDetailsFlyout';
import { SPACE_ACTIONS, SpaceTypes } from '../../../../common/constants';
import { actionIsAllowedOnSpace } from '../../../../common/helpers';
import { useSpaceSelector } from '../../../hooks/useSpaceSelector';
import {
  DELETE_ACTION,
  DELETE_SELECTED_ACTION,
  useDeleteItems,
} from '../../../hooks/useDeleteItems';
import { useUrlFilterParams } from '../../../hooks/useUrlFilterParams';
import { useIntegrationSelector } from '../../../components/IntegrationComboBox/useIntegrationSelector';
import { IntegrationCell } from '../../../components/IntegrationCell/IntegrationCell';
import {
  buildEntitySearchSchema,
  buildStatusIntegrationFilters,
  buildStatusIntegrationQueryFromUrl,
  encodeEnabledValues,
  encodeMultiValue,
  getFreeText,
  getOrSelectedValues,
} from '../../../utils/entitySearchBarFilters';

// Wazuh: KVDBs' own declared search fields on top of the shared
// status/integration schema — see buildEntitySearchSchema. Most produce no
// actual filter clause (buildQuery below only reads appliedQueryText's free
// text via toESQuery), but they must stay declared so a saved/bookmarked
// query using them doesn't newly trip the strict-schema parse error.
const KVDBS_EXTRA_SEARCH_FIELDS = {
  'document.metadata.author': { type: 'string' },
  'document.metadata.date': { type: 'string' },
  'document.enabled': { type: 'string' },
  'document.id': { type: 'string' },
  'document.metadata.references': { type: 'string' },
  'document.metadata.title': { type: 'string' },
};

interface KVDBsProps extends RouteComponentProps {
  notifications: NotificationsStart;
}

export const KVDBs: React.FC<KVDBsProps> = ({ history, notifications }) => {
  const isMountedRef = useRef(true);
  const [items, setItems] = useState<KVDBItem[]>([]);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const urlFilters = useUrlFilterParams(
    { params: ['query', 'enabled', 'integration', 'page'] },
    history
  );
  const pageIndex = urlFilters.page - 1;
  const [pageSize, setPageSize] = useState(KVDBS_PAGE_SIZE);
  const [sortField, setSortField] = useState(KVDBS_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  // Wazuh: `searchQuery` is the EuiSearchBar's controlled Query — free text plus
  // Status/Integration `field_value_selection` (multiSelect: 'or') filter clauses,
  // matching the pattern already used by Detectors. Neither `enabled` (unprefixed)
  // nor `integration` are real KVDB document fields, so both get stripped back out
  // and resolved to explicit filters in buildQuery below.
  const buildQueryFromUrl = () => buildStatusIntegrationQueryFromUrl(urlFilters.values);
  const [searchQuery, setSearchQuery] = useState(buildQueryFromUrl);
  // Wazuh: captures the EuiSearchBar strict-schema parse error (unrecognized
  // field name) so a danger callout can render above the table without
  // losing the previously applied query/results (see onSearchChange/
  // renderError below).
  const [searchError, setSearchError] = useState<any>(null);
  // Wazuh: the free-text portion of `searchQuery` debounces into `appliedQueryText`
  // (matching Rules/Decoders) so buildQuery/fetchKVDBs don't fire an ES round-trip
  // on every keystroke — only status/integration checkboxes apply immediately.
  const [appliedQueryText, setAppliedQueryText] = useState(urlFilters.values.query);
  const [selectedKVDBId, setSelectedKVDBId] = useState<string | null>(null);
  const { component: spaceSelector, spaceFilter } = useSpaceSelector({
    isLoading: loading,
    clearParamsOnChange: ['page', 'integration'],
    history,
  });
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<KVDBItem[]>([]);

  const isCreateActionDisabled = !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.CREATE);
  const isDeleteActionAllowed = actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DELETE);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.NORMALIZATION, BREADCRUMBS.KVDBS]);
  }, []);

  // Wazuh: set before a local write to urlFilters so the resync effect below
  // doesn't rebuild `searchQuery` from a URL snapshot that can race with it.
  const skipNextUrlSync = useRef(false);

  // Wazuh: a same-route CTA navigation (e.g. an Integration popover's "Go to
  // integration KVDBs" while already on KVDBs) updates the URL without remounting
  // this component, so the search bar must resync from the URL-owned value instead
  // of relying on its mount-time initializer.
  const isFirstQuerySyncRender = useRef(true);
  useEffect(() => {
    if (isFirstQuerySyncRender.current) {
      isFirstQuerySyncRender.current = false;
      setSearchQuery(buildQueryFromUrl());
      return;
    }
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false;
      return;
    }
    setSearchQuery(buildQueryFromUrl());
    setAppliedQueryText(urlFilters.values.query);
    urlFilters.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilters.values.query, urlFilters.values.enabled, urlFilters.values.integration]);

  // Wazuh: debounce the free-text portion of `searchQuery` into `appliedQueryText`
  // (used by buildQuery below) — matches Rules/Decoders. Status/integration
  // checkboxes are read directly off `searchQuery` (selectedStatuses/
  // selectedIntegrations below) and apply immediately, without this delay.
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const freeText = getFreeText(searchQuery);
      setAppliedQueryText(freeText);
      skipNextUrlSync.current = true;
      urlFilters.setParams({ query: freeText });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getFreeText(searchQuery)]);

  const { options: integrationOptions, loading: integrationOptionsLoading } =
    useIntegrationSelector({
      notifications,
      enabled: true,
      space: spaceFilter,
      relatedField: 'kvdbs',
    });

  const selectedStatuses = useMemo(() => getOrSelectedValues(searchQuery, 'status'), [searchQuery]);
  const selectedIntegrations = useMemo(
    () => getOrSelectedValues(searchQuery, 'integration'),
    [searchQuery]
  );

  // Wazuh: Status/Integration checkboxes (multiSelect 'or') apply immediately,
  // unlike the free-text debounce above — matches the Rules/Decoders pattern.
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    skipNextUrlSync.current = true;
    urlFilters.setParams({
      enabled: selectedStatuses.length ? encodeEnabledValues(selectedStatuses) : undefined,
      integration: selectedIntegrations.length ? encodeMultiValue(selectedIntegrations) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatuses.join(','), selectedIntegrations.join(',')]);

  // Wazuh: built from the debounced `appliedQueryText` (not `searchQuery` directly)
  // so typing doesn't trigger an ES round-trip on every keystroke — status/
  // integration are read from the live `searchQuery` via selectedStatuses/
  // selectedIntegrations above, applying immediately. Status and integration
  // are resolved server-side (see KVDBsService.searchKVDBs, applyEntityFilters),
  // matching the Rules/Decoders pattern — not composed into the query here.
  const buildQuery = useCallback(() => {
    let query = EuiSearchBar.Query.toESQuery(EuiSearchBar.Query.parse(appliedQueryText ?? ''));
    if (!query || Object.keys(query).length === 0) {
      query = { match_all: {} };
    }

    return spaceFilter
      ? { bool: { must: [query], filter: [{ term: { 'space.name': spaceFilter } }] } }
      : query;
  }, [appliedQueryText, spaceFilter]);

  // Wazuh: both/neither selected => no status filter (matches everything).
  const appliedStatus = selectedStatuses.length === 1 ? selectedStatuses[0] : undefined;

  const fetchKVDBs = useCallback(async () => {
    setLoading(true);
    const sort = sortField ? [{ [sortField]: { order: sortDirection } }] : undefined;

    try {
      const response = await DataStore.kvdbs.searchKVDBs({
        from: pageIndex * pageSize,
        size: pageSize,
        sort,
        query: buildQuery(),
        status: appliedStatus,
        integrationNames: selectedIntegrations.length ? selectedIntegrations : undefined,
        space: selectedIntegrations.length ? spaceFilter : undefined,
        track_total_hits: true,
        _source: {
          includes: [
            'document.id',
            'document.metadata.title',
            'document.metadata.author',
            'document.enabled',
            'space',
          ],
        },
      });

      setItems(response.items);
      setTotalItemCount(response.total);
    } finally {
      setLoading(false);
    }
  }, [
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    buildQuery,
    appliedStatus,
    selectedIntegrations,
    spaceFilter,
  ]);

  useEffect(() => {
    fetchKVDBs();
  }, [fetchKVDBs]);

  const {
    itemForAction,
    setItemForAction,
    isDeleting,
    confirmDeleteSingle,
    confirmDeleteSelected,
  } = useDeleteItems({
    deleteOne: (id) => DataStore.kvdbs.deleteKVDB(id),
    reload: fetchKVDBs,
    notifications,
    entityName: 'KVDB',
    entityNamePlural: 'KVDBs',
    isMountedRef,
  });

  const onTableChange = ({ page, sort }: any) => {
    // Wazuh: EuiBasicTable reports the current sort criteria on every onChange call
    // (including plain pagination clicks), not only when it actually changes — guard
    // on an actual change so paging doesn't get silently reset back to page 1.
    if (sort && (sort.field !== sortField || sort.direction !== sortDirection)) {
      setSortField(sort.field || KVDBS_SORT_FIELD);
      setSortDirection(sort.direction || 'asc');
      urlFilters.setPage(1);
    }

    if (page) {
      urlFilters.setPage(page.index + 1);
      setPageSize(page.size);
    }
  };

  // Wazuh: URL writes for 'query' (debounced) and 'enabled'/'integration'
  // (immediate) happen in the effects above, reacting to this state change —
  // matches the Rules/Decoders pattern.
  const onSearchChange = ({ query, error }: { query: any; error: any }) => {
    setSearchError(error ?? null);
    if (!query) return;
    setSearchQuery(query);
  };

  const renderError = () => {
    if (!searchError) return undefined;
    return (
      <>
        <EuiCallOut
          color="danger"
          title={`Invalid search: ${searchError.message}`}
          data-test-subj="entitySearchErrorCallOut"
        />
        <EuiSpacer size="l" />
      </>
    );
  };

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 25, 50, 100],
    }),
    [pageIndex, pageSize, totalItemCount]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortField, sortDirection]
  );

  const menuItems = [
    <EuiContextMenuItem
      key="create"
      icon="plusInCircle"
      href={`#${ROUTES.KVDBS_CREATE}`}
      disabled={isCreateActionDisabled}
      toolTipContent={
        isCreateActionDisabled ? `Cannot create KVDBs in the ${spaceFilter} space.` : undefined
      }
    >
      Create
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="delete"
      icon="trash"
      onClick={() => {
        setItemForAction({ action: DELETE_SELECTED_ACTION });
        setActionsPopoverOpen(false);
      }}
      disabled={selectedItems.length === 0 || !isDeleteActionAllowed}
      toolTipContent={
        !isDeleteActionAllowed
          ? `Cannot delete KVDBs in the ${spaceFilter} space.`
          : selectedItems.length === 0
          ? 'Select KVDBs to delete'
          : undefined
      }
    >
      Delete selected ({selectedItems.length})
    </EuiContextMenuItem>,
  ];

  const columns: Array<EuiBasicTableColumn<KVDBItem>> = useMemo(
    () => [
      {
        field: 'document.metadata.title',
        name: 'Title',
        sortable: true,
        dataType: 'string',
        render: (value: string) => formatCellValue(value),
      },
      {
        field: 'integration.title',
        name: 'Integration',
        dataType: 'string',
        render: (value: string, item: KVDBItem) => (
          <IntegrationCell
            name={value || ''}
            integrationId={item.integration?.id}
            history={history}
            space={spaceFilter}
            currentEntity="kvdbs"
          />
        ),
      },
      {
        field: 'document.metadata.author',
        name: 'Author',
        sortable: true,
        render: (value: string) => formatCellValue(value),
      },
      {
        field: 'document.enabled',
        name: 'Status',
        render: (enabled: boolean) => (
          <EnabledHealth enabled={enabled} data-test-subj="kvdb_status" />
        ),
      },
      {
        name: 'Actions',
        align: 'right',
        actions: [
          {
            name: 'View',
            description: 'View KVDB details',
            type: 'icon',
            icon: 'inspect',
            onClick: (item: KVDBItem) => setSelectedKVDBId(item.id),
          },
          {
            name: 'Edit',
            description: 'Edit KVDB',
            type: 'icon',
            icon: 'pencil',
            onClick: (item: KVDBItem) => history.push(`${ROUTES.KVDBS_EDIT}/${item.id}`),
            available: () => actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.EDIT),
          },
          {
            name: 'Delete',
            description: 'Delete KVDB',
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: (item: KVDBItem) => setItemForAction({ action: DELETE_ACTION, id: item.id }),
            available: () => actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DELETE),
          },
        ],
      },
    ],
    [spaceFilter, history]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {selectedKVDBId && (
        <KVDBDetailsFlyout kvdbId={selectedKVDBId} onClose={() => setSelectedKVDBId(null)} />
      )}
      {itemForAction?.action === DELETE_ACTION && (
        <EuiConfirmModal
          title="Delete KVDB"
          onCancel={() => setItemForAction(null)}
          onConfirm={confirmDeleteSingle}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isDeleting}
        >
          <p>Are you sure you want to delete this KVDB? This action cannot be undone.</p>
        </EuiConfirmModal>
      )}
      {itemForAction?.action === DELETE_SELECTED_ACTION && (
        <EuiConfirmModal
          title={`Delete ${selectedItems.length} KVDB${selectedItems.length !== 1 ? 's' : ''}`}
          onCancel={() => setItemForAction(null)}
          onConfirm={() => confirmDeleteSelected(selectedItems, () => setSelectedItems([]))}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isDeleting}
        >
          <p>{`Are you sure you want to delete ${selectedItems.length} KVDB${
            selectedItems.length !== 1 ? 's' : ''
          }? This action cannot be undone.`}</p>
        </EuiConfirmModal>
      )}
      <EuiFlexItem grow={false}>
        <PageHeader>
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem>
              <EuiText size="s">
                <h1>KVDBs</h1>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{spaceSelector}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                id="kvdbsActionsPopover"
                button={
                  <EuiSmallButton
                    iconType="arrowDown"
                    iconSide="right"
                    onClick={() => setActionsPopoverOpen((prev) => !prev)}
                    data-test-subj="kvdbsActionsButton"
                  >
                    Actions
                  </EuiSmallButton>
                }
                isOpen={actionsPopoverOpen}
                closePopover={() => setActionsPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel size="s" items={menuItems} />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </PageHeader>
      </EuiFlexItem>
      <EuiSpacer size="xs" />
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
                  placeholder: 'Search KVDBs',
                  incremental: true,
                  compressed: true,
                  schema: true,
                }}
                schema={buildEntitySearchSchema(KVDBS_EXTRA_SEARCH_FIELDS)}
                filters={buildStatusIntegrationFilters(
                  integrationOptions,
                  integrationOptionsLoading
                )}
                onChange={onSearchChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Refresh">
                <EuiButtonIcon
                  iconType="refresh"
                  aria-label="Refresh KVDBs"
                  onClick={() => fetchKVDBs()}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {renderError()}
          <EuiBasicTable
            items={items}
            columns={columns}
            loading={loading || isDeleting}
            pagination={pagination}
            sorting={sorting}
            onChange={onTableChange}
            itemId={(item) => item.document?.id || item.id}
            noItemsMessage="No KVDBs to display"
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
