/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { Search } from '@opensearch-project/oui/src/eui_components/basic_table';
import { FilterItem } from '../../../../types';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { FiltersAllowedActionsBySpace, SPACE_ACTIONS } from '../../../../common/constants';
import { actionIsAllowedOnSpace } from '../../../../common/helpers';
import { FILTER_TYPE_OPTIONS } from './constants';

export interface FilterTableItem {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  /**
   * String mirror of `enabled` used only by the Status filter, matching the
   * 'status'/'enabled'|'disabled' pattern used by Rules/Decoders/KVDBs —
   * EuiInMemoryTable's `field_value_selection` filter mishandles literal boolean
   * option values (the query round-trips through text, where EUI's grammar
   * doesn't know 'enabled' is boolean-typed absent a declared schema, desyncing
   * the filter's own badge/checkbox state from a real `true`/`false` clause).
   */
  status: 'enabled' | 'disabled';
  spaceName: string;
}

export const toFilterTableItem = (item: FilterItem): FilterTableItem => {
  const enabled = item.document?.enabled ?? false;
  return {
    id: item.id,
    name: item.document?.metadata?.title ?? item.document?.name ?? '',
    type: item.document?.type ?? '',
    enabled,
    status: enabled ? 'enabled' : 'disabled',
    spaceName: item.space?.name ?? '',
  };
};

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
    // Wazuh: reads `status` (not `enabled`) so EuiInMemoryTable's own filter
    // execution — which resolves a field's value via the table's `columns`, not
    // just the search bar's schema — can actually match rows for the Status
    // filter below; a field absent from `columns` never gets execution-time
    // resolution even though its schema/filter-popover config looks correct.
    field: 'status',
    name: 'Status',
    sortable: true,
    render: (status: 'enabled' | 'disabled') => (
      <EnabledHealth enabled={status === 'enabled'} data-test-subj="filter_status" />
    ),
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
        // Wazuh: EUI's default 'eq' operator matches by substring, not equality —
        // 'exact' avoids one option's value silently matching another's.
        operator: 'exact',
        options: FILTER_TYPE_OPTIONS.map((option) => ({ value: option.value, name: option.text })),
      },
      {
        type: 'field_value_selection',
        field: 'status',
        name: 'Status',
        compressed: true,
        multiSelect: 'or',
        operator: 'exact',
        options: [
          { value: 'enabled', name: 'Enabled' },
          { value: 'disabled', name: 'Disabled' },
        ],
      },
    ],
    toolsRight: options?.toolsRight,
  };
};
