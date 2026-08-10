/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiLink, EuiPopover } from '@elastic/eui';
import { ROUTES } from '../../utils/constants';
import { buildEntityQueryRoute } from '../../utils/routes';

export interface IntegrationCellProps {
  /** Integration name for this row. Renders as plain text (no popover) when empty. */
  name: string;
}

// Wazuh: clickable Integration column cell. Opens a popover with a jump-to-entity
// menu (Decoders/Rules/KVDBs) scoped to this integration's name, reusing the
// existing space-scoped search-by-name behavior via buildEntityQueryRoute.
export const IntegrationCell: React.FC<IntegrationCellProps> = ({ name }) => {
  const history = useHistory();
  const [isOpen, setIsOpen] = useState(false);

  if (!name) {
    return <>{name}</>;
  }

  const closePopover = () => setIsOpen(false);

  const navigateTo = (route: string) => {
    closePopover();
    history.push(buildEntityQueryRoute(route, name));
  };

  const items = [
    <EuiContextMenuItem key="decoders" onClick={() => navigateTo(ROUTES.DECODERS)}>
      Go to integration decoders
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="rules" onClick={() => navigateTo(ROUTES.RULES)}>
      Go to integration rules
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="kvdbs" onClick={() => navigateTo(ROUTES.KVDBS)}>
      Go to integration KVDBs
    </EuiContextMenuItem>,
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
      <EuiContextMenuPanel items={items} size="s" />
    </EuiPopover>
  );
};

export default IntegrationCell;
