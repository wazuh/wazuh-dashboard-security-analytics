/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiCompressedFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { CreateDetectorRulesState, DetectionRules } from '../DetectionRules/DetectionRules';
import { RuleItem } from '../DetectionRules/types/interfaces';
import ConfigureFieldMapping from '../../../ConfigureFieldMapping';
import { ConfigureFieldMappingProps } from '../../../ConfigureFieldMapping/containers/ConfigureFieldMapping';
import { DetectorIntegrationSelector } from '../../../../../../components/DetectorIntegrationSelector';
import { DetectorIntegrationSelection, DetectorIntegrationSpace } from '../../../../../../../types';

interface DetectorTypeProps {
  detectorType: string;
  integrationId?: string;
  integrationSpace: DetectorIntegrationSpace;
  rulesState: CreateDetectorRulesState;
  configureFieldMappingProps: ConfigureFieldMappingProps;
  loadingRules?: boolean;
  onDetectorSelectionChange: (selection: DetectorIntegrationSelection) => void;
  onPageChange: (page: { index: number; size: number }) => void;
  onRuleToggle: (changedItem: RuleItem, isActive: boolean) => void;
  onAllRulesToggle: (enabled: boolean) => void;
}

const DetectorType: React.FC<DetectorTypeProps> = ({
  detectorType,
  integrationId,
  integrationSpace,
  rulesState,
  configureFieldMappingProps,
  loadingRules,
  onDetectorSelectionChange,
  onPageChange,
  onRuleToggle,
  onAllRulesToggle,
}) => {
  return (
    <>
      <EuiText size="s">
        <h3>Rules</h3> {/* Wazuh: rename 'Detection rules' to 'Rules' */}
      </EuiText>
      <EuiText size="s">
        <p>
          The rules are automatically populated based on your selected integration. Threat
          intelligence based detection can be enabled for standard integrations.
        </p>
      </EuiText>
      <EuiSpacer />

      <DetectorIntegrationSelector
        detectorType={detectorType}
        integrationId={integrationId}
        integrationSpace={integrationSpace}
        onSelectionChange={onDetectorSelectionChange}
      />

      <EuiCompressedFormRow fullWidth={true}>
        <DetectionRules
          detectorType={detectorType}
          rulesState={rulesState}
          loading={loadingRules}
          onPageChange={onPageChange}
          onRuleToggle={onRuleToggle}
          onAllRulesToggle={onAllRulesToggle}
        />
      </EuiCompressedFormRow>

      <EuiCompressedFormRow fullWidth={true}>
        <ConfigureFieldMapping {...configureFieldMappingProps} />
      </EuiCompressedFormRow>
    </>
  );
};

export default DetectorType;
