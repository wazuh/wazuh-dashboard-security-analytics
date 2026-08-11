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
}

const ENTITY_LABELS: Record<'decoders' | 'rules' | 'kvdbs', string> = {
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
}) => {
  const routerHistory = useHistory();
  const history = historyOverride ?? routerHistory;
  const [isOpen, setIsOpen] = useState(false);
  const [relatedFlags, setRelatedFlags] = useState<
    { decoders: boolean; rules: boolean; kvdbs: boolean } | undefined
  >(undefined);

  useEffect(() => {
    if (!isOpen || !integrationId || !space || relatedFlags) return;
    let cancelled = false;
    DataStore.integrations.getIntegration(integrationId, space).then((integration) => {
      if (cancelled) return;
      setRelatedFlags({
        decoders: !!integration?.document.decoders?.length,
        rules: !!integration?.document.rules?.length,
        kvdbs: !!integration?.document.kvdbs?.length,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, integrationId, space, relatedFlags]);

  if (!name) {
    return <>{name}</>;
  }

  const closePopover = () => setIsOpen(false);

  const navigateTo = (route: string) => {
    closePopover();
    history.push(buildEntityQueryRoute(route, name));
  };

  const buildMenuItem = (key: 'decoders' | 'rules' | 'kvdbs', route: string) => {
    const label = `Go to integration ${ENTITY_LABELS[key]}`;
    const hasRelatedItems = relatedFlags?.[key] ?? true;
    const item = (
      <EuiContextMenuItem key={key} disabled={!hasRelatedItems} onClick={() => navigateTo(route)}>
        {label}
      </EuiContextMenuItem>
    );
    if (hasRelatedItems) return item;
    return (
      <EuiToolTip key={key} position="right" content={`${name} has no ${ENTITY_LABELS[key]}`}>
        {item}
      </EuiToolTip>
    );
  };

  const items = [
    buildMenuItem('decoders', ROUTES.DECODERS),
    buildMenuItem('rules', ROUTES.RULES),
    buildMenuItem('kvdbs', ROUTES.KVDBS),
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
      <EuiContextMenuPanel key={relatedFlags ? 'loaded' : 'loading'} items={items} size="s" />
    </EuiPopover>
  );
};

export default IntegrationCell;
