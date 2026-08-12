/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiLink,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { RedirectAppLinks } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import {
  DECODERS_NAV_ID,
  DETECTION_RULE_NAV_ID,
  DETECTORS_NAV_ID,
  INTEGRATIONS_NAV_ID,
  KVDBS_NAV_ID,
  ROUTES,
} from '../../utils/constants';
import { buildAppUrl, buildEntityQueryRoute } from '../../utils/routes';
import { getApplication } from '../../services/utils/constants';
import { DataStore } from '../../store/DataStore';

export type IntegrationEntity = 'decoders' | 'rules' | 'kvdbs' | 'detectors';

export interface IntegrationCellProps {
  /** Integration name for this row. Renders as plain text (no popover) when empty. */
  name: string;
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
  detectors: 'detectors',
};

// Wazuh: clickable Integration column cell. Opens a popover with a jump-to-entity
// menu (Decoders/Rules/KVDBs) scoped to this integration's name, reusing the
// existing space-scoped search-by-name behavior via buildEntityQueryRoute.
export const IntegrationCell: React.FC<IntegrationCellProps> = ({
  name,
  integrationId,
  space,
  currentEntity,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [relatedCounts, setRelatedCounts] = useState<Record<IntegrationEntity, number> | undefined>(
    undefined
  );

  useEffect(() => {
    if (!isOpen || !integrationId || !space || relatedCounts) return;
    let cancelled = false;
    Promise.all([
      DataStore.integrations.getIntegration(integrationId, space),
      DataStore.detectors.countByIntegration(name, space),
    ]).then(([integration, detectorsCount]) => {
      if (cancelled) return;
      setRelatedCounts({
        decoders: integration?.document.decoders?.length ?? 0,
        rules: integration?.document.rules?.length ?? 0,
        kvdbs: integration?.document.kvdbs?.length ?? 0,
        detectors: detectorsCount,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, integrationId, space, name, relatedCounts]);

  if (!name) {
    return <>{name}</>;
  }

  const closePopover = () => setIsOpen(false);

  const isChecking = Boolean(integrationId && space && !relatedCounts);

  const NAV_ID_BY_ENTITY: Record<IntegrationEntity, string> = {
    decoders: DECODERS_NAV_ID,
    rules: DETECTION_RULE_NAV_ID,
    kvdbs: KVDBS_NAV_ID,
    detectors: DETECTORS_NAV_ID,
  };

  const ROUTE_BY_ENTITY: Record<IntegrationEntity, string> = {
    decoders: ROUTES.DECODERS,
    rules: ROUTES.RULES,
    kvdbs: ROUTES.KVDBS,
    detectors: ROUTES.DETECTORS,
  };

  const buildMenuItem = (key: IntegrationEntity, route: string) => {
    const count = relatedCounts?.[key];
    const label = `Go to integration ${ENTITY_LABELS[key]}${
      count === undefined ? '' : ` (${count})`
    }`;
    const hasRelatedItems = isChecking ? false : count === undefined ? true : count > 0;
    const item = (
      <EuiContextMenuItem
        key={key}
        disabled={!hasRelatedItems}
        href={buildAppUrl(NAV_ID_BY_ENTITY[key], buildEntityQueryRoute(route, name, space))}
        onClick={closePopover}
      >
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
        href={buildAppUrl(
          INTEGRATIONS_NAV_ID,
          `${ROUTES.INTEGRATIONS}/${integrationId}?space=${space}`
        )}
        onClick={closePopover}
      >
        Go to integration details
      </EuiContextMenuItem>
    ) : null;

  const items = [
    ...(detailsItem ? [detailsItem] : []),
    ...(['decoders', 'rules', 'kvdbs', 'detectors'] as const)
      .filter((key) => key !== currentEntity)
      .map((key) => buildMenuItem(key, ROUTE_BY_ENTITY[key])),
  ];

  return (
    <RedirectAppLinks application={getApplication()}>
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
    </RedirectAppLinks>
  );
};
