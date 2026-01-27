/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useCallback } from 'react';
import { RulesTable } from '../../Rules/components/RulesTable/RulesTable';
import { RuleTableItem } from '../../Rules/utils/helpers';
import { ContentPanel } from '../../../components/ContentPanel';
import { EuiSmallButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { RuleViewerFlyout } from '../../Rules/components/RuleViewerFlyout/RuleViewerFlyout';

export interface IntegrationDetectionRulesProps {
  rules: RuleTableItem[];
  loadingRules: boolean;
  refreshRules: () => void;
}

export const IntegrationDetectionRules: React.FC<IntegrationDetectionRulesProps> = ({
  rules,
  loadingRules,
  refreshRules,
}) => {
  const [flyoutData, setFlyoutData] = useState<RuleTableItem | undefined>(undefined);
  const hideFlyout = useCallback(() => {
    setFlyoutData(undefined);
  }, []);

  return (
    <>
      {flyoutData && <RuleViewerFlyout hideFlyout={hideFlyout} ruleTableItem={flyoutData} />}
      <ContentPanel
        title="Detection rules"
        hideHeaderBorder={true}
        actions={[<EuiSmallButton onClick={refreshRules}>Refresh</EuiSmallButton>]}
      >
        {rules.length === 0 ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                {/* By Wazuh */}
                <p>There are no detection rules associated with this integration. </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSmallButton
                fill
                href={`opensearch_security_analytics_dashboards#/create-rule`}
                target="_blank"
              >
                Create detection rule&nbsp;
                <EuiIcon type={'popout'} />
              </EuiSmallButton>
              <EuiSpacer size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <RulesTable
            loading={loadingRules}
            ruleItems={rules}
            columnsToHide={['category']}
            showRuleDetails={setFlyoutData}
          />
        )}
      </ContentPanel>
    </>
  );
};
