/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';

export interface BlockedMenuActionProps {
  iconType: 'trash' | 'pencil';
  label: string;
  /** Why the action is unavailable; shown as the tooltip. */
  reason?: string;
}

// Wazuh: content of a table row action that is unavailable in the current space, for the
// row "All actions" menu. The default OUI action renders a disabled menu item without a
// tooltip, so the user would never learn why. A custom action is rendered inside an enabled
// menu item instead, so this content looks disabled and carries the tooltip itself. It has
// no click handler: choosing it only closes the menu.
export const BlockedMenuAction = ({ iconType, label, reason }: BlockedMenuActionProps) => (
  <EuiToolTip content={reason} display="block" position="left">
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      aria-disabled="true"
      style={{ cursor: 'not-allowed' }}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} color="subdued" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <span className="euiTextColor euiTextColor--subdued">{label}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);
