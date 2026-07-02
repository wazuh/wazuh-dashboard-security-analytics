/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSmallButton, EuiText } from '@elastic/eui';
import { CallOut } from '../../Main/components/Callout';

export interface PendingPromotionCalloutProps {
  /** Current space with pending changes (e.g. 'draft'). */
  space: string;
  /** Promotion target space (e.g. 'test'). */
  nextSpace: string;
  onPromote: () => void;
  onDismiss: () => void;
}

/**
 * Wazuh: dismissible callout shown when the current space has pending content changes not
 * yet promoted to the next space; offers a direct "Promote changes" action.
 */
export const PendingPromotionCallout: React.FC<PendingPromotionCalloutProps> = ({
  space,
  nextSpace,
  onPromote,
  onDismiss,
}) => (
  <CallOut
    title="You have changes pending promotion"
    type="primary"
    closable={true}
    closeHandler={onDismiss}
    message={
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="pendingPromotionCalloutText">
            <p>
              The <b>{space}</b> space has changes that have not been promoted to the{' '}
              <b>{nextSpace}</b> space.
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            fill={true}
            onClick={onPromote}
            data-test-subj="pendingPromotionCalloutPromoteButton"
          >
            Promote changes
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  />
);
