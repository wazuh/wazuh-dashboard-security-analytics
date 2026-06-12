/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useCallback } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingContent,
  EuiSmallButtonIcon,
  EuiText,
} from '@elastic/eui';
import { RuleItemInfoBase } from '../../../../../types';
import { RuleTableItem } from '../../utils/helpers';
import { RuleContentViewer } from '../RuleContentViewer/RuleContentViewer';
import { DataStore } from '../../../../store/DataStore';
import { useLazyFetch } from '../../../../hooks/useLazyFetch';

export interface RuleViewerFlyoutProps {
  ruleTableItem?: RuleTableItem;
  ruleId?: string;
  space?: string;
  hideFlyout: () => void;
}

export const RuleViewerFlyout: React.FC<RuleViewerFlyoutProps> = ({
  ruleTableItem,
  ruleId,
  space,
  hideFlyout,
}) => {
  // If ruleId and space are provided, it means the flyout was opened from a rule item that doesn't have full rule info, so we need to fetch it.
  const shouldFetchRule = Boolean(ruleId && space);
  const fetchRule = useCallback(() => DataStore.rules.getRule(ruleId!, space!), [ruleId, space]);
  const { data: fetchedRule, loading, error } = useLazyFetch(
    shouldFetchRule ? fetchRule : null,
    'Rule not found.'
  );

  const resolvedRule = shouldFetchRule ? fetchedRule : ruleTableItem?.ruleInfo;
  const title = shouldFetchRule ? fetchedRule?._source?.metadata?.title : ruleTableItem?.title;

  const renderBody = () => {
    if (loading) return <EuiLoadingContent lines={4} />;
    if (error) return <EuiCallOut color="danger" iconType="alert" title={error} />;
    if (!resolvedRule) return null;
    return <RuleContentViewer rule={resolvedRule} />;
  };

  return (
    <EuiFlyout
      onClose={hideFlyout}
      hideCloseButton
      ownFocus={true}
      size="m"
      data-test-subj={`rule_flyout_${title ?? ruleId ?? ''}`}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiText size="s">
              <h2>{title ? `Rule details - ${title}` : 'Rule details'}</h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSmallButtonIcon
              aria-label="close"
              iconType="cross"
              display="empty"
              iconSize="m"
              onClick={hideFlyout}
              data-test-subj="close-rule-details-flyout"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
