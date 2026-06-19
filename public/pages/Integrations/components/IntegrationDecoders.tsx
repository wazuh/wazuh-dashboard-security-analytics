/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
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
import { SpaceTypes, SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace, getSpacesAllowAction } from '../../../../common/helpers';
import { Space } from '../../../../types';
import { useIntegrationDecoders } from '../../Decoders/hooks/useIntegrationDecoders';

export interface IntegrationDecodersProps {
  decoderIds: string[];
  space: string;
  enabled: boolean;
}

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
}) => {
  const [flyoutDecoderId, setFlyoutDecoderId] = useState<string | undefined>(undefined);
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

  const { items: decoders, total, loading, refresh } = useIntegrationDecoders({
    decoderIds,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search: appliedSearch,
  });

  const isCreateDisabled = !actionIsAllowedOnSpace(space as Space, SPACE_ACTIONS.CREATE);

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
    ],
    []
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
        actions={[<EuiSmallButton onClick={refresh}>Refresh</EuiSmallButton>]}
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
                    content={`Decoder can only be created in the spaces: ${getSpacesAllowAction(
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
                  <EuiSmallButton fill href={`#${ROUTES.DECODERS_CREATE}`} target="_blank">
                    Create decoder&nbsp;
                    <EuiIcon type={'popout'} />
                  </EuiSmallButton>
                )}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldSearch
                  placeholder="Search decoders"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  compressed
                  fullWidth
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items={decoders}
              columns={columns}
              loading={loading}
              noItemsMessage={loading ? 'Loading...' : 'No decoders found.'}
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
          </>
        )}
      </ContentPanel>
    </>
  );
};
