/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSmallButton, EuiText, EuiLink } from '@elastic/eui';
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
    title="Pending changes ready for promotion"
    type="primary"
    closable={true}
    closeHandler={onDismiss}
    message={
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="pendingPromotionCalloutText">
            <p>
              Your <b>{space}</b> space has changes that haven't been promoted.{' '}
              <EuiLink data-test-subj="pendingPromotionCalloutPromoteButton" onClick={onPromote}>
                Promote
              </EuiLink>{' '}
              them to the <b>{nextSpace}</b> space now?
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  />
);
