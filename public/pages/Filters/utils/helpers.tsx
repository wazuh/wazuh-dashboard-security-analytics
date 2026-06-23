/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { Search } from '@opensearch-project/oui/src/eui_components/basic_table';
import { FilterItem } from '../../../../types';
import { FiltersAllowedActionsBySpace, SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace } from '../../../../common/helpers';
import { FILTER_TYPE_OPTIONS } from './constants';

export interface FilterTableItem {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  spaceName: string;
}

export const toFilterTableItem = (item: FilterItem): FilterTableItem => ({
  id: item.id,
  name: item.document?.metadata?.title ?? item.document?.name ?? '',
  type: item.document?.type ?? '',
  enabled: item.document?.enabled ?? false,
  spaceName: item.space?.name ?? '',
});

export const getFiltersTableColumns = (
  spaceFilter: string,
  onViewDetails: (id: string) => void,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void
) => [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    render: (name: string, row: FilterTableItem) => (
      <EuiLink onClick={() => onViewDetails(row.id)}>{name}</EuiLink>
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
    name: 'Actions',
    actions: [
      {
        name: 'View',
        description: 'View filter details',
        type: 'icon',
        icon: 'inspect',
        onClick: (row: FilterTableItem) => onViewDetails(row.id),
      },
      {
        name: 'Edit',
        description: 'Edit filter',
        type: 'icon',
        icon: 'pencil',
        onClick: (row: FilterTableItem) => onEdit(row.id),
        available: () =>
          actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.EDIT, FiltersAllowedActionsBySpace),
      },
      {
        name: 'Delete',
        description: 'Delete filter',
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        onClick: (row: FilterTableItem) => onDelete(row.id),
        available: () =>
          actionIsAllowedOnSpace(spaceFilter, SPACE_ACTIONS.DELETE, FiltersAllowedActionsBySpace),
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
        options: FILTER_TYPE_OPTIONS.map((option) => ({ value: option.value, name: option.text })),
      },
    ],
    toolsRight: options?.toolsRight,
  };
};
