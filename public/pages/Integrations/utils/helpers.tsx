/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useEffect } from 'react';
import { EuiSmallButtonIcon, EuiLink, EuiPanel } from '@elastic/eui';
import { Integration } from '../../../../types';
import { SpaceTypes } from '../../../../common/constants';
import { capitalize, startCase } from 'lodash';
import { Search } from '@opensearch-project/oui/src/eui_components/basic_table';
import { ruleSource } from '../../Rules/utils/constants';
import { DEFAULT_EMPTY_DATA, integrationCategories } from '../../../utils/constants';
import { integrationLabels } from './constants';

const allowedActionsBySpace = {
  [SpaceTypes.DRAFT.value]: ['create', 'edit', 'delete', 'promote'],
  [SpaceTypes.TESTING.value]: ['promote'],
  [SpaceTypes.CUSTOM.value]: [],
  [SpaceTypes.STANDARD.value]: ['create', 'edit', 'delete', 'promote'], // TOOD: remove these actions, they are added to tset due there are no in other spaces.
}

export const getIntegrationsTableColumns = (
  {
    showDetails,
    setItemForAction
  }: {
    showDetails: (id: string) => void,
    setItemForAction: ({item: any, action: 'edit' | 'delete' | 'promote'}),
  }
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
        name: 'Edit',
        description: 'Edit integration',
        type: 'icon',
        icon: 'pencil',
        available: (item) => allowedActionsBySpace?.[item.space]?.includes('edit'),
        onClick: (item) => {
          setItemForAction({item, action: 'edit'});
        }
      },
      {
        name: 'Promote',
        description: 'Promote integration',
        type: 'icon',
        icon: 'share',
        available: (item) => allowedActionsBySpace?.[item.space]?.includes('promote'),
        onClick: (item) => {
          setItemForAction({item, action: 'promote'});
        }
      },
      {
        name: 'Remove',
        description: 'Remove integration',
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        available: (item) => allowedActionsBySpace?.[item.space]?.includes('delete'),
        onClick: (item) => {
          setItemForAction({item, action: 'delete'});
        }
      }
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

export const withGuardAsync =
  (
    condition: (props: any) => Promise<{ ok: boolean; data: any }>,
    ComponentFulfillsCondition: React.FC,
    ComponentLoadingResolution: null | React.FC = null,
  ) =>
  (WrappedComponent: React.FC) =>
  (props: any) => {
    const [loading, setLoading] = useState(true);
    const [fulfillsCondition, setFulfillsCondition] = useState({
      ok: false,
      data: {},
    });

    const execCondition = async () => {
      try {
        setLoading(true);
        setFulfillsCondition({ ok: false, data: {} });
        setFulfillsCondition(
          await condition({ ...props, check: execCondition }),
        );
      } catch (error) {
        setFulfillsCondition({ ok: false, data: { error } });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      execCondition();
    }, []);

    if (loading) {
      return ComponentLoadingResolution ? (
        <ComponentLoadingResolution {...props} />
      ) : null;
    }

    return fulfillsCondition.ok ? (
      <ComponentFulfillsCondition
        {...props}
        {...(fulfillsCondition?.data ?? {})}
        check={execCondition}
      />
    ) : (
      <WrappedComponent
        {...props}
        {...(fulfillsCondition?.data ?? {})}
        check={execCondition}
      />
    );
  };

export const withWrapComponent =
  (WrapComponent, mapWrapComponentProps = () => {}) =>
  WrappedComponent =>
  props =>
    (
      <WrapComponent
        {...props}
        {...(mapWrapComponentProps ? mapWrapComponentProps(props) : {})}
      >
        <WrappedComponent {...props}></WrappedComponent>
      </WrapComponent>
    );

export const withModal = options =>
  withWrapComponent(
    ({
      paddingSize,
      hasShadow,
      hasBorder,
      borderRadius,
      grow,
      panelRef,
      color,
      className,
      'aria-label': ariaLabel,
      'data-test-subj': dataTestSubject,
      children,
    }) => {
      const panelProps = {
        paddingSize,
        hasShadow,
        hasBorder,
        borderRadius,
        grow,
        panelRef,
        color,
        className,
        'aria-label': ariaLabel,
        'data-test-subj': dataTestSubject,
        children,
      };
      return <EuiPanel {...panelProps}>{children}</EuiPanel>;
    },
    () => options,
  );
