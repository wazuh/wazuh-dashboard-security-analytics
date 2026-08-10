/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
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
} from '@elastic/eui';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { RouteComponentProps } from 'react-router-dom';
import { KVDBItem } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import { BREADCRUMBS, DEFAULT_EMPTY_DATA, ROUTES } from '../../../utils/constants';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { formatCellValue, setBreadcrumbs } from '../../../utils/helpers';
import { KVDBS_PAGE_SIZE, KVDBS_SEARCH_SCHEMA, KVDBS_SORT_FIELD } from '../utils/constants';
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
import { IntegrationCell } from '../../../components/IntegrationCell/IntegrationCell';

interface KVDBsProps extends RouteComponentProps {
  notifications: NotificationsStart;
}

export const KVDBs: React.FC<KVDBsProps> = ({ history, notifications }) => {
  const isMountedRef = useRef(true);
  const [items, setItems] = useState<KVDBItem[]>([]);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const urlFilters = useUrlFilterParams({ params: ['query', 'page'] }, history);
  const pageIndex = urlFilters.page - 1;
  const [pageSize, setPageSize] = useState(KVDBS_PAGE_SIZE);
  const [sortField, setSortField] = useState(KVDBS_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<any>(() =>
    urlFilters.values.query ? EuiSearchBar.Query.parse(urlFilters.values.query) : null
  );
  const [selectedKVDBId, setSelectedKVDBId] = useState<string | null>(null);
  const { component: spaceSelector, spaceFilter } = useSpaceSelector({
    isLoading: loading,
    clearParamsOnChange: ['page'],
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

  // Wazuh: a same-route CTA navigation (e.g. an Integration popover's "Go to
  // integration KVDBs" while already on KVDBs) updates the URL without remounting
  // this component, so the search bar must resync from the URL-owned value instead
  // of relying on its mount-time initializer.
  const isFirstQuerySyncRender = useRef(true);
  useEffect(() => {
    setSearchQuery(urlFilters.values.query ? EuiSearchBar.Query.parse(urlFilters.values.query) : null);
    if (isFirstQuerySyncRender.current) {
      isFirstQuerySyncRender.current = false;
      return;
    }
    urlFilters.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilters.values.query]);

  const buildQuery = useCallback(() => {
    let query = searchQuery ? EuiSearchBar.Query.toESQuery(searchQuery) : { match_all: {} };
    if (!query || Object.keys(query).length === 0) {
      query = { match_all: {} };
    }

    if (spaceFilter) {
      query = {
        bool: {
          must: [query, { term: { 'space.name': spaceFilter } }],
        },
      };
    }

    return query;
  }, [searchQuery, spaceFilter]);

  const fetchKVDBs = useCallback(async () => {
    setLoading(true);
    const sort = sortField ? [{ [sortField]: { order: sortDirection } }] : undefined;

    try {
      const response = await DataStore.kvdbs.searchKVDBs({
        from: pageIndex * pageSize,
        size: pageSize,
        sort,
        query: buildQuery(),
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
  }, [pageIndex, pageSize, sortField, sortDirection, buildQuery]);

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

  const onSearchChange = ({ query }: { query: any }) => {
    setSearchQuery(query);
    urlFilters.setParams({ query: query?.text ?? '' });
    urlFilters.setPage(1);
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
        render: (value: string) => <IntegrationCell name={value || ''} history={history} />,
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
                query={searchQuery ?? undefined}
                box={{
                  placeholder: 'Search KVDBs',
                  incremental: true,
                  compressed: true,
                  schema: true,
                }}
                schema={KVDBS_SEARCH_SCHEMA}
                onChange={onSearchChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSmallButton iconType="refresh" onClick={fetchKVDBs}>
                Refresh
              </EuiSmallButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
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
