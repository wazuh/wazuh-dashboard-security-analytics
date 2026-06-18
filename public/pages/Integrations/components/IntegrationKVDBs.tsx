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
import { KVDBDetailsFlyout } from '../../KVDBs/components/KVDBDetailsFlyout';
import { formatCellValue } from '../../../utils/helpers';
import { EuiIcon } from '@elastic/eui';
import { ROUTES } from '../../../utils/constants';
import { KVDBItem, Space } from '../../../../types';
import { SpaceTypes, SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace, getSpacesAllowAction } from '../../../../common/helpers';
import { useIntegrationKVDBs } from '../../KVDBs/hooks/useIntegrationKVDBs';

export interface IntegrationKVDBsProps {
  kvdbIds: string[];
  space: string;
  enabled: boolean;
}

export const IntegrationKVDBs: React.FC<IntegrationKVDBsProps> = ({ kvdbIds, space, enabled }) => {
  const [flyoutKvdbId, setFlyoutKvdbId] = useState<string | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('document.metadata.title');
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

  const { items: kvdbs, total, loading, refresh } = useIntegrationKVDBs({
    kvdbIds,
    space,
    enabled,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    search: appliedSearch,
  });

  const isCreateDisabled = !actionIsAllowedOnSpace(space as Space, SPACE_ACTIONS.CREATE);

  const columns: EuiBasicTableColumn<KVDBItem>[] = useMemo(
    () => [
      {
        field: 'document.metadata.title',
        name: 'Title',
        sortable: true,
        render: (_: string, kvdb: KVDBItem) => (
          <EuiLink onClick={() => setFlyoutKvdbId(kvdb.id)}>
            {formatCellValue(kvdb.document?.metadata?.title)}
          </EuiLink>
        ),
      },
      {
        field: 'document.metadata.author',
        name: 'Author',
        sortable: true,
        render: (_: string, kvdb: KVDBItem) => formatCellValue(kvdb.document?.metadata?.author),
      },
    ],
    []
  );

  const closeFlyout = useCallback(() => {
    setFlyoutKvdbId(undefined);
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
      {flyoutKvdbId && <KVDBDetailsFlyout kvdbId={flyoutKvdbId} onClose={closeFlyout} />}

      <ContentPanel
        title="KVDBs"
        hideHeaderBorder={true}
        actions={[<EuiSmallButton onClick={refresh}>Refresh</EuiSmallButton>]}
      >
        {isEmptyState ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                <p>There are no KVDBs associated with this integration.</p>
              </EuiText>
            </EuiFlexItem>
            {/* TO DO: Create KVDB page*/}
            {space !== SpaceTypes.STANDARD.value && (
              <EuiFlexItem grow={false}>
                {isCreateDisabled ? (
                  <EuiToolTip
                    content={`KVDB can only be created in the spaces: ${getSpacesAllowAction(
                      SPACE_ACTIONS.CREATE
                    ).join(', ')}`}
                  >
                    <span>
                      <EuiSmallButton fill disabled>
                        Create KVDBs&nbsp;
                        <EuiIcon type={'popout'} />
                      </EuiSmallButton>
                    </span>
                  </EuiToolTip>
                ) : (
                  <EuiSmallButton fill href={`#${ROUTES.KVDBS_CREATE}`} target="_blank">
                    Create KVDBs&nbsp;
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
                  placeholder="Search KVDBs"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  compressed
                  fullWidth
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items={kvdbs}
              columns={columns}
              loading={loading}
              noItemsMessage={loading ? 'Loading...' : 'No KVDBs found.'}
              pagination={{
                pageIndex,
                pageSize,
                totalItemCount: total,
                pageSizeOptions: [10, 25, 50],
              }}
              sorting={{
                sort: { field: sortField as keyof KVDBItem, direction: sortDirection },
              }}
              onChange={onTableChange}
            />
          </>
        )}
      </ContentPanel>
    </>
  );
};
