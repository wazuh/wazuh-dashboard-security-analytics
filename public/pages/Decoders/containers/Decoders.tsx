/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { RouteComponentProps } from 'react-router-dom';
import {
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
import { DataStore } from '../../../store/DataStore';
import { DecoderItem } from '../../../../types';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { formatCellValue, setBreadcrumbs } from '../../../utils/helpers';
import { buildDecodersSearchQuery } from '../utils/constants';
import { DecoderDetailsFlyout } from '../components/DecoderDetailsFlyout';
import { SPACE_ACTIONS } from '../../../../common/constants';
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
  buildStatusIntegrationFilters,
  buildStatusIntegrationQueryFromUrl,
  decodeEnabledValues,
  decodeMultiValue,
  encodeEnabledValues,
  encodeMultiValue,
  getFreeText,
  getOrSelectedValues,
} from '../../../utils/entitySearchBarFilters';

const DEFAULT_PAGE_SIZE = 25;

interface DecodersProps {
  history: RouteComponentProps['history'];
  notifications: NotificationsStart;
}

export const Decoders: React.FC<DecodersProps> = ({ history, notifications }) => {
  const isMountedRef = useRef(true);
  const [decoders, setDecoders] = useState<DecoderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const urlFilters = useUrlFilterParams({ params: ['query', 'enabled', 'integration', 'page'] }, history);
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
  const [sortField, setSortField] = useState<string>('document.name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { component: spaceSelector, spaceFilter } = useSpaceSelector({
    isLoading: loading,
    clearParamsOnChange: ['page'],
    history,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedDecoder, setSelectedDecoder] = useState<{
    id: string;
    space?: string;
  } | null>(null);
  const [selectedItems, setSelectedItems] = useState<DecoderItem[]>([]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.NORMALIZATION, BREADCRUMBS.DECODERS]);
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
  // integration decoders" while already on Decoders) updates the URL without
  // remounting this component, so the search bar must resync from the URL-owned
  // value instead of relying on its mount-time initializer.
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

  const { options: integrationOptions, loading: integrationOptionsLoading } = useIntegrationSelector(
    { notifications, enabled: true, space: spaceFilter, relatedField: 'decoders' }
  );

  const loadDecoders = useCallback(async () => {
    setLoading(true);
    const query = buildDecodersSearchQuery(appliedQueryText);
    const sort = sortField
      ? [
          {
            [sortField]: {
              order: sortDirection,
            },
          },
        ]
      : undefined;

    const response = await DataStore.decoders.searchDecoders(
      {
        from: pageIndex * pageSize,
        size: pageSize,
        sort,
        query,
        searchText: appliedQueryText,
        status: appliedStatus,
        integrationNames: appliedIntegrationNames.length ? appliedIntegrationNames : undefined,
        _source: {
          includes: [
            'document.id',
            'document.name',
            'document.metadata.title',
            'document.metadata.author',
            'document.enabled',
            'space',
          ],
        },
      },
      spaceFilter
    );

    if (!isMountedRef.current) {
      return;
    }
    setDecoders(response.items);
    setTotal(response.total);
    setLoading(false);
  }, [
    appliedQueryText,
    pageIndex,
    pageSize,
    spaceFilter,
    sortField,
    sortDirection,
    appliedStatus,
    appliedIntegrationNames,
  ]);

  useEffect(() => {
    loadDecoders();
  }, [loadDecoders]);

  const {
    itemForAction,
    setItemForAction,
    isDeleting,
    confirmDeleteSingle,
    confirmDeleteSelected,
  } = useDeleteItems({
    deleteOne: (id) => DataStore.decoders.deleteDecoder(id),
    reload: loadDecoders,
    notifications,
    entityName: 'decoder',
    entityNamePlural: 'decoders',
    isMountedRef,
  });

  const onTableChange = ({ page, sort }: { page: any; sort?: any }) => {
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

  const columns: Array<EuiBasicTableColumn<DecoderItem>> = useMemo(
    () => [
      {
        field: 'document.name',
        name: 'Name',
        sortable: true,
        render: (value: string) => formatCellValue(value),
      },
      {
        field: 'document.metadata.title',
        name: 'Title',
        render: (value: string) => formatCellValue(value),
      },
      {
        field: 'integrations',
        name: 'Integration',
        render: (integrations: string[], item: DecoderItem) => (
          <IntegrationCell
            name={integrations?.[0] || ''}
            integrationId={item.integrationRefs?.[0]?.id}
            history={history}
            space={spaceFilter}
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
          <EnabledHealth enabled={enabled} data-test-subj="decoder_status" />
        ),
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'View',
            description: 'View decoder details',
            type: 'icon',
            icon: 'inspect',
            onClick: (item: DecoderItem) =>
              setSelectedDecoder({ id: item.document.id, space: item.space }),
          },
          {
            name: 'Edit',
            description: 'Edit decoder',
            type: 'icon',
            icon: 'pencil',
            onClick: (item: DecoderItem) =>
              history.push(`${ROUTES.DECODERS_EDIT}/${item.document.id}?space=${item.space}`),
            available: () => actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.EDIT),
          },
          {
            name: 'Delete',
            description: 'Delete decoder',
            type: 'icon',
            icon: 'trash',
            onClick: (item: DecoderItem) =>
              setItemForAction({ action: DELETE_ACTION, id: item.id }),
            available: () => actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DELETE),
          },
        ],
      },
    ],
    [spaceFilter, history]
  );

  const panels = [
    <EuiContextMenuItem
      key="create"
      icon="plusInCircle"
      href={`#${ROUTES.DECODERS_CREATE}`}
      disabled={!actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.CREATE)}
      toolTipContent={
        !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.CREATE)
          ? `Cannot create decoders in the ${spaceFilter} space.`
          : undefined
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
      disabled={
        selectedItems.length === 0 || !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DELETE)
      }
      toolTipContent={
        !actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DELETE)
          ? `Cannot delete decoders in the ${spaceFilter} space.`
          : selectedItems.length === 0
          ? 'Select decoders to delete'
          : undefined
      }
    >
      Delete selected ({selectedItems.length})
    </EuiContextMenuItem>,
  ];

  const handlerShowActionsButton = () => setIsPopoverOpen((prevState) => !prevState);

  const actionsButton = (
    <EuiPopover
      id={'decodersActionsPopover'}
      button={
        <EuiSmallButton
          iconType={'arrowDown'}
          iconSide={'right'}
          onClick={handlerShowActionsButton}
          data-test-subj={'decodersActionsButton'}
        >
          Actions
        </EuiSmallButton>
      }
      isOpen={isPopoverOpen}
      closePopover={handlerShowActionsButton}
      panelPaddingSize={'none'}
      anchorPosition={'downLeft'}
      data-test-subj={'decodersActionsPopover'}
    >
      <EuiContextMenuPanel items={panels} size="s" />
    </EuiPopover>
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {selectedDecoder && (
        <DecoderDetailsFlyout
          decoderId={selectedDecoder.id}
          space={spaceFilter}
          onClose={() => setSelectedDecoder(null)}
        />
      )}
      {itemForAction?.action === DELETE_ACTION && (
        <EuiConfirmModal
          title="Delete decoder"
          onCancel={() => setItemForAction(null)}
          onConfirm={confirmDeleteSingle}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isDeleting}
        >
          <p>Are you sure you want to delete this decoder? This action cannot be undone.</p>
        </EuiConfirmModal>
      )}
      {itemForAction?.action === DELETE_SELECTED_ACTION && (
        <EuiConfirmModal
          title={`Delete ${selectedItems.length} decoder${selectedItems.length !== 1 ? 's' : ''}`}
          onCancel={() => setItemForAction(null)}
          onConfirm={() => confirmDeleteSelected(selectedItems, () => setSelectedItems([]))}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="cancel"
          isLoading={isDeleting}
        >
          <p>{`Are you sure you want to delete ${selectedItems.length} decoder${
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
                  <h1>Decoders</h1>
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
                  placeholder: 'Search decoders',
                  incremental: true,
                  compressed: true,
                }}
                filters={buildStatusIntegrationFilters(integrationOptions, integrationOptionsLoading)}
                onChange={({ query }) => query && setSearchQuery(query)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Refresh">
                <EuiButtonIcon
                  iconType="refresh"
                  aria-label="Refresh decoders"
                  onClick={() => loadDecoders()}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiBasicTable
            items={decoders}
            columns={columns}
            loading={loading || isDeleting}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount: total,
              pageSizeOptions: [10, 25, 50],
            }}
            sorting={{ sort: { field: sortField, direction: sortDirection } }}
            onChange={onTableChange}
            itemId="id"
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
