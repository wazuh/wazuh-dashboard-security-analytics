/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiPopover,
  EuiSmallButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { DataStore } from '../../../store/DataStore';
import { DecoderItem } from '../../../../types';
import { BREADCRUMBS, ROUTES } from '../../../utils/constants';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import { formatCellValue, setBreadcrumbs } from '../../../utils/helpers';
import { buildDecodersSearchQuery } from '../utils/constants';
import { DecoderDetailsFlyout } from '../components/DecoderDetailsFlyout';
import { SpaceTypes } from '../../../../common/constants';
import { SpaceSelector } from '../../../components/SpaceSelector';

const DEFAULT_PAGE_SIZE = 25;
const SORT_FIELD_MAP: Record<string, string> = {
  'document.name': 'document.name.keyword',
};
const SORT_UNMAPPED_TYPE: Record<string, string> = {
  'document.name.keyword': 'keyword',
};

interface DecodersProps {
  history: RouteComponentProps['history'];
}

export const Decoders: React.FC<DecodersProps> = ({ history }) => {
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
  const [spaceFilter, setSpaceFilter] = useState<string>(SpaceTypes.STANDARD.value);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedDecoder, setSelectedDecoder] = useState<{
    id: string;
    space?: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setBreadcrumbs([BREADCRUMBS.NORMALIZATION, BREADCRUMBS.DECODERS]);
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
  }, [appliedSearch, pageIndex, pageSize, spaceFilter, sortField, sortDirection]);

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

  const deleteDecoder = async (decoderId: string) => {
    setLoading(true);
    await DataStore.decoders.deleteDecoder(decoderId);
    if (!isMountedRef.current) {
      return;
    }
    await loadDecoders();
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
      },
      {
        field: 'document.metadata.author.name',
        name: 'Author',
        sortable: true,
        render: (value: string) => formatCellValue(value),
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'View',
            description: 'View decoder details',
            type: 'icon',
            icon: 'inspect',
            onClick: (item: DecoderItem) => setSelectedDecoder({ id: item.id, space: item.space }),
          },
          {
            name: 'Edit',
            description: 'Edit decoder',
            type: 'icon',
            icon: 'pencil',
            // href: (item: DecoderItem) => `#${ROUTES.DECODERS_EDIT}/${item.id}`,
            onClick: (item: DecoderItem) => history.push(`#${ROUTES.DECODERS_EDIT}/${item.id}`),
            // available: () => spaceFilter !== SpaceTypes.STANDARD.value,
          },
          {
            name: 'Delete',
            description: 'Delete decoder',
            type: 'icon',
            icon: 'trash',
            onClick: (item: DecoderItem) => {
              deleteDecoder(item.id);
            },
            // available: () => spaceFilter !== SpaceTypes.STANDARD.value,
          },
        ],
      },
    ],
    [spaceFilter, deleteDecoder]
  );

  const spaceSelector = (
    <SpaceSelector
      selectedSpace={spaceFilter}
      onSpaceChange={(id) => {
        setSpaceFilter(id);
        setPageIndex(0);
      }}
      isDisabled={spacesLoading}
    />
  );

  const panels = [
    <EuiContextMenuItem
      key="create"
      icon="plusInCircle"
      href={`#${ROUTES.DECODERS_CREATE}`}
      disabled={spaceFilter !== SpaceTypes.DRAFT.value}
      toolTipContent={
        spaceFilter === SpaceTypes.STANDARD.value
          ? 'Cannot create decoders in the Standard space.'
          : undefined
      }
    >
      Create
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
  );
};
