/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiLink, EuiButtonIcon } from '@elastic/eui';
import { Search } from '@opensearch-project/oui/src/eui_components/basic_table';
import { FilterItem } from '../../../../types';

export interface FilterTableItem {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  spaceName: string;
  _source: FilterItem;
}

export const toFilterTableItem = (item: FilterItem): FilterTableItem => ({
  id: item.id,
  name: item.document?.name ?? '',
  type: item.document?.type ?? '',
  enabled: item.document?.enabled ?? false,
  spaceName: item.space?.name ?? '',
  _source: item,
});

export const getFiltersTableColumns = (onViewDetails: (item: FilterItem) => void) => [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    render: (name: string, row: FilterTableItem) => (
      <EuiLink onClick={() => onViewDetails(row._source)}>{name}</EuiLink>
    ),
  },
  {
    field: 'type',
    name: 'Type',
    sortable: true,
  },
  {
    field: 'enabled',
    name: 'Enabled',
    sortable: true,
    render: (enabled: boolean) => (enabled ? 'Yes' : 'No'),
  },
  {
    field: 'spaceName',
    name: 'Space',
    render: (spaceName: string) =>
      spaceName ? spaceName.charAt(0).toUpperCase() + spaceName.slice(1) : '',
  },
  {
    name: 'Actions',
    actions: [
      {
        render: (row: FilterTableItem) => (
          <EuiButtonIcon
            aria-label="Inspect filter"
            iconType="inspect"
            onClick={() => onViewDetails(row._source)}
          />
        ),
      },
    ],
  },
];

export const getFiltersTableSearchConfig = (
  items: FilterTableItem[],
  options?: { toolsRight?: React.ReactNode[] }
): Search => {
  const types = Array.from(new Set(items.map((item) => item.type).filter(Boolean)));

  return {
    box: {
      placeholder: 'Search filters',
      schema: true,
      compressed: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: 'Type',
        compressed: true,
        multiSelect: 'or',
        options: types.map((type) => ({ value: type })),
      },
    ],
    toolsRight: options?.toolsRight,
  };
};
