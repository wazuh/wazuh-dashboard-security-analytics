/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiLink,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { ROUTES } from '../../utils/constants';
import { buildEntityQueryRoute } from '../../utils/routes';
import { DataStore } from '../../store/DataStore';

export type IntegrationEntity = 'decoders' | 'rules' | 'kvdbs';

export interface IntegrationCellProps {
  /** Integration name for this row. Renders as plain text (no popover) when empty. */
  name: string;
  /**
   * Optional history override (the same `history` prop every container in this
   * codebase already receives via RouteComponentProps). Falls back to
   * `useHistory()` when omitted. See useUrlFilterParams.ts for why: react-router's
   * hooks are implemented via `React.useContext`, which `test/setup.jest.ts`
   * globally mocks for the unrelated SecurityAnalyticsContext pattern — plain
   * prop-drilling bypasses that mock and is unaffected.
   */
  history?: Pick<ReturnType<typeof useHistory>, 'push'>;
  /**
   * This row's integration id and space — when both are given, disables (with an
   * explanatory tooltip) any "Go to integration X" CTA whose entity type this
   * integration has none of, instead of landing on a table that filters down to
   * zero results. Omit either to skip the check and leave every CTA enabled.
   */
  integrationId?: string;
  space?: string;
  /**
   * Entity this cell is being rendered on top of (e.g. "rules" on the Rules
   * page). When given, the matching "Go to integration X" menu item is omitted —
   * jumping to the page you're already on is never useful. Optional so pages
   * with no single host entity (e.g. Detectors) keep rendering all three items.
   */
  currentEntity?: IntegrationEntity;
}

const ENTITY_LABELS: Record<IntegrationEntity, string> = {
  decoders: 'decoders',
  rules: 'rules',
  kvdbs: 'KVDBs',
};

// Wazuh: clickable Integration column cell. Opens a popover with a jump-to-entity
// menu (Decoders/Rules/KVDBs) scoped to this integration's name, reusing the
// existing space-scoped search-by-name behavior via buildEntityQueryRoute.
export const IntegrationCell: React.FC<IntegrationCellProps> = ({
  name,
  history: historyOverride,
  integrationId,
  space,
  currentEntity,
}) => {
  const routerHistory = useHistory();
  const history = historyOverride ?? routerHistory;
  const [isOpen, setIsOpen] = useState(false);
  const [relatedCounts, setRelatedCounts] = useState<Record<IntegrationEntity, number> | undefined>(
    undefined
  );

  useEffect(() => {
    if (!isOpen || !integrationId || !space || relatedCounts) return;
    let cancelled = false;
    DataStore.integrations.getIntegration(integrationId, space).then((integration) => {
      if (cancelled) return;
      setRelatedCounts({
        decoders: integration?.document.decoders?.length ?? 0,
        rules: integration?.document.rules?.length ?? 0,
        kvdbs: integration?.document.kvdbs?.length ?? 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, integrationId, space, relatedCounts]);

  if (!name) {
    return <>{name}</>;
  }

  const closePopover = () => setIsOpen(false);

  const navigateTo = (route: string) => {
    closePopover();
    history.push(buildEntityQueryRoute(route, name, space));
  };

  // Wazuh: while the check is pending (only when one is actually happening — i.e.
  // integrationId/space were given), every CTA stays disabled rather than
  // optimistically enabled, so a slow connection can't leave a clickable window
  // before the "has no items" result comes back.
  const isChecking = Boolean(integrationId && space && !relatedCounts);

  const ROUTE_BY_ENTITY: Record<IntegrationEntity, string> = {
    decoders: ROUTES.DECODERS,
    rules: ROUTES.RULES,
    kvdbs: ROUTES.KVDBS,
  };

  const buildMenuItem = (key: IntegrationEntity, route: string) => {
    const count = relatedCounts?.[key];
    const label = `Go to integration ${ENTITY_LABELS[key]}${
      count === undefined ? '' : ` (${count})`
    }`;
    const hasRelatedItems = isChecking ? false : count === undefined ? true : count > 0;
    const item = (
      <EuiContextMenuItem key={key} disabled={!hasRelatedItems} onClick={() => navigateTo(route)}>
        {label}
      </EuiContextMenuItem>
    );
    if (hasRelatedItems) return item;
    return (
      <EuiToolTip
        key={key}
        display="block"
        position="right"
        content={isChecking ? 'Checking…' : `${name} has no ${ENTITY_LABELS[key]}`}
      >
        {item}
      </EuiToolTip>
    );
  };

  const detailsItem =
    integrationId && space ? (
      <EuiContextMenuItem
        key="details"
        onClick={() => {
          closePopover();
          history.push(`${ROUTES.INTEGRATIONS}/${integrationId}?space=${space}`);
        }}
      >
        Go to integration details
      </EuiContextMenuItem>
    ) : null;

  const items = [
    ...(detailsItem ? [detailsItem] : []),
    ...(['decoders', 'rules', 'kvdbs'] as const)
      .filter((key) => key !== currentEntity)
      .map((key) => buildMenuItem(key, ROUTE_BY_ENTITY[key])),
  ];

  return (
    <EuiPopover
      id={`integrationCellPopover-${name}`}
      button={
        <EuiLink onClick={() => setIsOpen((prev) => !prev)} data-test-subj="integrationCellLink">
          {name}
        </EuiLink>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel key={relatedCounts ? 'loaded' : 'loading'} items={items} size="s" />
    </EuiPopover>
  );
};
