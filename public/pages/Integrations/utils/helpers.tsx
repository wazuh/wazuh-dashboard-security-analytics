/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useEffect } from 'react';
import { EuiLink, EuiPanel } from '@elastic/eui';
import { History } from 'history';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { Integration } from '../../../../types';
import { SPACE_ACTIONS, UserSpacesOrder } from '../../../../common/constants';
import { startCase } from 'lodash';
import { DEFAULT_EMPTY_DATA, integrationCategories, ROUTES } from '../../../utils/constants';
import { actionIsAllowedOnSpace } from '../../../../common/helpers';
import { PolicyIntegrationTableEntry, PolicyItem } from '../../../../types';
import { getIntegrationCategoryFilterOptions } from '../../../utils/helpers';
import { buildEntityQueryRoute } from '../../../utils/routes';
import { Search } from '@elastic/eui/src/components/basic_table';

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
  category: string;
  mode: string;
  space: string;
  decoders: number;
  kvdbs: number;
  rules: number;
  enabled?: boolean;
  /**
   * String mirror of `enabled` used only by the Status filter, matching the
   * 'status'/'enabled'|'disabled' pattern used by Rules/Decoders/KVDBs —
   * EuiInMemoryTable's `field_value_selection` filter mishandles literal boolean
   * option values (the query round-trips through text, where EUI's grammar
   * doesn't know 'enabled' is boolean-typed absent a declared schema, desyncing
   * the filter's own badge/checkbox state from a real `true`/`false` clause).
   */
  status: 'enabled' | 'disabled';
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
      category: source.document.category,
      mode: source.document.mode ?? '',
      space: source.space.name,
      decoders: source.document.decodersCount,
      kvdbs: source.document.kvdbsCount,
      rules: source.document.rulesCount,
      enabled: source.document.enabled,
      status: source.document.enabled ? 'enabled' : 'disabled',
    }));
};

export const hasRelatedEntity = (
  item: IntegrationTableItem,
  entity: 'rules' | 'decoders' | 'kvdbs'
): boolean => {
  return item[entity] > 0;
};

const ROUTE_BY_ENTITY: Record<'rules' | 'decoders' | 'kvdbs', string> = {
  rules: ROUTES.RULES,
  decoders: ROUTES.DECODERS,
  kvdbs: ROUTES.KVDBS,
};

// Wazuh: shared renderer for the Rules/Decoders/KVDBs count columns — links each
// count to that entity's page pre-filtered by this integration, using the row's
// own space (not the page's active space filter) so promoted/parent-space rows
// still land in the space they actually belong to. Zero counts stay a disabled
// (not clickable, not plain text) EuiLink — there's nothing to jump to.
const renderCount =
  (entity: 'rules' | 'decoders' | 'kvdbs', history: Pick<History, 'push'>) =>
  (value: number, item: IntegrationTableItem) => {
    const n = value ?? 0;
    if (!hasRelatedEntity(item, entity)) {
      return <EuiLink disabled>{n}</EuiLink>;
    }
    return (
      <EuiLink
        onClick={() =>
          history.push(buildEntityQueryRoute(ROUTE_BY_ENTITY[entity], item.title, item.space))
        }
      >
        {n}
      </EuiLink>
    );
  };

export const getIntegrationsTableColumns = ({
  showDetails,
  setItemForAction,
  history,
}: {
  showDetails: (id: string) => void;
  setItemForAction: (options: { item: any; action: typeof SPACE_ACTIONS.DELETE } | null) => void;
  history: Pick<History, 'push'>;
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
    field: 'mode',
    name: 'Mode',
    truncateText: false,
    render: (mode: string) => mode || DEFAULT_EMPTY_DATA,
  },
  {
    field: 'rules',
    name: 'Rules',
    sortable: false,
    render: renderCount('rules', history),
  },
  {
    field: 'decoders',
    name: 'Decoders',
    sortable: false,
    render: renderCount('decoders', history),
  },
  {
    field: 'kvdbs',
    name: 'KVDBs',
    sortable: false,
    render: renderCount('kvdbs', history),
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
      <EnabledHealth enabled={status === 'enabled'} data-test-subj="integration_status" />
    ),
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

export const getIntegrationsTableSearchConfig = (options?: {
  toolsRight?: React.ReactNode[];
}): Search => ({
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
      // Wazuh: EUI's default 'eq' operator matches by substring, not equality —
      // 'exact' avoids one option's value silently matching another's.
      operator: 'exact',
      options: getIntegrationCategoryFilterOptions(false),
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
});

export const withGuardAsync =
  (
    condition: (props: any) => Promise<{ ok: boolean; data: any }>,
    ComponentFulfillsCondition: React.FC,
    ComponentLoadingResolution: null | React.FC = null,
    options: { rerunOn?: (props) => any[] }
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

export const withGuard =
  (condition: (props: any) => boolean, ComponentFulfillsCondition: React.FC) =>
  (WrappedComponent: React.FC) =>
  (props: any) => {
    return condition(props) ? (
      <ComponentFulfillsCondition {...props} />
    ) : (
      <WrappedComponent {...props} />
    );
  };

export const withWrapComponent =
  (WrapComponent, mapWrapComponentProps = () => {}) =>
  (WrappedComponent) =>
  (props) =>
    (
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

export function useAsyncAction<T>(
  action: useAsyncActionRunOnStartAction<T>,
  dependencies: useAsyncActionRunOnStartDependencies = [],
  { refreshDataOnPreRun }: { refreshDataOnPreRun: boolean } = {
    refreshDataOnPreRun: true,
  }
): useAsyncActionRunOnStartDependenciesReturns<T> {
  const [running, setRunning] = useState(false);
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

  return { data, error, run, running };
}
