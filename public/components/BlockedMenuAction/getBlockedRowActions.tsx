/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { AllowedActionsBySpace, SPACE_ACTIONS } from '../../../common/constants';
import { getBlockedSpaceActionReason, isPromotionOnlyAction } from '../../../common/helpers';
import { Space } from '../../../types';
import { BlockedMenuAction } from './BlockedMenuAction';

// Wazuh: where content changes only through promotion (test, custom), Edit and Delete stay in
// the row actions menu like in draft, but disabled with the reason as a tooltip. Custom
// actions, because the default one shows no tooltip when disabled. One definition for every
// list, so the rows, the reasons and the spaces they apply to stay in sync with
// `getBlockedSpaceActionReason`. `entity` is the plural noun of the list, e.g. "rules".
export const getBlockedRowActions = <T,>({
  entity,
  getSpace,
  allowedActionsBySpace = AllowedActionsBySpace,
}: {
  entity: string;
  getSpace: (item: T) => Space;
  allowedActionsBySpace?: typeof AllowedActionsBySpace;
}) =>
  [
    { name: 'Edit', action: SPACE_ACTIONS.EDIT, iconType: 'pencil' },
    { name: 'Delete', action: SPACE_ACTIONS.DELETE, iconType: 'trash' },
  ].map(({ name, action, iconType }) => ({
    name,
    render: (item: T) => (
      <BlockedMenuAction
        iconType={iconType as 'pencil' | 'trash'}
        label={name}
        reason={getBlockedSpaceActionReason(getSpace(item), action, entity, allowedActionsBySpace)}
      />
    ),
    available: (item: T) => isPromotionOnlyAction(getSpace(item), action, allowedActionsBySpace),
  }));
