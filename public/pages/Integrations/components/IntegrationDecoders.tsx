/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { ContentPanel } from '../../../components/ContentPanel';
import { DecoderDetailsFlyout } from '../../Decoders/components/DecoderDetailsFlyout';
import { formatCellValue } from '../../../utils/helpers';
import { EuiIcon } from '@elastic/eui';
import { ROUTES } from '../../../utils/constants';
import { withReturnTo } from '../../../utils/routes';
import { SpaceTypes, SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace, getSpacesAllowAction } from '../../../../common/helpers';
import { Space } from '../../../../types';
import { useIntegrationDecoders } from '../../Decoders/hooks/useIntegrationDecoders';
import {
  MAX_GRAPH_DECODERS,
  useIntegrationDecoderGraph,
} from '../../Decoders/hooks/useIntegrationDecoderGraph';
import { ListEmptyPrompt } from '../../../components/ListEmptyPrompt';
import { IntegrationEditAction } from './IntegrationEditAction';
import { DecoderGraph } from './DecoderGraph';

export interface IntegrationDecodersProps {
  decoderIds: string[];
  space: string;
  enabled: boolean;
  history: RouteComponentProps['history'];
  // Wazuh: where the edit form must come back to — this view, on this tab.
  returnTo: string;
  // Cross-app link to the create form, carrying this integration so its
  // Integration field comes pre-selected.
  createHref: string;
}

// Wazuh: the decoders of an integration can be read as a list or as the cascade
// they form. The table stays the default and is the accessible equivalent.
export const DECODERS_VIEW = {
  TABLE: 'table',
  GRAPH: 'graph',
} as const;

const decodersViewOptions = [
  { id: DECODERS_VIEW.TABLE, label: 'Table', iconType: 'tableOfContents' },
  { id: DECODERS_VIEW.GRAPH, label: 'Cascade', iconType: 'indexMapping' },
];

export interface DecoderTableItem {
  id: string;
  name?: string;
  title?: string;
  author?: string;
}

export const IntegrationDecoders: React.FC<IntegrationDecodersProps> = ({
  decoderIds,
  space,
  enabled,
  history,
  returnTo,
  createHref,
}) => {
  const [flyoutDecoderId, setFlyoutDecoderId] = useState<string | undefined>(undefined);
  const [viewId, setViewId] = useState<string>(DECODERS_VIEW.TABLE);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(searchText);
      setPageIndex(0);
    }, 500);
    return () => clearTimeout(t);
  }, [searchText]);

  const {
    items: decoders,
    total,
    loading,
    refresh,
  } = useIntegrationDecoders({
    decoderIds,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search: appliedSearch,
  });

  const isGraphView = viewId === DECODERS_VIEW.GRAPH;

  const {
    graph,
    loading: graphLoading,
    error: graphError,
    truncated: graphTruncated,
    hierarchyTruncated: graphHierarchyTruncated,
    refresh: refreshGraph,
  } = useIntegrationDecoderGraph({
    decoderIds,
    space,
    // The cascade fetches every decoder at once, so only load it when shown.
    enabled: enabled && isGraphView,
  });

  const isCreateDisabled = !actionIsAllowedOnSpace(space as Space, SPACE_ACTIONS.CREATE);
  const canEdit = actionIsAllowedOnSpace(space as Space, SPACE_ACTIONS.EDIT);

  const columns: EuiBasicTableColumn<DecoderTableItem>[] = useMemo(
    () => [
      {
        field: 'name',
        name: 'Name',
        sortable: true,
        render: (_: string, decoder: DecoderTableItem) => (
          <EuiLink onClick={() => setFlyoutDecoderId(decoder.id)}>
            {formatCellValue(decoder?.name)}
          </EuiLink>
        ),
      },
      {
        field: 'title',
        name: 'Title',
        sortable: true,
        render: (_: string, decoder: DecoderTableItem) => formatCellValue(decoder?.title),
      },
      {
        field: 'author',
        name: 'Author',
        sortable: true,
        render: (_: string, decoder: DecoderTableItem) => formatCellValue(decoder?.author),
      },
      {
        name: 'Actions',
        width: '80px',
        actions: [
          {
            name: 'Edit',
            description: 'Edit decoder',
            render: (decoder: DecoderTableItem) => (
              <IntegrationEditAction
                entityLabel="decoder"
                canEdit={canEdit}
                onClick={() =>
                  history.push(
                    withReturnTo(`${ROUTES.DECODERS_EDIT}/${decoder.id}?space=${space}`, returnTo)
                  )
                }
                data-test-subj="integration-decoders-edit"
              />
            ),
          },
        ],
      },
    ],
    [history, space, returnTo, canEdit]
  );

  const closeFlyout = useCallback(() => {
    setFlyoutDecoderId(undefined);
  }, []);

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

  const isEmptyState = total === 0 && !loading && !appliedSearch;

  return (
    <>
      {flyoutDecoderId && (
        <DecoderDetailsFlyout decoderId={flyoutDecoderId} space={space} onClose={closeFlyout} />
      )}

      <ContentPanel
        title="Decoders"
        hideHeaderBorder={true}
        actions={[
          <EuiSmallButton
            onClick={() => {
              refresh();
              refreshGraph();
            }}
          >
            Refresh
          </EuiSmallButton>,
        ]}
      >
        {isEmptyState ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                <p>There are no decoders associated with this integration.</p>
              </EuiText>
            </EuiFlexItem>

            {space !== SpaceTypes.STANDARD.value && (
              <EuiFlexItem grow={false}>
                {isCreateDisabled ? (
                  <EuiToolTip
                    content={`Decoders can only be created in the spaces: ${getSpacesAllowAction(
                      SPACE_ACTIONS.CREATE
                    ).join(', ')}`}
                  >
                    <span>
                      <EuiSmallButton fill disabled>
                        Create decoder&nbsp;
                        <EuiIcon type={'popout'} />
                      </EuiSmallButton>
                    </span>
                  </EuiToolTip>
                ) : (
                  <EuiSmallButton fill href={createHref} target="_blank">
                    Create decoder&nbsp;
                    <EuiIcon type={'popout'} />
                  </EuiSmallButton>
                )}
                <EuiSpacer size="m" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem>
                {!isGraphView && (
                  <EuiFieldSearch
                    placeholder="Search decoders"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    compressed
                    fullWidth
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="Decoders view"
                  options={decodersViewOptions}
                  idSelected={viewId}
                  onChange={setViewId}
                  buttonSize="s"
                  data-test-subj="integration-decoders-view-toggle"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {isGraphView ? (
              <DecoderGraph
                graph={graph}
                loading={graphLoading}
                error={graphError}
                truncated={graphTruncated}
                maxDecoders={MAX_GRAPH_DECODERS}
                hierarchyTruncated={graphHierarchyTruncated}
                onSelectDecoder={setFlyoutDecoderId}
              />
            ) : (
              <EuiBasicTable
                items={decoders}
                columns={columns}
                loading={loading}
                noItemsMessage={
                  loading ? (
                    'Loading...'
                  ) : (
                    <ListEmptyPrompt
                      entity="decoders"
                      hasFilters={!!appliedSearch}
                      searchOnly
                      noContentTitle="This integration has no decoders"
                      emptyBody={null}
                    />
                  )
                }
                pagination={{
                  pageIndex,
                  pageSize,
                  totalItemCount: total,
                  pageSizeOptions: [10, 25, 50],
                }}
                sorting={{
                  sort: { field: sortField as keyof DecoderTableItem, direction: sortDirection },
                }}
                onChange={onTableChange}
              />
            )}
          </>
        )}
      </ContentPanel>
    </>
  );
};
