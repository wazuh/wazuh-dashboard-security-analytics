/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiSmallButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { Integration } from '../../../../types';
import { capitalize, startCase } from 'lodash';
import { Search } from '@opensearch-project/oui/src/eui_components/basic_table';
import { ruleSource } from '../../Rules/utils/constants';
import { DEFAULT_EMPTY_DATA, integrationCategories } from '../../../utils/constants';
import { integrationLabels } from './constants';

export const getIntegrationsTableColumns = (
  showDetails: (id: string) => void,
  deleteIntegration: (integration: Integration) => void
) => [
  {
    field: 'title',
    name: 'Title',
    sortable: true,
    render: (name: string, item: Integration) => {
      return <EuiLink onClick={() => showDetails(item.id)}>{getIntegrationLabel(name)}</EuiLink>;
    },
  },
  {
    field: 'description',
    name: 'Description',
    truncateText: false,
  },
  {
    field: 'category',
    name: 'Category',
    truncateText: false,
  },
  {
    field: 'space',
    name: 'Space',
    render: (spaceName: string) => capitalize(spaceName),
  },
  {
    name: 'Actions',
    actions: [
      {
        render: (item: Integration) => {
          return (
            <EuiToolTip content="Delete">
              <EuiSmallButtonIcon
                aria-label={'Delete integration'}
                iconType={'trash'}
                color="danger"
                onClick={() => deleteIntegration(item)}
              />
            </EuiToolTip>
          );
        },
      },
    ],
  },
];

export const getIntegrationsTableSearchConfig = (): Search => {
  return {
    box: {
      placeholder: 'Search integrations',
      schema: true,
      compressed: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'category',
        name: 'Category',
        compressed: true,
        multiSelect: 'or',
        options: integrationCategories.map((category) => ({
          value: category,
        })),
      }
    ],
  };
};

export const getIntegrationLabel = (name: string) => {
  return !name ? DEFAULT_EMPTY_DATA : integrationLabels[name.toLowerCase()] || startCase(name);
};
