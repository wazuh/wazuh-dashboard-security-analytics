/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiSmallButton,
  EuiCard,
  EuiContextMenuPanel,
  EuiInMemoryTable,
  EuiPopover,
} from '@elastic/eui';
import { NotificationsStart } from 'opensearch-dashboards/public';
import { FilterItem } from '../../../../types';
import { DataStore } from '../../../store/DataStore';
import {
  FilterTableItem,
  getFiltersTableColumns,
  getFiltersTableSearchConfig,
  toFilterTableItem,
} from '../utils/helpers';
import { FilterDetailsFlyout } from './FilterDetailsFlyout';

export interface FiltersTabProps {
  spaceFilter: string;
  notifications: NotificationsStart;
}

export const FiltersTab: React.FC<FiltersTabProps> = ({ spaceFilter }) => {
  const [items, setItems] = useState<FilterTableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<FilterTableItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterItem | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const buildQuery = useCallback(() => {
    const baseQuery = { match_all: {} };
    if (spaceFilter) {
      return {
        bool: {
          must: [baseQuery, { term: { 'space.name': spaceFilter } }],
        },
      };
    }
    return baseQuery;
  }, [spaceFilter]);

  const fetchFilters = useCallback(async () => {
    setLoading(true);
    try {
      const { items: fetchedItems } = await DataStore.filters.searchFilters({
        size: 10000,
        sort: [{ 'document.name': { order: 'asc' } }],
        query: buildQuery(),
        track_total_hits: true,
      });
      setItems(fetchedItems.map(toFilterTableItem));
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const onViewDetails = useCallback((item: FilterItem) => {
    setSelectedFilter(item);
  }, []);

  const actionsButton = (
    <EuiPopover
      id="filtersActionsPopover"
      button={
        <EuiSmallButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          data-test-subj="filtersActionsButton"
          isDisabled
        >
          Actions
        </EuiSmallButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      data-test-subj="filtersActionsPopover"
    >
      <EuiContextMenuPanel items={[]} size="s" />
    </EuiPopover>
  );

  return (
    <>
      <EuiCard textAlign="left" paddingSize="m" title="Filters">
        <EuiInMemoryTable
          itemId="id"
          items={items}
          loading={loading}
          columns={getFiltersTableColumns(onViewDetails)}
          pagination={{ initialPageSize: 25 }}
          search={getFiltersTableSearchConfig(items, { toolsRight: [actionsButton] })}
          selection={{
            onSelectionChange: setSelectedItems,
            initialSelected: [],
          }}
          isSelectable={true}
          sorting={true}
        />
      </EuiCard>
      {selectedFilter && (
        <FilterDetailsFlyout
          filter={selectedFilter}
          onClose={() => setSelectedFilter(null)}
        />
      )}
    </>
  );
};
