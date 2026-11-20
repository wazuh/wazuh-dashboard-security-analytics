/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { EnabledHealth } from '../../../components/Utility/EnabledHealth';
import { SPACE_ACTIONS, SpaceTypes } from '../../../../common/constants';
import { actionIsAllowedOnSpace } from '../../../../common/helpers';
import { Space } from '../../../../types';
import { IntegrationMode } from '../utils/constants';

export const DISABLED_INTEGRATION_MEANING =
  'While an integration is disabled, its decoders and rules are not applied to incoming events.';

/**
 * Wazuh: explains a disabled integration, and how to enable it from where the user is.
 * Test and custom only receive content by promotion, so they point back at draft.
 */
export const getDisabledIntegrationExplanation = (space: Space, mode?: string): string => {
  if (mode === IntegrationMode.Protected) {
    return `${DISABLED_INTEGRATION_MEANING} This integration is protected, so it cannot be enabled from the dashboard.`;
  }
  if (actionIsAllowedOnSpace(space, SPACE_ACTIONS.DISABLE_INTEGRATIONS)) {
    return `${DISABLED_INTEGRATION_MEANING} To enable it, select Enable in the integration's Actions menu.`;
  }
  return `${DISABLED_INTEGRATION_MEANING} Enable it in the ${SpaceTypes.DRAFT.label.toLowerCase()} space and promote it.`;
};

interface IntegrationStatusProps {
  enabled: boolean | undefined;
  /** The space the integration belongs to, which decides how it can be enabled. */
  space: Space | string;
  mode?: string;
  'data-test-subj'?: string;
}

export const IntegrationStatus: React.FC<IntegrationStatusProps> = ({
  enabled,
  space,
  mode,
  'data-test-subj': testSubj,
}) => {
  if (enabled !== false) {
    return <EnabledHealth enabled={enabled} data-test-subj={testSubj} />;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EnabledHealth enabled={false} data-test-subj={testSubj} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="questionInCircle"
          color="subdued"
          aria-label="What disabled means"
          content={getDisabledIntegrationExplanation(space as Space, mode)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
