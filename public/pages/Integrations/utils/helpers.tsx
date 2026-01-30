/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiSmallButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { Integration } from '../../../../types';
import { SpaceTypes } from '../../../../common/constants';
import { capitalize, startCase } from 'lodash';
import { Search } from '@opensearch-project/oui/src/eui_components/basic_table';
import { ruleSource } from '../../Rules/utils/constants';
import { DEFAULT_EMPTY_DATA, integrationCategories } from '../../../utils/constants';
import { integrationLabels } from './constants';

export const getIntegrationsTableColumns = (
  showDetails: (id: string) => void,
  deleteIntegration: (integration: Integration) => void,
  promoteIntegration: (integration: Integration) => void
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
    field: 'decoders.length',
    name: 'Decoders',
    sortable: true,
    render: (decodersLength: number) => decodersLength,
  },
  {
    field: 'kvdbs.length',
    name: 'KVDBs',
    sortable: true,
    render: (kvdbsLength: number) => kvdbsLength,
  },
  {
    field: 'rules.length',
    name: 'Rules',
    sortable: true,
    render: (rulesLength: number) => rulesLength,
  },
  {
    name: 'Actions',
    actions: [
      {
        render: (item: Integration) => {
          return (<>
            {![SpaceTypes.DRAFT.value, SpaceTypes.TESTING.value].includes(item.space)?<EuiToolTip content="Promote">
              <EuiSmallButtonIcon
                aria-label={'Promote integration'}
                iconType={'share'}
                color="primary"
                onClick={() => promoteIntegration(item)}
              />
            </EuiToolTip>:<></>}
            <EuiToolTip content="Delete">
              <EuiSmallButtonIcon
                aria-label={'Delete integration'}
                iconType={'trash'}
                color="danger"
                disabled={![SpaceTypes.DRAFT.value, SpaceTypes.TESTING.value].includes(item.space)}
                onClick={() => deleteIntegration(item)}
              />
            </EuiToolTip>
            </>
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
