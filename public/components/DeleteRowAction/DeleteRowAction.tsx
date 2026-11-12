/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

export interface DeleteRowActionProps {
  /** Accessible name of the button. */
  name: string;
  /** Tooltip of the enabled action, e.g. "Delete rule". */
  description: string;
  /**
   * Why the action is unavailable. When set, the button is disabled and this text is the
   * tooltip, so the user learns the way out instead of only finding the control missing.
   */
  disabledReason?: string;
  onClick: () => void;
  color?: 'primary' | 'danger';
}

// Wazuh: the default OUI table icon action drops its tooltip when disabled and only takes a
// string description, so a disabled row Delete needs this custom action to explain itself.
export const DeleteRowAction = ({
  name,
  description,
  disabledReason,
  onClick,
  color = 'primary',
}: DeleteRowActionProps) => {
  const isDisabled = disabledReason !== undefined;
  return (
    <EuiToolTip content={isDisabled ? disabledReason : description} delay="long">
      <EuiButtonIcon
        aria-label={name}
        iconType="trash"
        color={color}
        isDisabled={isDisabled}
        onClick={onClick}
      />
    </EuiToolTip>
  );
};
