/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useEffect } from 'react';
import { EuiLink, EuiPanel } from '@elastic/eui';
import { Integration } from '../../../../types';
import { SPACE_ACTIONS, UserSpacesOrder } from '../../../../common/constants';
import { startCase } from 'lodash';
import { integrationCategories } from '../../../utils/constants';
import { actionIsAllowedOnSpace } from '../../../../common/helpers';
import { PolicyIntegrationTableEntry, PolicyItem } from '../../../../types';

import moment from 'moment';
import { formatUIDate } from '../../../utils/dateFormat';

/**
 * Integration/policy metadata dates often arrive as ISO strings; format them
 * using the configured `dateFormat`/`dateFormat:tz` advanced settings.
 */
export const formatIntegrationMetadataDate = (value?: string) => {
  if (!value?.trim()) return '';
  const m = moment(value);
  return m.isValid() ? formatUIDate(value) : value;
};

const getIntegrationCategoryFilterDisplayName = (value: string): string => {
  const match = integrationCategories.find((c) => c.value === value);
  return match?.label ?? startCase(value.replace(/-/g, ' '));
};

export interface IntegrationTableItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  space: string;
  decoders: number;
  kvdbs: number;
  rules: number;
}

export const mapPolicyToIntegrationTableItems = (
  policy: PolicyItem | undefined
): IntegrationTableItem[] => {
  if (!policy) return [];

  const map = policy.integrationsMap ?? {};
  const orderedIds: string[] = policy.document?.integrations ?? [];

  return orderedIds
    .map((id) => map[id])
    .filter((source): source is PolicyIntegrationTableEntry => Boolean(source && source._id))
    .map((source) => ({
      id: source._id,
      title: source.document.metadata?.title ?? '',
      description: source.document.metadata?.description,
      category: source.document.category,
      space: source.space.name,
      decoders: source.document.decodersCount,
      kvdbs: source.document.kvdbsCount,
      rules: source.document.rulesCount,
    }));
};

export const hasRelatedEntity = (
  item: IntegrationTableItem,
  entity: 'rules' | 'decoders' | 'kvdbs'
): boolean => {
  return item[entity] > 0;
};

export const getIntegrationsTableColumns = ({
  showDetails,
  setItemForAction,
}: {
  showDetails: (id: string) => void;
  setItemForAction: (options: { item: any; action: typeof SPACE_ACTIONS.DELETE } | null) => void;
}) => [
  {
    field: 'title',
    name: 'Title',
    sortable: false,
    render: (name: string, item: Integration) => {
      return <EuiLink onClick={() => showDetails(item.id)}>{name}</EuiLink>;
    },
  },
  {
    field: 'category',
    name: 'Category',
    truncateText: false,
    render: (category: string) => getIntegrationCategoryFilterDisplayName(category ?? ''),
  },
  {
    field: 'rules',
    name: 'Rules',
    sortable: false,
    render: (rules: number) => rules ?? 0,
  },
  {
    field: 'decoders',
    name: 'Decoders',
    sortable: false,
    render: (decoders: number) => decoders ?? 0,
  },
  {
    field: 'kvdbs',
    name: 'KVDBs',
    sortable: false,
    render: (kvdbs: number) => kvdbs ?? 0,
  },
  {
    name: 'Actions',
    actions: [
      {
        name: 'Details',
        description: 'Show details',
        type: 'icon',
        icon: 'inspect',
        onClick: (item) => {
          showDetails(item.id);
        },
      },
      {
        name: 'Remove',
        description: 'Remove integration',
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        available: (item) => actionIsAllowedOnSpace(item.space, SPACE_ACTIONS.DELETE),
        onClick: (item) => {
          setItemForAction({ item, action: SPACE_ACTIONS.DELETE });
        },
      },
    ],
  },
];


export const withGuardAsync = (
  condition: (props: any) => Promise<{ ok: boolean; data: any }>,
  ComponentFulfillsCondition: React.FC,
  ComponentLoadingResolution: null | React.FC = null,
  options: { rerunOn?: (props) => any[] }
) => (WrappedComponent: React.FC) => (props: any) => {
  const [loading, setLoading] = useState(true);
  const [fulfillsCondition, setFulfillsCondition] = useState({
    ok: false,
    data: {},
  });

  const execCondition = async () => {
    try {
      setLoading(true);
      setFulfillsCondition({ ok: false, data: {} });
      setFulfillsCondition(await condition({ ...props, check: execCondition }));
    } catch (error) {
      setFulfillsCondition({ ok: false, data: { error } });
    } finally {
      setLoading(false);
    }
  };

  const dependenciesRun = options?.rerunOn ? options.rerunOn(props) : [];

  useEffect(() => {
    execCondition();
  }, dependenciesRun);

  if (loading) {
    return ComponentLoadingResolution ? <ComponentLoadingResolution {...props} /> : null;
  }

  return fulfillsCondition.ok ? (
    <ComponentFulfillsCondition
      {...props}
      {...(fulfillsCondition?.data ?? {})}
      check={execCondition}
    />
  ) : (
    <WrappedComponent {...props} {...(fulfillsCondition?.data ?? {})} check={execCondition} />
  );
};

export const withGuard = (
  condition: (props: any) => boolean,
  ComponentFulfillsCondition: React.FC
) => (WrappedComponent: React.FC) => (props: any) => {
  return condition(props) ? (
    <ComponentFulfillsCondition {...props} />
  ) : (
    <WrappedComponent {...props} />
  );
};

export const withWrapComponent = (WrapComponent, mapWrapComponentProps = () => {}) => (
  WrappedComponent
) => (props) => (
  <WrapComponent {...props} {...(mapWrapComponentProps ? mapWrapComponentProps(props) : {})}>
    <WrappedComponent {...props}></WrappedComponent>
  </WrapComponent>
);

export const withModal = (options) =>
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
    () => options
  );

export const getNextSpace = (space: string) => {
  const currentIndex = UserSpacesOrder.indexOf(space);
  if (currentIndex === -1 || currentIndex === UserSpacesOrder.length - 1) {
    return null; // No next space available
  }
  return UserSpacesOrder[currentIndex + 1];
};

type useAsyncActionRunOnStartDependenciesReturns<T> = {
  data: T | null;
  error: Error | null;
  running: boolean;
  run: () => Promise<void>;
};
type useAsyncActionRunOnStartAction<T> = (
  dependencies: any[],
  state: {
    data: useAsyncActionRunOnStartDependenciesReturns<T>['data'];
    error: useAsyncActionRunOnStartDependenciesReturns<T>['error'];
    running: useAsyncActionRunOnStartDependenciesReturns<T>['running'];
  }
) => Promise<T>;
type useAsyncActionRunOnStartDependencies = any[];

export function useAsyncActionRunOnStart<T>(
  action: useAsyncActionRunOnStartAction<T>,
  dependencies: useAsyncActionRunOnStartDependencies = [],
  { refreshDataOnPreRun }: { refreshDataOnPreRun: boolean } = {
    refreshDataOnPreRun: true,
  }
): useAsyncActionRunOnStartDependenciesReturns<T> {
  const [running, setRunning] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const run = async () => {
    try {
      setRunning(true);
      setError(null);
      if (refreshDataOnPreRun) {
        setData(null);
      }
      const result = await action(dependencies, { data, error, running });
      setData(result);
    } catch (error) {
      setError(error as Error);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    run();
  }, [...dependencies]);

  return { data, error, run, running };
}
