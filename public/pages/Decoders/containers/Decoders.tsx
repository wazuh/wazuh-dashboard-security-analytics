/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { DataStore } from '../../../store/DataStore';
import { DecoderItem } from '../../../../types';
import { BREADCRUMBS, DEFAULT_EMPTY_DATA, NORMALIZATION_NAV_ID } from '../../../utils/constants';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { setBreadcrumbs } from '../../../utils/helpers';
import { getApplication } from '../../../services/utils/constants';
import { SpaceSelector } from '../components/SpaceSelector';
import { buildDecodersSearchQuery } from '../utils/constants';
import { DecoderDetailsFlyout } from '../components/DecoderDetailsFlyout';

const DEFAULT_PAGE_SIZE = 25;
const SORT_FIELD_MAP: Record<string, string> = {
  'document.name': 'document.name.keyword',
};
const SORT_UNMAPPED_TYPE: Record<string, string> = {
  'document.name.keyword': 'keyword',
};

export const Decoders: React.FC = () => {
  const isMountedRef = useRef(true);
  const [decoders, setDecoders] = useState<DecoderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<string>('document.name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [spaceOptions, setSpaceOptions] = useState<{ value: string; text: string }[]>([
    { value: 'all', text: 'All spaces' },
  ]);
  const [selectedSpace, setSelectedSpace] = useState('all');
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [selectedDecoder, setSelectedDecoder] = useState<{
    id: string;
    space?: string;
  } | null>(null);

  const formatCellValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return DEFAULT_EMPTY_DATA;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      const formatted = value
        .map((entry) => {
          if (entry === null || entry === undefined) {
            return '';
          }
          if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
            return String(entry);
          }
          if (typeof entry === 'object' && 'name' in entry && typeof entry.name === 'string') {
            return entry.name;
          }
          return JSON.stringify(entry);
        })
        .filter(Boolean)
        .join(', ');
      return formatted || DEFAULT_EMPTY_DATA;
    }
    if (typeof value === 'object') {
      if ('name' in value && typeof value.name === 'string') {
        return value.name;
      }
      if ('value' in value && typeof value.value === 'string') {
        return value.value;
      }
      return JSON.stringify(value);
    }
    return DEFAULT_EMPTY_DATA;
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.NORMALIZATION, BREADCRUMBS.DECODERS]);
  }, []);

  useEffect(() => {
    setSpacesLoading(true);
    DataStore.decoders
      .getSpaces()
      .then((spaces) => {
        if (!isMountedRef.current) {
          return;
        }
        const options = [{ value: 'all', text: 'All spaces' }].concat(
          spaces.map((space) => ({ value: space, text: space }))
        );
        setSpaceOptions(options);
      })
      .finally(() => {
        if (isMountedRef.current) {
          setSpacesLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAppliedSearch(searchText);
      setPageIndex(0);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchText]);

  const loadDecoders = useCallback(async () => {
    setLoading(true);
    const spaceFilter = selectedSpace !== 'all' ? selectedSpace : undefined;
    const query = buildDecodersSearchQuery(appliedSearch);
    const sortFieldName = SORT_FIELD_MAP[sortField] ?? sortField;
    const sort = sortFieldName
      ? [
          {
            [sortFieldName]: {
              order: sortDirection,
              unmapped_type: SORT_UNMAPPED_TYPE[sortFieldName] ?? 'keyword',
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
        _source: { includes: ['document', 'space'] },
      },
      spaceFilter
    );

    if (!isMountedRef.current) {
      return;
    }
    setDecoders(response.items);
    setTotal(response.total);
    setLoading(false);
  }, [appliedSearch, pageIndex, pageSize, selectedSpace, sortField, sortDirection]);

  useEffect(() => {
    loadDecoders();
  }, [loadDecoders]);

  const onTableChange = ({ page, sort }: { page: any; sort?: any }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
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
        field: 'integrations',
        name: 'Integration'
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
              setSelectedDecoder({ id: item.id, space: item.space }),
          },
        ],
      },
    ],
    []
  );

  const spaceSelector = (
    <SpaceSelector
      options={spaceOptions}
      value={selectedSpace}
      onChange={(value) => {
        setSelectedSpace(value);
        setPageIndex(0);
      }}
      isLoading={spacesLoading}
    />
  );

  return (
    <>
      {selectedDecoder && (
        <DecoderDetailsFlyout
          decoderId={selectedDecoder.id}
          space={selectedSpace !== 'all' ? selectedSpace : selectedDecoder.space}
          onClose={() => setSelectedDecoder(null)}
        />
      )}
      <EuiFlexGroup direction="column" gutterSize="m">
        <PageHeader appRightControls={[{ renderComponent: spaceSelector }]}>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <h1>Decoders</h1>
                </EuiText>
                <EuiText size="s" color="subdued">
                  Decoders describe how security events are normalized.
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{spaceSelector}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </PageHeader>
        <EuiFlexItem>
          <EuiPanel>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  placeholder="Search decoders"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  isClearable
                  aria-label="Search decoders"
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
              loading={loading}
              pagination={{
                pageIndex,
                pageSize,
                totalItemCount: total,
                pageSizeOptions: [10, 25, 50],
              }}
              sorting={{ sort: { field: sortField, direction: sortDirection } }}
              onChange={onTableChange}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
