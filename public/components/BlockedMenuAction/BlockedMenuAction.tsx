/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useEffect, useRef } from 'react';
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
// The enclosing menu item is created by the table and cannot be configured, so on mount the
// content marks it `aria-disabled` for assistive technology and shows the tooltip while the
// item has keyboard focus (the tooltip alone only reacts to the pointer).
export const BlockedMenuAction = ({ iconType, label, reason }: BlockedMenuActionProps) => {
  const tooltipRef = useRef<EuiToolTip>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menuItem = contentRef.current?.closest('button');
    if (!menuItem) {
      return;
    }
    const showTooltip = () => tooltipRef.current?.showToolTip();
    const hideTooltip = () => tooltipRef.current?.hideToolTip();
    menuItem.setAttribute('aria-disabled', 'true');
    menuItem.addEventListener('focus', showTooltip);
    menuItem.addEventListener('blur', hideTooltip);
    return () => {
      menuItem.removeAttribute('aria-disabled');
      menuItem.removeEventListener('focus', showTooltip);
      menuItem.removeEventListener('blur', hideTooltip);
    };
  }, []);

  return (
    <EuiToolTip ref={tooltipRef} content={reason} display="block" position="left">
      <div ref={contentRef} style={{ cursor: 'not-allowed' }}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span className="euiTextColor euiTextColor--subdued">{label}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiToolTip>
  );
};
