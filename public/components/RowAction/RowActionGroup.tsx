/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';

// Wazuh: OUI spaces the actions of a table row by giving every direct child of the actions
// cell but the first a left margin of `$ouiSizeS` (8px). Several icons rendered by ONE
// custom action are a single child, so they need that margin applied by hand to stay evenly
// spaced with the sibling actions (e.g. View).
const ACTION_SPACING = 8;

export const RowActionGroup = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {React.Children.toArray(children).map((child, index) => (
      <div key={index} style={index > 0 ? { marginLeft: ACTION_SPACING } : undefined}>
        {child}
      </div>
    ))}
  </div>
);
